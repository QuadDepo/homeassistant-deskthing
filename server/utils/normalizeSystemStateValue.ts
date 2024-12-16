import { SystemMachineSnaphot } from "../systemMachine";

export const normalizeSystemStateValue = (state: SystemMachineSnaphot) => {
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
