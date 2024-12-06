// Doing this is required in order for the server to link with DeskThing
import {
	DataInterface,
	DeskThing as DK,
	SettingsMultiSelect,
	SettingsString,
} from "deskthing-server";
import { createActor } from "xstate";
import { haStateMachine } from "./homeAssistantMachine";
const DeskThing = DK.getInstance();
export { DeskThing };

const getSettings = (data: DataInterface | null) => {
	const url = (data?.settings?.url as SettingsString)?.value || "";
	const token = (data?.settings?.token as SettingsString)?.value || "";
	const entities =
		(data?.settings?.entities as SettingsMultiSelect)?.value || [];

	return {
		url,
		token,
		entities,
	};
};

const start = async () => {
	let Data = await DeskThing.getData();

	DeskThing.sendLog("[HA] Starting HomeAssistant");

	const { url, token, entities } = getSettings(Data);

	const homeassistantActor = createActor(haStateMachine, {
		input: {
			url,
			token,
			entities,
		},
	}).start();

	DeskThing.on("data", (newData) => {
		Data = newData;
		if (Data) {
			const { url, token, entities } = getSettings(Data);
			homeassistantActor.send({
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
