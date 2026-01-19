export interface GridPosition {
  row: number;
  col: number;
}

export interface GridConfig {
  rows: number;
  cols: number;
}

export interface LayoutItem {
  entityId: string;
  enabled: boolean;
  position?: GridPosition;
}

export interface LayoutConfig {
  version: 1;
  grid: GridConfig;
  items: LayoutItem[];
}

export interface GridCellData {
  entityId: string | null;
  row: number;
  col: number;
}

export const DEFAULT_GRID: GridConfig = {
  rows: 3,
  cols: 5,
};
