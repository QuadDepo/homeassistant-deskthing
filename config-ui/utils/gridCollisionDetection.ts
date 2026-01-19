import type { CollisionDetection } from "@dnd-kit/core";
import { pointerWithin, rectIntersection } from "@dnd-kit/core";
import type { RefObject } from "react";
import { GRID_GAP } from "./gridUtils";

/** Grid padding in pixels (p-4 = 16px) */
const GRID_PADDING = 16;

interface GridConfig {
  rows: number;
  cols: number;
}

/**
 * Creates a custom collision detection algorithm that calculates target grid
 * position from pointer coordinates.
 *
 * This handles the case where multi-cell entities have no droppable elements
 * at their secondary cells (e.g., a 2x2 entity only has a droppable at its
 * top-left cell, not the other 3 cells it occupies).
 *
 * Key insight: We always calculate position from pointer coordinates because
 * the dragged entity's droppable spans multiple cells visually, which would
 * cause pointerWithin to incorrectly return the original position.
 */
export function createGridCollisionDetection(
  gridRef: RefObject<HTMLDivElement | null>,
  gridConfig: GridConfig
): CollisionDetection {
  return (args) => {
    const { pointerCoordinates, active } = args;

    if (!pointerCoordinates || !gridRef.current) {
      // Fallback to standard detection, but filter out the active element
      const collisions = pointerWithin(args);
      return collisions.filter((c) => c.id !== active.id);
    }

    // Calculate which grid cell the pointer is in
    const rect = gridRef.current.getBoundingClientRect();
    const relativeX = pointerCoordinates.x - rect.left - GRID_PADDING;
    const relativeY = pointerCoordinates.y - rect.top - GRID_PADDING;

    // Check if pointer is outside the grid content area
    const contentWidth = rect.width - 2 * GRID_PADDING;
    const contentHeight = rect.height - 2 * GRID_PADDING;

    if (relativeX < 0 || relativeY < 0 || relativeX > contentWidth || relativeY > contentHeight) {
      // Outside grid - use standard detection but filter active element
      const collisions = rectIntersection(args);
      return collisions.filter((c) => c.id !== active.id);
    }

    // Calculate cell dimensions including gaps
    const totalGapWidth = GRID_GAP * (gridConfig.cols - 1);
    const totalGapHeight = GRID_GAP * (gridConfig.rows - 1);
    const cellWidth = (contentWidth - totalGapWidth) / gridConfig.cols;
    const cellHeight = (contentHeight - totalGapHeight) / gridConfig.rows;

    // Calculate column: account for gap between cells
    const colSlotWidth = cellWidth + GRID_GAP;
    const col = Math.floor(relativeX / colSlotWidth);

    // Calculate row: account for gap between cells
    const rowSlotHeight = cellHeight + GRID_GAP;
    const row = Math.floor(relativeY / rowSlotHeight);

    // Clamp to grid bounds
    const clampedRow = Math.max(0, Math.min(row, gridConfig.rows - 1));
    const clampedCol = Math.max(0, Math.min(col, gridConfig.cols - 1));

    // Find a droppable with matching position data, excluding the active element
    const matchingDroppable = args.droppableContainers.find((container) => {
      // Skip the element being dragged
      if (container.id === active.id) return false;

      const data = container.data.current as { row: number; col: number } | undefined;
      return data?.row === clampedRow && data?.col === clampedCol;
    });

    if (matchingDroppable) {
      return [{ id: matchingDroppable.id }];
    }

    // No matching droppable found at this position
    // This happens when hovering over cells occupied by the entity being dragged
    // or over other multi-cell entities
    // Return empty - the pointermove listener in useDrag handles position tracking
    return [];
  };
}

/**
 * Calculates grid position from pointer coordinates.
 * Used as a fallback when collision detection returns null.
 */
export function calculateGridPositionFromPointer(
  pointerX: number,
  pointerY: number,
  gridRef: RefObject<HTMLDivElement | null>,
  gridConfig: GridConfig
): { row: number; col: number } | null {
  if (!gridRef.current) return null;

  const rect = gridRef.current.getBoundingClientRect();
  const relativeX = pointerX - rect.left - GRID_PADDING;
  const relativeY = pointerY - rect.top - GRID_PADDING;

  const contentWidth = rect.width - 2 * GRID_PADDING;
  const contentHeight = rect.height - 2 * GRID_PADDING;

  // Check bounds
  if (relativeX < 0 || relativeY < 0 || relativeX > contentWidth || relativeY > contentHeight) {
    return null;
  }

  const totalGapWidth = GRID_GAP * (gridConfig.cols - 1);
  const totalGapHeight = GRID_GAP * (gridConfig.rows - 1);
  const cellWidth = (contentWidth - totalGapWidth) / gridConfig.cols;
  const cellHeight = (contentHeight - totalGapHeight) / gridConfig.rows;

  const colSlotWidth = cellWidth + GRID_GAP;
  const rowSlotHeight = cellHeight + GRID_GAP;

  const col = Math.floor(relativeX / colSlotWidth);
  const row = Math.floor(relativeY / rowSlotHeight);

  return {
    row: Math.max(0, Math.min(row, gridConfig.rows - 1)),
    col: Math.max(0, Math.min(col, gridConfig.cols - 1)),
  };
}
