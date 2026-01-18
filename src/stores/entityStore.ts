import { create } from "zustand";
import { HassEntities } from "home-assistant-js-websocket";
import { DeskThing } from "@deskthing/client";

const deskthing = DeskThing;

interface LayoutItem {
  entityId: string;
  enabled: boolean;
}

interface LayoutConfig {
  version: 1;
  items: LayoutItem[];
}

interface EntityStore {
  entities: HassEntities;
  layout: LayoutConfig | null;
  updateEntities: (entities: HassEntities) => void;
  updateLayout: (layout: LayoutConfig) => void;
  performAction: (entityId: string, action: string, data?: object) => void;
}

export const useEntityStore = create<EntityStore>((set) => ({
  entities: {},
  layout: null,

  updateEntities: (entities) =>
    set((state) => ({
      entities: { ...state.entities, ...entities },
    })),

  updateLayout: (layout) => set({ layout }),

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

// Selector to get entity IDs in layout order (only enabled entities)
export const useOrderedEntityIds = () => {
  const entities = useEntityStore((state) => state.entities);
  const layout = useEntityStore((state) => state.layout);

  const allEntityIds = Object.keys(entities);

  if (!layout || layout.items.length === 0) {
    // No layout - show all entities from the server
    return allEntityIds;
  }

  // Get ordered IDs from layout, only including enabled entities that exist
  return layout.items
    .filter((item) => item.enabled && item.entityId in entities)
    .map((item) => item.entityId);
};
