import { create } from "zustand";
import type { EntityInfo, LayoutConfig, LayoutItem } from "../../server/configServer/types";
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
  toggleEntity: (entityId: string) => void;
  reorderEntities: (fromIndex: number, toIndex: number) => void;
  saveLayout: () => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  // Initial state
  allEntities: [],
  layout: { version: 1, items: [] },
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

      // Build complete layout from all entities
      // If we have an existing layout, preserve its order and enabled states
      // Otherwise, initialize with all entities (selected ones enabled)
      if (layout.items.length > 0) {
        // Existing layout - ensure all entities are included
        const existingIds = new Set(layout.items.map((item) => item.entityId));

        // Add any new entities that aren't in the layout yet
        const newEntities = allEntities
          .filter((e) => !existingIds.has(e.entity_id))
          .map((e) => ({
            entityId: e.entity_id,
            enabled: false,
          }));

        layout = {
          ...layout,
          items: [...layout.items, ...newEntities],
        };
      } else {
        // No existing layout - create from all entities
        // Previously selected entities are enabled, others are disabled
        layout = {
          version: 1,
          items: allEntities.map((entity) => ({
            entityId: entity.entity_id,
            enabled: selectedEntityIds.has(entity.entity_id),
          })),
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

  toggleEntity: (entityId: string) => {
    set((state) => {
      const items = state.layout.items.map((item) =>
        item.entityId === entityId ? { ...item, enabled: !item.enabled } : item
      );

      return {
        layout: { ...state.layout, items },
        isDirty: true,
      };
    });
  },

  reorderEntities: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const items = [...state.layout.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);

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
  index: number;
}

// Selector to get all entities with their layout info
export const useEntitiesWithLayout = (): EntityWithLayout[] => {
  const allEntities = useConfigStore((state) => state.allEntities);
  const layout = useConfigStore((state) => state.layout);

  // Create a map for quick entity lookup
  const entityMap = new Map(allEntities.map((e) => [e.entity_id, e]));

  // Map layout items to entities with layout info
  return layout.items
    .map((item, index) => {
      const entity = entityMap.get(item.entityId);
      if (!entity) return null;
      return {
        ...entity,
        enabled: item.enabled,
        index,
      };
    })
    .filter((e): e is EntityWithLayout => e !== null);
};

// Selector to count enabled entities
export const useEnabledCount = (): number => {
  const layout = useConfigStore((state) => state.layout);
  return layout.items.filter((item) => item.enabled).length;
};
