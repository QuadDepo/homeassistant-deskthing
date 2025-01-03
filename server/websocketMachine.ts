import {
	callService,
	Connection,
	createConnection,
	createLongLivedTokenAuth,
	HassEntities,
} from "home-assistant-js-websocket";
import { assign, EventObject, fromCallback, fromPromise, setup } from "xstate";
import { subscribeEntities } from "./utils/subscribeEntities";
import { DeskThing } from ".";

//  NodeJS doesn't include a WebSocket client by default. We use the 'ws' package
//  from NPM and polyfill it into the global namespace for compatibility.
const wnd = globalThis;
wnd.WebSocket = require("ws");

const getAuth = fromPromise<
	Connection,
	{
		url: string;
		token: string;
	}
>(async ({ input: { url, token } }) => {
	const auth = createLongLivedTokenAuth(url, token);
	const connection = await createConnection({ auth });

	return connection;
});

const websocket = fromCallback<
	EventObject,
	{
		connection: Connection;
		entities: string[];
	}
>(({ input: { connection, entities }, sendBack }) => {
	const unsubscribeEntities = subscribeEntities(
		connection,
		(ent) => {
			sendBack({
				type: "ENTITIES_UPDATED",
				entities: ent,
			});
		},
		entities
	);

	return () => {
		unsubscribeEntities();
	};
});

const websocketMachine = setup({
	types: {
		context: {} as {
			url: string;
			token: string;
			entities: string[];
			connection: Connection | null;
		},
		input: {} as {
			url: string;
			token: string;
			entities: string[];
		},
		events: {} as
			| {
					type: "UPDATE_SETTINGS";
					entities: string[];
			  }
			| {
					type: "CLIENT_CONNECTED";
			  }
			| {
					type: "ENTITY_ACTION";
					action: string;
					entity_id: string;
			  }
			| {
					type: "ENTITIES_UPDATED";
					entities: HassEntities[];
			  },
	},
	actors: {
		getAuth,
		websocket,
	},
}).createMachine({
	id: "websocket",
	context: ({ input: { url, token, entities } }) => ({
		url: url,
		token: token,
		entities: entities,
		connection: null,
	}),
	initial: "connecting",
	states: {
		connecting: {
			invoke: {
				input: ({ context }) => ({
					...context,
				}),
				src: "getAuth",
				onDone: {
					actions: [
						assign(({ context, event: { output } }) => ({
							...context,
							connection: output,
						})),
						() => {
							DeskThing.sendLog("[HA] Connected");
						},
					],
					target: "connected",
				},
				onError: {
					actions: [
						({ event }) => {
							DeskThing.sendLog("[HA] Error connecting to WebSocket");
							DeskThing.sendLog(`${event.error}`);
						},
					],
				},
			},
		},
		connected: {
			entry: () => DeskThing.sendLog("[HA] Subscribing to entities"),
			invoke: {
				input: ({ context: { connection, entities } }) => ({
					// Why??
					connection: connection as Connection,
					entities,
				}),
				src: "websocket",
			},
			on: {
				ENTITIES_UPDATED: {
					actions: ({ event }) => {
						DeskThing.sendDataToClient({
							type: "homeassistant_data",
							payload: event.entities,
						});
					},
				},
				ENTITY_ACTION: {
					actions: ({ context, event }) => {
						if (!context.connection) {
							return;
						}

						const [domain, service] = event.action.split("/");

						callService(context.connection, domain, service, {
							entity_id: event.entity_id,
						});
					},
				},
				CLIENT_CONNECTED: {
					target: "connected",
					reenter: true,
				},
			},
		},
	},
});

export default websocketMachine;
