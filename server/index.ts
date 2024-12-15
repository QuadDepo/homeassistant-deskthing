// Doing this is required in order for the server to link with DeskThing
import {
	AppSettings,
	DeskThing as DK,
	SettingsMultiSelect,
	SettingsString,
	SocketData,
} from "deskthing-server";
import { createActor } from "xstate";
import { systemMachine } from "./systemMachine";
import { getHomeAssistantStates } from "./utils/getHomeAssistantStates";
const DeskThing = DK.getInstance();
export { DeskThing };

const normalizeSettings = (settings?: AppSettings | null) => {
	const url = (settings?.url as SettingsString)?.value || "";
	const token = (settings?.token as SettingsString)?.value || "";
	const entities = (settings?.entities as SettingsMultiSelect)?.value || [];

	return {
		url,
		token,
		entities,
	};
};

const start = async () => {
	let Data = await DeskThing.getData();

	DeskThing.sendLog("[HA] Starting HomeAssistant");

	const { url, token, entities } = normalizeSettings(Data?.settings);

	const systemActor = createActor(systemMachine, {
		input: {
			url,
			token,
			entities,
		},
	}).start();

	// TODO: Check if we can move this logic to the Home Assistant Machine
	DeskThing.on("get", async (socket: SocketData) => {
		switch (socket.request) {
			case "initial_entities":
				const settings = await DeskThing.getSettings();

				const { entities, token, url } = normalizeSettings(settings);

				if (entities) {
					const res = await Promise.all(
						entities.map((id) => {
							return getHomeAssistantStates(url, token, id);
						})
					);

					const result = res.reduce((acc, [item]) => {
						acc[item.entity_id] = item;
						return acc;
					}, {});

					DeskThing.sendDataToClient({
						type: "homeassistant_data",
						payload: result,
					});
				}
				break;
			default:
				DeskThing.sendLog(
					`[HA] Unknown get request from client ${socket.request}`
				);
		}
	});

	DeskThing.on("data", (newData) => {
		Data = newData;
		if (Data) {
			const { url, token, entities } = normalizeSettings(Data.settings);
			systemActor.send({
				type: "UPDATE_SETTINGS",
				url,
				token,
				entities,
			});
		}
	});

	if (!Data?.settings?.url || !Data?.settings?.token) {
		setupSettings();
	}
};

const setupSettings = async () => {
	const url: SettingsString = {
		label: "Your HomeAssistant URL",
		type: "string",
		value: "http://homeassistant.local:8123",
	};

	const token: SettingsString = {
		label: "HomeAssistant Long Lived Access Token",
		type: "string",
		value: "",
	};

	DeskThing.addSettings({
		url,
		token,
	});
};

const stop = async () => {};

// Main Entrypoint of the server
DeskThing.on("start", start);

// Main exit point of the server
DeskThing.on("stop", stop);
