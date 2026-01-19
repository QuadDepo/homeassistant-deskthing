import type { EntitySize } from "../../shared/types/grid";
import { DEFAULT_SIZE } from "../../shared/types/grid";

/** Grid gap in pixels (gap-2 = 8px) */
export const GRID_GAP = 8;

/**
 * Calculate cell dimensions from grid element
 */
export function calculateCellDimensions(
  gridEl: HTMLDivElement,
  gridConfig: { rows: number; cols: number }
): { width: number; height: number } {
  const rect = gridEl.getBoundingClientRect();
  const totalGapWidth = GRID_GAP * (gridConfig.cols - 1);
  const totalGapHeight = GRID_GAP * (gridConfig.rows - 1);
  return {
    width: (rect.width - totalGapWidth) / gridConfig.cols,
    height: (rect.height - totalGapHeight) / gridConfig.rows,
  };
}

/**
 * Calculate snapped target position for drag end, applying edge snapping
 */
export function calculateSnappedPosition(
  targetRow: number,
  targetCol: number,
  size: EntitySize,
  gridConfig: { rows: number; cols: number }
): { row: number; col: number } {
  let row = targetRow;
  let col = targetCol;

  // Snap to fit within grid bounds
  if (row + size.rowSpan > gridConfig.rows) {
    row = gridConfig.rows - size.rowSpan;
  }
  if (col + size.colSpan > gridConfig.cols) {
    col = gridConfig.cols - size.colSpan;
  }

  // Ensure we don't go negative
  return {
    row: Math.max(0, row),
    col: Math.max(0, col),
  };
}

/**
 * Check if the move is valid (different from origin and within bounds)
 */
export function isValidMove(
  from: { row: number; col: number },
  to: { row: number; col: number }
): boolean {
  return from.row !== to.row || from.col !== to.col;
}

/**
 * Get entity size or default
 */
export function getEntitySize(size: EntitySize | undefined): EntitySize {
  return size || DEFAULT_SIZE;
}

export interface DropPreviewState {
  snapped: { row: number; col: number } | null;
  isValid: boolean;
  isOverOriginal: boolean;
}

/**
 * Calculate drop preview state for drag overlay.
 * Returns snapped position, validity, and whether hovering over original position.
 */
export function calculateDropPreviewState(
  target: { row: number; col: number } | null,
  from: { row: number; col: number },
  entityId: string,
  size: EntitySize,
  gridConfig: { rows: number; cols: number },
  items: { entityId: string; position?: { row: number; col: number }; size?: EntitySize }[],
  canMoveFn: (entityId: string, position: { row: number; col: number }, items: typeof items, gridConfig: typeof gridConfig) => boolean
): DropPreviewState {
  if (!target) {
    return { snapped: null, isValid: false, isOverOriginal: false };
  }

  const snapped = calculateSnappedPosition(target.row, target.col, size, gridConfig);
  const isOverOriginal = snapped.row === from.row && snapped.col === from.col;
  const isValid = canMoveFn(entityId, snapped, items, gridConfig);

  return { snapped, isValid, isOverOriginal };
}
