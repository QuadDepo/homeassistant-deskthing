import { create } from "zustand";
import type { LayoutConfig, GridPosition, GridConfig } from "../../shared";
import { DEFAULT_GRID, positionKey, isPositionOccupied } from "../../shared";
import type { EntityInfo } from "../../server/configServer/types";
import {
  fetchEntities,
  fetchLayout,
  fetchSelectedEntities,
  saveLayout as saveLayoutApi,
} from "../utils/api";

interface ConfigStore {
  // Data
  allEntities: EntityInfo[];
  layout: LayoutConfig;

  // UI State
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;

  // Actions
  loadData: () => Promise<void>;
  placeEntity: (entityId: string, row: number, col: number) => void;
  removeFromGrid: (row: number, col: number) => void;
  moveEntity: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  saveLayout: () => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  // Initial state
  allEntities: [],
  layout: { version: 1, grid: DEFAULT_GRID, items: [] },
  isLoading: false,
  isSaving: false,
  isDirty: false,
  error: null,

  loadData: async () => {
    set({ isLoading: true, error: null });

    try {
      const [entitiesRes, selectedRes, layoutRes] = await Promise.all([
        fetchEntities(),
        fetchSelectedEntities(),
        fetchLayout(),
      ]);

      const allEntities = entitiesRes.entities;
      const selectedEntityIds = new Set(selectedRes.selectedEntityIds);
      let layout = layoutRes.layout;

      // Ensure layout has grid config
      if (!layout.grid) {
        layout = { ...layout, grid: DEFAULT_GRID };
      }

      // Migrate old layouts: if items exist without positions, place them on grid
      if (layout.items.length > 0) {
        const hasPositions = layout.items.some((item) => item.position);
        if (!hasPositions) {
          // Migrate: place enabled items on grid in order
          let row = 0;
          let col = 0;
          const migratedItems = layout.items.map((item) => {
            if (item.enabled) {
              const position = { row, col };
              col++;
              if (col >= layout.grid.cols) {
                col = 0;
                row++;
              }
              return { ...item, position };
            }
            return item;
          });
          layout = { ...layout, items: migratedItems };
        }

        // Ensure all entities are in layout
        const existingIds = new Set(layout.items.map((item) => item.entityId));
        const newEntities = allEntities
          .filter((e) => !existingIds.has(e.entity_id))
          .map((e) => ({
            entityId: e.entity_id,
            enabled: false,
          }));

        if (newEntities.length > 0) {
          layout = {
            ...layout,
            items: [...layout.items, ...newEntities],
          };
        }
      } else {
        // No existing layout - create from all entities
        // Place previously selected entities on grid
        let row = 0;
        let col = 0;
        layout = {
          version: 1,
          grid: DEFAULT_GRID,
          items: allEntities.map((entity) => {
            const isSelected = selectedEntityIds.has(entity.entity_id);
            if (isSelected) {
              const position = { row, col };
              col++;
              if (col >= DEFAULT_GRID.cols) {
                col = 0;
                row++;
              }
              return {
                entityId: entity.entity_id,
                enabled: true,
                position,
              };
            }
            return {
              entityId: entity.entity_id,
              enabled: false,
            };
          }),
        };
      }

      set({
        allEntities,
        layout,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load data",
        isLoading: false,
      });
    }
  },

  placeEntity: (entityId: string, row: number, col: number) => {
    set((state) => {
      // Check if position is already occupied
      const isOccupied = state.layout.items.some(
        (item) => item.position?.row === row && item.position?.col === col
      );
      if (isOccupied) return state;

      const items = state.layout.items.map((item) =>
        item.entityId === entityId
          ? { ...item, enabled: true, position: { row, col } }
          : item
      );

      return {
        layout: { ...state.layout, items },
        isDirty: true,
      };
    });
  },

  removeFromGrid: (row: number, col: number) => {
    set((state) => {
      const items = state.layout.items.map((item) =>
        item.position?.row === row && item.position?.col === col
          ? { ...item, enabled: false, position: undefined }
          : item
      );

      return {
        layout: { ...state.layout, items },
        isDirty: true,
      };
    });
  },

  moveEntity: (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    set((state) => {
      // Check if target position is already occupied
      const isOccupied = state.layout.items.some(
        (item) => item.position?.row === toRow && item.position?.col === toCol
      );
      if (isOccupied) return state;

      const items = state.layout.items.map((item) =>
        item.position?.row === fromRow && item.position?.col === fromCol
          ? { ...item, position: { row: toRow, col: toCol } }
          : item
      );

      return {
        layout: { ...state.layout, items },
        isDirty: true,
      };
    });
  },

  saveLayout: async () => {
    const { layout } = get();
    set({ isSaving: true, error: null });

    try {
      await saveLayoutApi(layout);
      set({ isSaving: false, isDirty: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to save layout",
        isSaving: false,
      });
    }
  },
}));

// Entity with layout info combined
export interface EntityWithLayout extends EntityInfo {
  enabled: boolean;
  position?: GridPosition;
}

// Get entity at a specific grid position
// Uses useGridEntities internally to avoid rebuilding the entity map on each call
export const useEntityAtPosition = (row: number, col: number): EntityWithLayout | null => {
  const gridEntities = useGridEntities();
  return gridEntities.get(positionKey(row, col)) || null;
};

// Get all entities that are placed on the grid
export const useGridEntities = (): Map<string, EntityWithLayout> => {
  const allEntities = useConfigStore((state) => state.allEntities);
  const layout = useConfigStore((state) => state.layout);

  const entityMap = new Map(allEntities.map((e) => [e.entity_id, e]));
  const gridMap = new Map<string, EntityWithLayout>();

  layout.items.forEach((item) => {
    if (item.position) {
      const entity = entityMap.get(item.entityId);
      if (entity) {
        const key = positionKey(item.position.row, item.position.col);
        gridMap.set(key, {
          ...entity,
          enabled: item.enabled,
          position: item.position,
        });
      }
    }
  });

  return gridMap;
};

// Get all entities that are NOT placed on the grid (available for adding)
export const useAvailableEntities = (): EntityInfo[] => {
  const allEntities = useConfigStore((state) => state.allEntities);
  const layout = useConfigStore((state) => state.layout);

  const placedEntityIds = new Set(
    layout.items
      .filter((item) => item.position)
      .map((item) => item.entityId)
  );

  return allEntities.filter((entity) => !placedEntityIds.has(entity.entity_id));
};

// Get grid configuration
export const useGridConfig = (): GridConfig => {
  const layout = useConfigStore((state) => state.layout);
  return layout.grid || DEFAULT_GRID;
};

// Count of entities on the grid
export const useGridEntityCount = (): number => {
  const layout = useConfigStore((state) => state.layout);
  return layout.items.filter((item) => item.position).length;
};

// Get all unique domains from available entities
export const useAvailableDomains = (): string[] => {
  const availableEntities = useAvailableEntities();
  const domains = new Set(availableEntities.map((e) => e.domain));
  return Array.from(domains).sort();
};
