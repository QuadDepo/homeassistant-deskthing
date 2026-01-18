import { create } from "zustand";
import { HassEntities } from "home-assistant-js-websocket";
import { DeskThing } from "@deskthing/client";

const deskthing = DeskThing;

interface EntityStore {
  entities: HassEntities;
  updateEntities: (entities: HassEntities) => void;
  performAction: (entityId: string, action: string, data?: object) => void;
}

export const useEntityStore = create<EntityStore>((set) => ({
  entities: {},

  updateEntities: (entities) =>
    set((state) => ({
      entities: { ...state.entities, ...entities },
    })),

  performAction: (entityId, action, data) => {
    deskthing.send({
      type: "get",
      payload: {
        type: "ENTITY_ACTION",
        action,
        entity_id: entityId,
        ...(data && { data }),
      },
    });
  },
}));
