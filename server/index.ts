import { normalizeSystemStateValue } from "./utils/normalizeSystemStateValue";
import { createDeskThing } from "@deskthing/server";
import { createActor } from "xstate";
import { systemMachine } from "./systemMachine";
import { normalizeSettings } from "./utils/normalizeSettings";
import { createBasicSettings } from "./utils/createSettings";
import { DESKTHING_EVENTS, SocketData } from "@deskthing/types";
import { createConfigServer } from "./configServer/index";
import type { LayoutConfig } from "../shared/index";
import { createEmptyLayout } from "../shared/index";

const DeskThing = createDeskThing();

let configServer: ReturnType<typeof createConfigServer> | null = null;

// Load layout from DeskThing settings
const loadLayoutFromSettings = async (): Promise<LayoutConfig> => {
  try {
    const settings = await DeskThing.getSettings();
    const layoutSetting = (settings as Record<string, unknown>)?.layout as
      | { value?: string }
      | undefined;

    if (typeof layoutSetting?.value === "string") {
      try {
        return JSON.parse(layoutSetting.value) as LayoutConfig;
      } catch {
        return createEmptyLayout();
      }
    }
    return createEmptyLayout();
  } catch (error) {
    console.error("[HA] Failed to load layout from settings:", error);
    return createEmptyLayout();
  }
};

// Send layout to client
const sendLayoutToClient = async () => {
  const layout = await loadLayoutFromSettings();
  console.log(
    "[HA] Sending layout to client:",
    `${layout.grid.rows}x${layout.grid.cols} grid,`,
    `${layout.items.filter((i) => i.position).length} positioned items`,
  );
  DeskThing.send({
    type: "LAYOUT_CONFIG",
    payload: layout,
  });
};

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

  // Start the config server for entity layout configuration
  try {
    configServer = createConfigServer(() => systemActor.getSnapshot());
    configServer.start();
  } catch (error) {
    console.error("[HA] Failed to start config server:", error);
    // Don't crash the main app if config server fails to start
  }

  systemActor.subscribe((state) => {
    const status = normalizeSystemStateValue(state);
    console.log("[HA Server] State changed, sending SERVER_STATUS:", status);
    DeskThing.send({
      type: "SERVER_STATUS",
      payload: status,
    });
  });

  console.log("[HA Server] Registering 'get' handler for status requests");

  DeskThing.on("get", async (socket: SocketData) => {
    console.log("[HA Server] Received 'get' request:", JSON.stringify(socket));

    if (socket.request === "status") {
      const status = normalizeSystemStateValue(systemActor.getSnapshot());

      console.log("[HA Server] Responding with SERVER_STATUS:", status);

      DeskThing.send({
        type: "SERVER_STATUS",
        payload: status,
      });
    }

    // Handle CLIENT_CONNECTED - send layout to client
    const payload = socket.payload as { type?: string } | undefined;
    if (payload?.type === "CLIENT_CONNECTED") {
      console.log("[HA Server] Client connected, sending layout...");
      await sendLayoutToClient();
    }
  });
};

const stop = async () => {
  console.log("[HA] Stopping Home Assistant app...");

  // Stop the config server to release the port
  if (configServer) {
    configServer.stop();
    configServer = null;
  }
};

// Main Entrypoint of the server
DeskThing.on(DESKTHING_EVENTS.START, start);

// Main exit point of the server
DeskThing.on(DESKTHING_EVENTS.STOP, stop);
