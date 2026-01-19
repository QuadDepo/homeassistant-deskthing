import { useCallback, useRef, useState, useEffect, type RefObject } from "react";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import { DEFAULT_SIZE } from "../../shared/types/grid";
import type { GridPosition, GridConfig } from "../../shared/types/grid";
import type { EntityWithLayout } from "../stores/configStore";
import { calculateCellDimensions, calculateSnappedPosition } from "../utils/gridUtils";
import { calculateGridPositionFromPointer } from "../utils/gridCollisionDetection";

interface CellDimensions {
  width: number;
  height: number;
}

interface PointerPosition {
  x: number;
  y: number;
}

type DragState =
  | { status: "idle" }
  | {
      status: "dragging";
      entity: EntityWithLayout;
      fromCell: GridPosition;
      hoveredCell: GridPosition | null;
      cellDimensions: CellDimensions;
    };

const IDLE_DRAG_STATE: DragState = { status: "idle" };

export interface DragOverlayData {
  entity: EntityWithLayout;
  cellDimensions: CellDimensions;
  fromCell: GridPosition;
}

interface UseDragOptions {
  gridRef: RefObject<HTMLDivElement | null>;
  gridConfig: GridConfig;
  moveEntity: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
}

export function useDrag({ gridRef, gridConfig, moveEntity }: UseDragOptions) {
  const dragStateRef = useRef<DragState>(IDLE_DRAG_STATE);
  const pointerRef = useRef<PointerPosition | null>(null);
  const isDraggingRef = useRef(false);

  const [overlayData, setOverlayData] = useState<DragOverlayData | null>(null);
  const [hoveredCell, setHoveredCell] = useState<GridPosition | null>(null);

  // Track pointer position during drag via window event listener
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingRef.current) {
        pointerRef.current = { x: e.clientX, y: e.clientY };

        // Update hovered cell based on current pointer position
        const dragState = dragStateRef.current;
        if (dragState.status === "dragging") {
          const pos = calculateGridPositionFromPointer(
            e.clientX,
            e.clientY,
            gridRef,
            gridConfig
          );
          if (pos) {
            dragState.hoveredCell = pos;
            setHoveredCell(pos);
          }
        }
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [gridRef, gridConfig]);

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const { entity, row, col } = event.active.data.current as {
        entity: EntityWithLayout;
        row: number;
        col: number;
      };

      const gridEl = gridRef.current;
      const cellDimensions = gridEl ? calculateCellDimensions(gridEl, gridConfig) : null;
      if (!cellDimensions) return;

      isDraggingRef.current = true;
      dragStateRef.current = {
        status: "dragging",
        entity,
        fromCell: { row, col },
        hoveredCell: null,
        cellDimensions,
      };

      setOverlayData({ entity, cellDimensions, fromCell: { row, col } });
    },
    [gridRef, gridConfig]
  );

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const dragState = dragStateRef.current;
      if (dragState.status !== "dragging") return;

      const { over } = event;

      // When over a droppable, use its data
      // Otherwise, the pointermove listener handles position tracking
      if (over) {
        const toData = over.data.current as GridPosition;
        dragState.hoveredCell = toData;
        setHoveredCell(toData);
      }
      // Note: When over is null (dragging over occupied cells), the
      // pointermove listener in useEffect already updates hoveredCell
    },
    []
  );

  const onDragCancel = useCallback(() => {
    isDraggingRef.current = false;
    pointerRef.current = null;
    dragStateRef.current = IDLE_DRAG_STATE;
    setOverlayData(null);
    setHoveredCell(null);
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const dragState = dragStateRef.current;
      if (dragState.status !== "dragging") return;

      const draggedEntity = dragState.entity;
      // Capture the hovered cell before resetting state
      const lastHoveredCell = dragState.hoveredCell;

      isDraggingRef.current = false;
      pointerRef.current = null;
      dragStateRef.current = IDLE_DRAG_STATE;
      setOverlayData(null);
      setHoveredCell(null);

      const { active, over } = event;
      const fromData = active.data.current as GridPosition;

      // Get target position from droppable or use last hovered cell
      // (which is calculated from pointer in onDragOver when over is null)
      let toData: GridPosition | null = null;

      if (over) {
        toData = over.data.current as GridPosition;
      } else if (lastHoveredCell) {
        // Use the last hovered cell position calculated from pointer coordinates
        // This handles dropping on cells occupied by the entity being dragged
        toData = lastHoveredCell;
      }

      if (!toData) return;

      const size = draggedEntity.size || DEFAULT_SIZE;
      const snapped = calculateSnappedPosition(toData.row, toData.col, size, gridConfig);

      // Only move if actually changing position
      if (snapped.row === fromData.row && snapped.col === fromData.col) return;

      moveEntity(fromData.row, fromData.col, snapped.row, snapped.col);
    },
    [moveEntity, gridConfig]
  );

  return {
    overlayData,
    hoveredCell,
    handlers: {
      onDragStart,
      onDragOver,
      onDragEnd,
      onDragCancel,
    },
  };
}
