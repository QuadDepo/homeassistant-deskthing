import { type Connection, type HassEntity } from "home-assistant-js-websocket";
import {
	Actor,
	assertEvent,
	assign,
	EventObject,
	forwardTo,
	fromCallback,
	fromPromise,
	setup,
	SnapshotFrom,
} from "xstate";
import { getHomeAssistantStates } from "./utils/getHomeAssistantStates";
import { DeskThing } from ".";
import websocketMachine from "./websocketMachine";
import {
	createBasicSettings,
	createEntitySetting,
} from "./utils/createSettings";
import { SocketData } from "deskthing-server";
import { normalizeSettings } from "./utils/normalizeSettings";

const getAllEntities = fromPromise<
	HassEntity[],
	{
		url: string;
		token: string;
	}
>(({ input: { url, token } }) => {
	return getHomeAssistantStates(url, token);
});

interface ClientEvent extends Omit<SocketData, "payload"> {
	payload: Events;
}

const onDeskThingEvents = fromCallback<EventObject>(({ sendBack }) => {
	DeskThing.on("data", ({ settings }) => {
		const { url, token, entities } = normalizeSettings(settings);
		sendBack({
			type: "UPDATE_SETTINGS",
			url,
			token,
			entities,
		});
	});
});

const onClientEvents = fromCallback<EventObject>(({ sendBack }) => {
	DeskThing.on("get", async (socket: ClientEvent) => {
		sendBack({
			...socket.payload,
		});
	});
});

type Events =
	| {
			type: "UPDATE_SETTINGS";
			url: string;
			token: string;
			entities?: string[];
	  }
	| {
			type: "CLIENT_CONNECTED";
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
		createBasicSettings,
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
		assignSettings: assign(({ context, event }) => {
			assertEvent(event, "UPDATE_SETTINGS");
			return {
				...context,
				token: event.token,
				url: event.url,
				entities: event.entities,
			};
		}),
	},
	guards: {
		hasValidConfig: ({ context }) => Boolean(context.url && context.token),
		hasEntities: ({ context }) => context.entities.length > 0,
		hasTokenOrUrlChanged: ({ context, event }) => {
			assertEvent(event, "UPDATE_SETTINGS");
			return !(context.url === event.url && context.token === event.token);
		},
	},
	actors: {
		onDeskThingEvents,
		onClientEvents,
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
	entry: [
		"createBasicSettings",
		() => {
			DeskThing.sendLog("[HA] Starting machine...");
		},
	],
	invoke: [
		{
			id: "onDeskThingEvents",
			src: "onDeskThingEvents",
		},
		{
			id: "onClientEvents",
			src: "onClientEvents",
		},
	],
	initial: "initialize",
	states: {
		initialize: {
			on: {
				UPDATE_SETTINGS: {
					target: "initialize",
					actions: "assignSettings",
					reenter: true,
				},
			},
			initial: "config",
			states: {
				config: {
					always: [
						{
							guard: "hasValidConfig",
							target: "enitites",
							actions: [
								() => {
									DeskThing.sendLog("[HA] Valid config");
								},
							],
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
									target: "done",
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
							// TODO: handle error
						},
						done: {
							always: [
								{
									guard: "hasEntities",
									target: "#system.active",
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
			initial: "idle",
			states: {
				idle: {
					on: {
						CLIENT_CONNECTED: {
							actions: forwardTo("websocket"),
						},
						UPDATE_SETTINGS: [
							{
								guard: "hasTokenOrUrlChanged",
								target: "#system.initialize",
								actions: "assignSettings",
								reenter: true,
							},
							{
								guard: "hasValidConfig",
								target: "#system.active",
								actions: "assignSettings",
								reenter: true,
							},
						],
					},
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
					// TODO: Handle error
				},
			},
		},
	},
});

export type SystemMachine = typeof systemMachine;
export type SystemMachineRef = Actor<SystemMachine>;
export type SystemMachineSnaphot = SnapshotFrom<SystemMachineRef>;
