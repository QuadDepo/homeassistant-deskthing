// Types
export type {
  GridPosition,
  GridConfig,
  LayoutItem,
  LayoutConfig,
  GridCellData,
  EntitySize,
} from "./types/grid";

// Constants
export { DEFAULT_GRID, DEFAULT_SIZE } from "./types/grid";

// Utilities
export {
  positionKey,
  parsePositionKey,
  buildPositionMap,
  generateGridCells,
  createEmptyLayout,
  isValidPosition,
  findNextAvailablePosition,
  isPositionOccupied,
  getTotalCells,
  getOccupiedCells,
  isWithinBounds,
  buildOccupancyMap,
  areCellsAvailable,
  canResize,
  canMove,
} from "./utils/grid";
