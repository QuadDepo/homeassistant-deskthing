import type { LayoutConfig, GridConfig, LayoutItem } from "../../shared/types/grid";
import { DEFAULT_GRID } from "../../shared/types/grid";
import type { EntityInfo } from "../../server/configServer/types";

interface MigrationInput {
  layout: LayoutConfig;
  allEntities: EntityInfo[];
  selectedEntityIds: Set<string>;
}

function ensureGridConfig(layout: LayoutConfig): LayoutConfig {
  if (!layout.grid) {
    return { ...layout, grid: DEFAULT_GRID };
  }
  return layout;
}

function migratePositionlessItems(layout: LayoutConfig): LayoutConfig {
  const hasPositions = layout.items.some((item) => item.position);
  if (hasPositions) {
    return layout;
  }

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

  return { ...layout, items: migratedItems };
}

function addMissingEntities(layout: LayoutConfig, allEntities: EntityInfo[]): LayoutConfig {
  const existingIds = new Set(layout.items.map((item) => item.entityId));
  const newItems: LayoutItem[] = allEntities
    .filter((e) => !existingIds.has(e.entity_id))
    .map((e) => ({
      entityId: e.entity_id,
      enabled: false,
    }));

  if (newItems.length === 0) {
    return layout;
  }

  return {
    ...layout,
    items: [...layout.items, ...newItems],
  };
}

function createInitialLayout(
  allEntities: EntityInfo[],
  selectedEntityIds: Set<string>,
  grid: GridConfig = DEFAULT_GRID
): LayoutConfig {
  let row = 0;
  let col = 0;

  const items: LayoutItem[] = allEntities.map((entity) => {
    const isSelected = selectedEntityIds.has(entity.entity_id);
    if (isSelected) {
      const position = { row, col };
      col++;
      if (col >= grid.cols) {
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
  });

  return { version: 1, grid, items };
}

export function migrateLayout({ layout, allEntities, selectedEntityIds }: MigrationInput): LayoutConfig {
  if (layout.items.length === 0) {
    return createInitialLayout(allEntities, selectedEntityIds);
  }

  let result = ensureGridConfig(layout);
  result = migratePositionlessItems(result);
  result = addMissingEntities(result, allEntities);

  return result;
}
