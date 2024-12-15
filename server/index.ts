import { DeskThing as DK } from "deskthing-server";
import { createActor } from "xstate";
import { systemMachine } from "./systemMachine";
import { normalizeSettings } from "./utils/normalizeSettings";
const DeskThing = DK.getInstance();
export { DeskThing };

const start = async () => {
	let Data = await DeskThing.getData();

	DeskThing.sendLog("[HA] Starting HomeAssistant");

	const { url, token, entities } = normalizeSettings(Data?.settings);

	createActor(systemMachine, {
		input: {
			url,
			token,
			entities,
		},
	}).start();
};

const stop = async () => {
	// Do nothing yet...
};

// Main Entrypoint of the server
DeskThing.on("start", start);

// Main exit point of the server
DeskThing.on("stop", stop);
