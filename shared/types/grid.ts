import { z } from "zod";

export interface GridPosition {
  row: number;
  col: number;
}

export interface EntitySize {
  rowSpan: number;
  colSpan: number;
}

export const DEFAULT_SIZE: EntitySize = {
  rowSpan: 1,
  colSpan: 1,
};

export interface GridConfig {
  rows: number;
  cols: number;
}

export interface LayoutItem {
  entityId: string;
  enabled: boolean;
  position?: GridPosition;
  size?: EntitySize;
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

// Zod Schemas for validation
export const GridPositionSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

export const EntitySizeSchema = z.object({
  rowSpan: z.number().int().min(1),
  colSpan: z.number().int().min(1),
});

export const GridConfigSchema = z.object({
  rows: z.number().int().min(1).max(DEFAULT_GRID.rows),
  cols: z.number().int().min(1).max(DEFAULT_GRID.cols),
});

export const LayoutItemSchema = z.object({
  entityId: z.string().min(1),
  enabled: z.boolean(),
  position: GridPositionSchema.optional(),
  size: EntitySizeSchema.optional(),
});

export const LayoutConfigSchema = z.object({
  version: z.literal(1),
  grid: GridConfigSchema,
  items: z.array(LayoutItemSchema),
});
