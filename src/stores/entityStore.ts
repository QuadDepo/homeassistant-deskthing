import { create } from "zustand";
import { HassEntities } from "home-assistant-js-websocket";
import { DeskThing } from "@deskthing/client";
import type { GridConfig, LayoutConfig, GridCellData } from "../../shared";
import { DEFAULT_GRID, buildPositionMap, generateGridCells } from "../../shared";

const deskthing = DeskThing;

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

// Selector to get entity IDs in layout order (only entities with positions)
export const useOrderedEntityIds = () => {
  const entities = useEntityStore((state) => state.entities);
  const layout = useEntityStore((state) => state.layout);

  const allEntityIds = Object.keys(entities);

  if (!layout || layout.items.length === 0) {
    // No layout - show all entities from the server
    return allEntityIds;
  }

  // Get ordered IDs from layout, only including entities with positions that exist
  return layout.items
    .filter((item) => item.position && item.entityId in entities)
    .map((item) => item.entityId);
};

// Get grid configuration
export const useGridConfig = (): GridConfig => {
  const layout = useEntityStore((state) => state.layout);
  return layout?.grid || DEFAULT_GRID;
};

// Get the full grid with entity IDs at their positions (including empty cells)
export const useGridCells = (): GridCellData[] => {
  const entities = useEntityStore((state) => state.entities);
  const layout = useEntityStore((state) => state.layout);
  const grid = layout?.grid || DEFAULT_GRID;

  // Build a map of position -> entityId (only include entities that exist)
  const existingEntityIds = new Set(Object.keys(entities));
  const positionMap = layout
    ? buildPositionMap(layout.items, existingEntityIds)
    : new Map<string, string>();

  return generateGridCells(grid, positionMap);
};
