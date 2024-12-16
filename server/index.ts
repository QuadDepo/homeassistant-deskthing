import { DeskThing as DK } from "deskthing-server";
import { createActor } from "xstate";
import { systemMachine, SystemMachineSnaphot } from "./systemMachine";
import { normalizeSettings } from "./utils/normalizeSettings";
const DeskThing = DK.getInstance();
export { DeskThing };

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

	const normalizeSystemStateValue = (state: SystemMachineSnaphot) => {
		if (state.matches("active")) {
			return "ready";
		}

		if (
			state.matches({
				initialize: "config",
			})
		) {
			return "config";
		}

		if (
			state.matches({
				initialize: "enitites",
			})
		) {
			return "entities";
		}
	};

	systemActor.subscribe((state) => {
		DeskThing.sendDataToClient({
			type: "SERVER_STATUS",
			payload: normalizeSystemStateValue(state),
		});
	});
};

const stop = async () => {
	// Do nothing yet...
};

// Main Entrypoint of the server
DeskThing.on("start", start);

// Main exit point of the server
DeskThing.on("stop", stop);
