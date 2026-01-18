import { type Connection, type HassEntity } from "home-assistant-js-websocket";
import {
  Actor,
  assertEvent,
  assign,
  EventObject,
  forwardTo,
  fromCallback,
  fromPromise,
  setup,
  SnapshotFrom,
} from "xstate";
import { getHomeAssistantStates } from "./utils/getHomeAssistantStates.js";
import websocketMachine from "./websocketMachine.js";
import {
  createBasicSettings,
  createEntitySetting,
} from "./utils/createSettings.js";
import { SocketData } from "@deskthing/types";
import { normalizeSettings } from "./utils/normalizeSettings.js";
import { DeskThing } from "@deskthing/server";

const getAllEntities = fromPromise<
  HassEntity[],
  {
    url: string;
    token: string;
  }
>(({ input: { url, token } }) => {
  return getHomeAssistantStates(url, token);
});

interface ClientEvent extends Omit<SocketData, "payload"> {
  payload: Events;
}

const onDeskThingEvents = fromCallback<EventObject>(({ sendBack }) => {
  DeskThing.on("settings", (settings) => {
    const { url, token, entities } = normalizeSettings(settings.payload);
    sendBack({
      type: "UPDATE_SETTINGS",
      url,
      token,
      entities,
    });
  });
});

const onClientEvents = fromCallback<EventObject>(({ sendBack }) => {
  console.log("[HA systemMachine] Registering onClientEvents 'get' handler");
  DeskThing.on("get", async (socket) => {
    console.log("[HA systemMachine] Received 'get' request:", JSON.stringify(socket));
    if (
      socket.payload &&
      typeof socket.payload === "object" &&
      "type" in socket.payload
    ) {
      console.log("[HA systemMachine] Forwarding payload to machine:", socket.payload);
      sendBack({
        ...(socket.payload as Events),
      });
    } else {
      console.log("[HA systemMachine] Ignoring - no valid payload.type (handled by index.ts)");
    }
  });
});

type Events =
  | {
      type: "UPDATE_SETTINGS";
      url: string;
      token: string;
      entities?: string[];
    }
  | {
      type: "CLIENT_CONNECTED";
    }
  | {
      type: "ENTITY_ACTION";
      action: string;
      entity_id: string;
    };

type EventTypes = Pick<Events, "type">;

export const systemMachine = setup({
  types: {
    context: {} as {
      url: string;
      token: string;
      connection: Connection | null;
      error: Error | null;
      entities: string[];
    },
    events: {} as Events,
    input: {} as {
      token?: string;
      url?: string;
      entities?: string[];
    },
  },
  actions: {
    createBasicSettings,
    forwardEventToClient: (_, params: { payload: Events }) => {
      DeskThing.send({
        type: "homeassistant",
        payload: params.payload,
      });
    },
    sendEventToClient: (_, params: { event: EventTypes }) => {
      DeskThing.send({
        type: "homeassistant",
        payload: params.event,
      });
    },
    assignSettings: assign(({ context, event }) => {
      assertEvent(event, "UPDATE_SETTINGS");
      return {
        ...context,
        token: event.token,
        url: event.url,
        entities: event.entities,
      };
    }),
  },
  guards: {
    hasValidConfig: ({ context }) => Boolean(context.url && context.token),
    hasEntities: ({ context }) => context.entities.length > 0,
    hasTokenOrUrlChanged: ({ context, event }) => {
      assertEvent(event, "UPDATE_SETTINGS");
      return !(context.url === event.url && context.token === event.token);
    },
    hasEntitiesChanged: ({ context, event }) => {
      assertEvent(event, "UPDATE_SETTINGS");
      const currentEntities = context.entities || [];
      const newEntities = event.entities || [];
      if (currentEntities.length !== newEntities.length) return true;
      return !currentEntities.every((e, i) => e === newEntities[i]);
    },
  },
  actors: {
    onDeskThingEvents,
    onClientEvents,
    getAllEntities,
    websocket: websocketMachine,
  },
}).createMachine({
  id: "system",
  context: ({ input: { url, token, entities } }) => ({
    url: url || "",
    token: token || "",
    entities: entities || [],
    connection: null,
    error: null,
  }),
  entry: [
    "createBasicSettings",
    () => {
      console.log("[HA] Starting machine...");
    },
  ],
  invoke: [
    {
      id: "onDeskThingEvents",
      src: "onDeskThingEvents",
    },
    {
      id: "onClientEvents",
      src: "onClientEvents",
    },
  ],
  initial: "initialize",
  states: {
    initialize: {
      on: {
        UPDATE_SETTINGS: [
          {
            // Only re-enter if URL or token changed
            guard: "hasTokenOrUrlChanged",
            target: "initialize",
            actions: "assignSettings",
            reenter: true,
          },
          {
            // Otherwise just update settings (e.g., entities selection) without re-entering
            actions: "assignSettings",
          },
        ],
      },
      initial: "config",
      states: {
        config: {
          always: [
            {
              guard: "hasValidConfig",
              target: "enitites",
              actions: [
                () => {
                  console.log("[HA] Valid config");
                },
              ],
            },
          ],
        },
        enitites: {
          initial: "idle",
          states: {
            idle: {
              // TODO: check if maybe spawning machine would suit better
              // We always want to fetch entities in case there are new ones?
              invoke: {
                id: "getAllEntities",
                src: "getAllEntities",
                input: ({ context: { token, url } }) => ({
                  token,
                  url,
                }),
                onError: {
                  target: "error",
                  actions: () => {
                    console.log("[HA] Fetching entities failed!");
                  },
                },
                onDone: {
                  target: "done",
                  actions: [
                    ({ context, event: { output } }) => {
                      createEntitySetting(output, context.entities);
                    },
                    () => {
                      console.log("[HA] Updating Settings...");
                    },
                  ],
                },
              },
            },
            error: {
              // TODO: handle error
            },
            done: {
              always: [
                {
                  guard: "hasEntities",
                  target: "#system.active",
                },
              ],
            },
          },
        },
      },
    },
    active: {
      entry: () => {
        console.log("[HA] Setting up WS connecting");
      },
      initial: "idle",
      states: {
        idle: {
          on: {
            CLIENT_CONNECTED: {
              actions: forwardTo("websocket"),
            },
            ENTITY_ACTION: {
              actions: forwardTo("websocket"),
            },
            UPDATE_SETTINGS: [
              {
                // URL or token changed - need to re-initialize
                guard: "hasTokenOrUrlChanged",
                target: "#system.initialize",
                actions: "assignSettings",
                reenter: true,
              },
              {
                // Entities changed - need to restart websocket with new entity list
                guard: "hasEntitiesChanged",
                target: "#system.active",
                actions: "assignSettings",
                reenter: true,
              },
              {
                // No meaningful change - just update settings without restart
                actions: "assignSettings",
              },
            ],
          },
          invoke: {
            src: "websocket",
            id: "websocket",
            input: ({ context: { url, token, entities } }) => ({
              url,
              token,
              entities,
            }),
            onError: {
              target: "error",
              actions: ({ event }) => {
                console.error(`[HA] WebSocket Error: ${event.error}`);
              },
            },
          },
        },
        error: {
          // TODO: Handle error
        },
      },
    },
  },
});

export type SystemMachine = typeof systemMachine;
export type SystemMachineRef = Actor<SystemMachine>;
export type SystemMachineSnaphot = SnapshotFrom<SystemMachineRef>;
