import type { GridConfig, GridPosition, EntitySize } from "../../shared/types/grid";
import { DEFAULT_GRID } from "../../shared/types/grid";
import { positionKey } from "../../shared/utils/grid";
import type { EntityInfo } from "../../server/configServer/types";
import { useConfigStore } from "./configStore";

export interface EntityWithLayout extends EntityInfo {
  enabled: boolean;
  position?: GridPosition;
  size?: EntitySize;
}

export function useEntityAtPosition(row: number, col: number): EntityWithLayout | null {
  const gridEntities = useGridEntities();
  return gridEntities.get(positionKey(row, col)) || null;
}

export function useGridEntities(): Map<string, EntityWithLayout> {
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
          size: item.size,
        });
      }
    }
  });

  return gridMap;
}

export function useAvailableEntities(): EntityInfo[] {
  const allEntities = useConfigStore((state) => state.allEntities);
  const layout = useConfigStore((state) => state.layout);

  const placedEntityIds = new Set(
    layout.items
      .filter((item) => item.position)
      .map((item) => item.entityId)
  );

  return allEntities.filter((entity) => !placedEntityIds.has(entity.entity_id));
}

export function useGridConfig(): GridConfig {
  const layout = useConfigStore((state) => state.layout);
  return layout.grid || DEFAULT_GRID;
}

export function useGridEntityCount(): number {
  const layout = useConfigStore((state) => state.layout);
  return layout.items.filter((item) => item.position).length;
}

export function useAvailableDomains(): string[] {
  const availableEntities = useAvailableEntities();
  const domains = new Set(availableEntities.map((e) => e.domain));
  return Array.from(domains).sort();
}
