import { type Connection, type HassEntity } from "home-assistant-js-websocket";
import { assign, fromPromise, setup } from "xstate";
import { getHomeAssistantStates } from "./utils/getHomeAssistantStates";
import { DeskThing } from ".";
import websocketMachine from "./websocketMachine";
import createEntitySetting from "./utils/createEntitySetting";

const getAllEntities = fromPromise<
	HassEntity[],
	{
		url: string;
		token: string;
	}
>(({ input: { url, token } }) => {
	return getHomeAssistantStates(url, token);
});

function createEvent(type: Events["type"]): EventTypes {
	return { type };
}

type Events =
	| {
			type: "UPDATE_SETTINGS";
			url: string;
			token: string;
			entities?: string[];
	  }
	| {
			type: "WAITING_FOR_SETTINGS";
	  }
	| {
			type: "WAITING_FOR_ENTITIES";
	  }
	| {
			type: "ERROR_FETCHING_ENTITIES";
	  };

type EventTypes = Pick<Events, "type">;

export const systemMachine = setup({
	types: {
		context: {} as {
			url: string;
			token: string;
			connection: Connection | null;
			error: Error | null;
			entities: string[];
		},
		events: {} as Events,
		input: {} as {
			token?: string;
			url?: string;
			entities?: string[];
		},
	},
	actions: {
		forwardEventToClient: (_, params: { payload: Events }) => {
			DeskThing.sendDataToClient({
				type: "homeassistant",
				payload: params.payload,
			});
		},
		sendEventToClient: (_, params: { event: EventTypes }) => {
			DeskThing.sendDataToClient({
				type: "homeassistant",
				payload: params.event,
			});
		},
	},
	guards: {
		hasValidConfig: ({ context }) => Boolean(context.url && context.token),
		hasEntities: ({ context }) => context.entities.length > 0,
	},
	actors: {
		getAllEntities,
		websocket: websocketMachine,
	},
}).createMachine({
	id: "system",
	context: ({ input: { url, token, entities } }) => ({
		url: url || "",
		token: token || "",
		entities: entities || [],
		connection: null,
		error: null,
	}),
	initial: "setup",
	entry: () => {
		DeskThing.sendLog("[HA] Starting machine...");
	},
	on: {
		UPDATE_SETTINGS: {
			target: "setup",
			reenter: true,
		},
	},
	states: {
		setup: {
			initial: "config",
			states: {
				config: {
					always: [
						{
							guard: "hasValidConfig",
							target: "enitites",
							actions: () => {
								DeskThing.sendLog("[HA] Valid config");
							},
						},
						{
							actions: {
								type: "sendEventToClient",
								params: { event: createEvent("WAITING_FOR_SETTINGS") },
							},
						},
					],
				},
				enitites: {
					initial: "idle",
					states: {
						idle: {
							// TODO: check if maybe spawning machine would suit better
							// We always want to fetch entities in case there are new ones?
							invoke: {
								id: "getAllEntities",
								src: "getAllEntities",
								input: ({ context: { token, url } }) => ({
									token,
									url,
								}),
								onError: {
									target: "error",
									actions: () => {
										DeskThing.sendLog("[HA] Fetching entities failed!");
									},
								},
								onDone: {
									actions: [
										({ context, event: { output } }) => {
											createEntitySetting(output, context.entities);
										},
										() => {
											DeskThing.sendLog("[HA] Updating Settings...");
										},
									],
								},
							},
						},
						error: {
							entry: {
								type: "sendEventToClient",
								params: {
									event: createEvent("ERROR_FETCHING_ENTITIES"),
								},
							},
						},
						done: {
							always: [
								{
									guard: "hasEntities",
									target: "#system.active",
								},
								{
									actions: {
										type: "sendEventToClient",
										params: {
											event: createEvent("WAITING_FOR_ENTITIES"),
										},
									},
								},
							],
						},
					},
				},
			},
		},
		active: {
			entry: () => {
				DeskThing.sendLog("[HA] Setting up WS connecting");
			},
			states: {
				idle: {
					invoke: {
						src: "websocket",
						id: "websocket",
						input: ({ context: { url, token, entities } }) => ({
							url,
							token,
							entities,
						}),
						onError: {
							target: "error",
							actions: ({ event }) => {
								DeskThing.sendFatal(`[HA] WebSocket Error: ${event.error}`);
							},
						},
					},
				},
				error: {
					entry: [
						{
							type: "sendEventToClient",
							params: {
								event: createEvent("WAITING_FOR_ENTITIES"),
							},
						},
					],
				},
			},
		},
	},
});
