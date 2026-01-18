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
      initialize: "entities",
    })
  ) {
    return "entities";
  }

  // Default fallback - prevents sending undefined to DeskThing
  return "loading";
};
