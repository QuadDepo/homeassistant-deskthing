import { type Connection, type HassEntity } from "home-assistant-js-websocket";
import { SettingsMultiSelect } from "deskthing-server";
import { assign, fromPromise, setup } from "xstate";
import { fetchAllEntities } from "./utils/fetchAllEntities";
import { DeskThing } from ".";
import websocketMachine from "./websocketMachine";

const getAllEntities = fromPromise<
	HassEntity[],
	{
		url: string;
		token: string;
	}
>(({ input: { url, token } }) => {
	return fetchAllEntities(url, token);
});

const createEntitySetting = (
	entities: HassEntity[],
	currentEntities: string[]
) => {
	const setting: SettingsMultiSelect = {
		label: "Select your entities",
		description: "NOTE: some might not be supported YET",
		type: "multiselect",
		value: currentEntities,
		options: entities
			.map((entity) => entity.entity_id)
			// NOTE: Temporary only return light entities
			.filter((name) => name.startsWith("light."))
			.map((name) => ({
				value: name,
				label: name,
			})),
	};

	DeskThing.addSettings({
		entities: setting,
	});
};

export const haStateMachine = setup({
	types: {
		context: {} as {
			url: string;
			token: string;
			connection: Connection | null;
			error: Error | null;
			entities: string[];
		},
		events: {} as {
			type: "UPDATE_SETTINGS";
			url: string;
			token: string;
			entities?: string[];
		},
		input: {} as {
			token?: string;
			url?: string;
			entities?: string[];
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
	id: "homeAssistant",
	context: ({ input: { url, token, entities } }) => ({
		url: url || "",
		token: token || "",
		entities: entities || [],
		connection: null,
		error: null,
	}),
	initial: "idle",
	entry: () => {
		DeskThing.sendLog("[HA] Starting machine...");
	},
	states: {
		idle: {
			always: [
				{
					guard: "hasValidConfig",
					target: "active",
					actions: () => {
						DeskThing.sendLog("[HA] Valid config!");
					},
				},
				{
					actions: () => {
						DeskThing.sendLog("[HA] Waiting on valid config...");
					},
				},
			],
			on: {
				UPDATE_SETTINGS: {
					actions: [
						({ event: { entities } }) => {
							DeskThing.sendLog(
								`[HA] Updating config with ${entities?.toString()}`
							);
						},
						assign(({ context, event: { url, token, entities } }) => ({
							...context,
							url,
							token,
							entities,
						})),
					],
					target: "idle",
					reenter: true,
				},
			},
		},
		active: {
			entry: () => {
				DeskThing.sendLog("[HA] Fetching entities...");
			},
			invoke: {
				id: "getAllEntities",
				src: "getAllEntities",
				input: ({ context: { token, url } }) => ({
					token,
					url,
				}),
				onError: {
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
			initial: "idle",
			states: {
				idle: {
					always: [
						{
							guard: "hasEntities",
							target: "setup",
						},
					],
					on: {
						UPDATE_SETTINGS: {
							actions: assign(({ context, event: { entities } }) => ({
								...context,
								entities,
							})),
							target: "setup",
						},
					},
				},
				setup: {
					entry: () => {
						DeskThing.sendLog("[HA] Setting up WS connecting");
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
							actions: ({ event }) => {
								DeskThing.sendFatal(`[HA] WebSocket Error: ${event.error}`);
							},
						},
					},
				},
			},
		},
	},
});
