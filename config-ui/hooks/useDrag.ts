import { useCallback, useRef, useState, type RefObject } from "react";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import { DEFAULT_SIZE } from "../../shared/types/grid";
import type { GridPosition, GridConfig } from "../../shared/types/grid";
import type { EntityWithLayout } from "../stores/configStore";
import { calculateCellDimensions, calculateSnappedPosition, isValidMove } from "../utils/gridUtils";

interface CellDimensions {
  width: number;
  height: number;
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

  const [overlayData, setOverlayData] = useState<DragOverlayData | null>(null);
  const [hoveredCell, setHoveredCell] = useState<GridPosition | null>(null);

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

  const onDragOver = useCallback((event: DragOverEvent) => {
    const dragState = dragStateRef.current;
    if (dragState.status !== "dragging") return;

    const { over } = event;
    if (over) {
      const toData = over.data.current as GridPosition;
      dragState.hoveredCell = toData;
      setHoveredCell(toData);
    } else {
      dragState.hoveredCell = null;
      setHoveredCell(null);
    }
  }, []);

  const onDragCancel = useCallback(() => {
    dragStateRef.current = IDLE_DRAG_STATE;
    setOverlayData(null);
    setHoveredCell(null);
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const dragState = dragStateRef.current;
      if (dragState.status !== "dragging") return;

      const draggedEntity = dragState.entity;

      dragStateRef.current = IDLE_DRAG_STATE;
      setOverlayData(null);
      setHoveredCell(null);

      const { active, over } = event;
      if (!over) return;

      const fromData = active.data.current as GridPosition;
      const toData = over.data.current as GridPosition;

      if (!isValidMove(fromData, toData)) return;

      const size = draggedEntity.size || DEFAULT_SIZE;
      const snapped = calculateSnappedPosition(toData.row, toData.col, size, gridConfig);

      if (!isValidMove(fromData, snapped)) return;

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
