import type {
  GridConfig,
  GridPosition,
  LayoutItem,
  LayoutConfig,
  GridCellData,
} from "../types/grid";
import { DEFAULT_GRID } from "../types/grid";

// Create position key for Map lookups (e.g., "0-1" for row 0, col 1)
export const positionKey = (row: number, col: number): string => `${row}-${col}`;

// Parse position key back to coordinates
export const parsePositionKey = (key: string): GridPosition => {
  const [row, col] = key.split("-").map(Number);
  return { row, col };
};

// Build a Map of position keys to entity IDs from layout items
export const buildPositionMap = (
  items: LayoutItem[],
  existingEntityIds?: Set<string>
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const item of items) {
    if (item.position) {
      // If existingEntityIds is provided, only include items that exist
      if (existingEntityIds && !existingEntityIds.has(item.entityId)) {
        continue;
      }
      const key = positionKey(item.position.row, item.position.col);
      map.set(key, item.entityId);
    }
  }
  return map;
};

// Generate all grid cells (including empty cells)
export const generateGridCells = (
  grid: GridConfig,
  positionMap: Map<string, string>
): GridCellData[] => {
  const cells: GridCellData[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const key = positionKey(row, col);
      cells.push({
        entityId: positionMap.get(key) || null,
        row,
        col,
      });
    }
  }
  return cells;
};

// Create an empty layout with default grid
export const createEmptyLayout = (): LayoutConfig => ({
  version: 1,
  grid: DEFAULT_GRID,
  items: [],
});

// Validate that a position is within grid bounds
export const isValidPosition = (
  position: GridPosition,
  grid: GridConfig
): boolean => {
  return (
    position.row >= 0 &&
    position.row < grid.rows &&
    position.col >= 0 &&
    position.col < grid.cols
  );
};

// Find the next available (empty) position in the grid
export const findNextAvailablePosition = (
  grid: GridConfig,
  positionMap: Map<string, string>
): GridPosition | null => {
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const key = positionKey(row, col);
      if (!positionMap.has(key)) {
        return { row, col };
      }
    }
  }
  return null; // Grid is full
};

// Check if a position is occupied
export const isPositionOccupied = (
  row: number,
  col: number,
  items: LayoutItem[]
): boolean => {
  return items.some(
    (item) => item.position?.row === row && item.position?.col === col
  );
};

// Get the total number of cells in a grid
export const getTotalCells = (grid: GridConfig): number => {
  return grid.rows * grid.cols;
};
