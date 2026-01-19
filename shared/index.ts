// Types
export type {
  GridPosition,
  GridConfig,
  LayoutItem,
  LayoutConfig,
  GridCellData,
} from "./types/grid";

// Constants
export { DEFAULT_GRID } from "./types/grid";

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
} from "./utils/grid";
