import { normalizeSystemStateValue } from "./utils/normalizeSystemStateValue.js";
import { createDeskThing } from "@deskthing/server";
import { createActor } from "xstate";
import { systemMachine } from "./systemMachine.js";
import { normalizeSettings } from "./utils/normalizeSettings.js";
import { createBasicSettings } from "./utils/createSettings.js";
import { DESKTHING_EVENTS, SocketData } from "@deskthing/types";

const DeskThing = createDeskThing();

const start = async () => {
  console.log("[HA] Starting Home Assistant app...");

  await createBasicSettings();

  console.log("[HA] Settings schema initialized");

  const settings = await DeskThing.getSettings();

  console.log("[HA] Settings", JSON.stringify(settings, null, 2));

  const { url, token, entities } = normalizeSettings(settings);

  const systemActor = createActor(systemMachine, {
    input: {
      url,
      token,
      entities,
    },
  }).start();

  systemActor.subscribe((state) => {
    const status = normalizeSystemStateValue(state);
    console.log("[HA Server] State changed, sending SERVER_STATUS:", status);
    DeskThing.send({
      type: "SERVER_STATUS",
      payload: status,
    });
  });

  console.log("[HA Server] Registering 'get' handler for status requests");

  DeskThing.on("get", (socket: SocketData) => {
    console.log("[HA Server] Received 'get' request:", JSON.stringify(socket));

    if (socket.request === "status") {
      const status = normalizeSystemStateValue(systemActor.getSnapshot());

      console.log("[HA Server] Responding with SERVER_STATUS:", status);

      DeskThing.send({
        type: "SERVER_STATUS",
        payload: status,
      });
    }
  });
};

const stop = async () => {
  // Do nothing yet...
};

// Main Entrypoint of the server
DeskThing.on(DESKTHING_EVENTS.START, start);

// Main exit point of the server
DeskThing.on(DESKTHING_EVENTS.STOP, stop);
