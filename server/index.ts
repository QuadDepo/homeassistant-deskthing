// Doing this is required in order for the server to link with DeskThing
import { DeskThing as DK, SettingsString } from "deskthing-server";
import { homeAssistant } from "./ha-connection";
const DeskThing = DK.getInstance();
export { DeskThing };

const start = async () => {
	let Data = await DeskThing.getData();

	if (!Data?.settings?.url || !Data?.settings?.token) {
		setupSettings();
	} else {
		try {
			await homeAssistant.connect({
				url: Data.settings.url.value as string,
				token: Data.settings.token.value as string,
			});
		} catch (err) {
			DeskThing.sendLog(`Failed to connect: ${err}`);
		}
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

const stop = async () => {
	homeAssistant.disconnect();
};

// Main Entrypoint of the server
DeskThing.on("start", start);

// Main exit point of the server
DeskThing.on("stop", stop);
