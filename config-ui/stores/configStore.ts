import { create } from "zustand";
import type { LayoutConfig, EntitySize } from "../../shared/types/grid";
import { DEFAULT_GRID, DEFAULT_SIZE } from "../../shared/types/grid";
import {
  canResize,
  canMove,
  getOccupiedCells,
  isWithinBounds,
  areCellsAvailable,
} from "../../shared/utils/grid";
import type { EntityInfo } from "../../server/configServer/types";
import {
  fetchEntities,
  fetchLayout,
  fetchSelectedEntities,
  saveLayout as saveLayoutApi,
} from "../utils/api";
import { migrateLayout } from "./layoutMigration";

interface ConfigStore {
  // Data
  allEntities: EntityInfo[];
  layout: LayoutConfig;

  // UI State
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;
  resizingEntity: { entityId: string; previewSize: EntitySize } | null;

  // Actions
  loadData: () => Promise<void>;
  placeEntity: (entityId: string, row: number, col: number) => void;
  removeFromGrid: (row: number, col: number) => void;
  moveEntity: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  resizeEntity: (entityId: string, newSize: EntitySize) => void;
  setResizingEntity: (state: { entityId: string; previewSize: EntitySize } | null) => void;
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
  resizingEntity: null,

  loadData: async () => {
    set({ isLoading: true, error: null });

    try {
      const [entitiesRes, selectedRes, layoutRes] = await Promise.all([
        fetchEntities(),
        fetchSelectedEntities(),
        fetchLayout(),
      ]);

      const allEntities = entitiesRes.entities;
      const layout = migrateLayout({
        layout: layoutRes.layout,
        allEntities,
        selectedEntityIds: new Set(selectedRes.selectedEntityIds),
      });

      set({ allEntities, layout, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load data",
        isLoading: false,
      });
    }
  },

  placeEntity: (entityId: string, row: number, col: number) => {
    set((state) => {
      const position = { row, col };

      // Get the entity's current or default size
      const currentItem = state.layout.items.find((item) => item.entityId === entityId);
      const size = currentItem?.size || DEFAULT_SIZE;

      // Validate the placement is within bounds
      if (!isWithinBounds(position, size, state.layout.grid)) {
        return state;
      }

      // Get all cells this entity would occupy
      const cellsNeeded = getOccupiedCells(position, size);

      // Check if those cells are available (excluding this entity if already placed)
      if (!areCellsAvailable(cellsNeeded, state.layout.items, entityId)) {
        return state;
      }

      const items = state.layout.items.map((item) =>
        item.entityId === entityId
          ? { ...item, enabled: true, position }
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
      // Find the entity being moved
      const movingItem = state.layout.items.find(
        (item) => item.position?.row === fromRow && item.position?.col === fromCol
      );
      if (!movingItem) return state;

      const newPosition = { row: toRow, col: toCol };

      // Use size-aware validation
      if (!canMove(movingItem.entityId, newPosition, state.layout.items, state.layout.grid)) {
        return state;
      }

      const items = state.layout.items.map((item) =>
        item.entityId === movingItem.entityId
          ? { ...item, position: newPosition }
          : item
      );

      return {
        layout: { ...state.layout, items },
        isDirty: true,
      };
    });
  },

  resizeEntity: (entityId: string, newSize: EntitySize) => {
    set((state) => {
      // Validate resize
      if (!canResize(entityId, newSize, state.layout.items, state.layout.grid)) {
        return { resizingEntity: null }; // Invalid resize, clear preview
      }

      const items = state.layout.items.map((item) =>
        item.entityId === entityId ? { ...item, size: newSize } : item
      );

      return {
        layout: { ...state.layout, items },
        isDirty: true,
        resizingEntity: null,
      };
    });
  },

  setResizingEntity: (resizingState) => {
    set({ resizingEntity: resizingState });
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

export {
  useEntityAtPosition,
  useGridEntities,
  useAvailableEntities,
  useGridConfig,
  useGridEntityCount,
  useAvailableDomains,
  type EntityWithLayout,
} from "./configSelectors";
