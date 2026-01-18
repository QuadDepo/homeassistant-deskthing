import { normalizeSystemStateValue } from "./utils/normalizeSystemStateValue.js";
import { DeskThing } from "@deskthing/server";
import { createActor } from "xstate";
import { systemMachine } from "./systemMachine.js";
import { normalizeSettings } from "./utils/normalizeSettings.js";
import { SocketData } from "@deskthing/types";
export { DeskThing };

const start = async () => {
  let data = await DeskThing.getSettings();

  const { url, token, entities } = normalizeSettings(data);

  const systemActor = createActor(systemMachine, {
    input: {
      url,
      token,
      entities,
    },
  }).start();

  // Send status on state changes
  systemActor.subscribe((state) => {
    DeskThing.send({
      type: "SERVER_STATUS",
      payload: normalizeSystemStateValue(state),
    });
  });

  // Handle client requests for current status
  DeskThing.on("get", (socket: SocketData) => {
    if (socket.request === "status") {
      DeskThing.send({
        type: "SERVER_STATUS",
        payload: normalizeSystemStateValue(systemActor.getSnapshot()),
      });
    }
  });
};

const stop = async () => {
  // Do nothing yet...
};

// Main Entrypoint of the server
DeskThing.on("start", start);

// Main exit point of the server
DeskThing.on("stop", stop);
