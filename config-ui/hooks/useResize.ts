import { useCallback, useEffect, useRef, RefObject } from "react";
import type { EntitySize, LayoutItem } from "../../shared/types/grid";
import { DEFAULT_SIZE } from "../../shared/types/grid";
import { GRID_GAP } from "../utils/gridUtils";

interface ResizeState {
  entityId: string;
  startX: number;
  startY: number;
  startSize: EntitySize;
  cellWidth: number;
  cellHeight: number;
}

interface UseResizeOptions {
  gridRef: RefObject<HTMLDivElement | null>;
  gridConfig: { rows: number; cols: number };
  items: LayoutItem[];
  resizeEntity: (entityId: string, newSize: EntitySize) => void;
  setResizingEntity: (value: { entityId: string; previewSize: EntitySize } | null) => void;
  resizingEntity: { entityId: string; previewSize: EntitySize } | null;
}

export function useResize({
  gridRef,
  gridConfig,
  items,
  resizeEntity,
  setResizingEntity,
  resizingEntity,
}: UseResizeOptions) {
  // Use ref for resize state to avoid re-renders during drag
  const resizeStateRef = useRef<ResizeState | null>(null);
  // Keep a state version just for the isResizing check (only changes on start/end)
  const isResizingRef = useRef(false);

  const handleResizeStart = useCallback((entityId: string, e: React.MouseEvent) => {
    const item = items.find((i) => i.entityId === entityId);
    if (!item) return;

    const gridEl = gridRef.current;
    if (!gridEl) return;

    const rect = gridEl.getBoundingClientRect();
    const totalGapWidth = GRID_GAP * (gridConfig.cols - 1);
    const totalGapHeight = GRID_GAP * (gridConfig.rows - 1);
    const cellWidth = (rect.width - totalGapWidth) / gridConfig.cols;
    const cellHeight = (rect.height - totalGapHeight) / gridConfig.rows;

    resizeStateRef.current = {
      entityId,
      startX: e.clientX,
      startY: e.clientY,
      startSize: item.size || DEFAULT_SIZE,
      cellWidth,
      cellHeight,
    };
    isResizingRef.current = true;
  }, [items, gridConfig, gridRef]);

  // Use refs for handlers to avoid effect re-subscription
  const resizeEntityRef = useRef(resizeEntity);
  const setResizingEntityRef = useRef(setResizingEntity);
  const resizingEntityRef = useRef(resizingEntity);

  useEffect(() => {
    resizeEntityRef.current = resizeEntity;
    setResizingEntityRef.current = setResizingEntity;
    resizingEntityRef.current = resizingEntity;
  }, [resizeEntity, setResizingEntity, resizingEntity]);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;

      const addCols = Math.round(deltaX / resizeState.cellWidth);
      const addRows = Math.round(deltaY / resizeState.cellHeight);

      const newSize: EntitySize = {
        colSpan: Math.max(1, resizeState.startSize.colSpan + addCols),
        rowSpan: Math.max(1, resizeState.startSize.rowSpan + addRows),
      };

      setResizingEntityRef.current({ entityId: resizeState.entityId, previewSize: newSize });
    };

    const handleResizeEnd = () => {
      const resizeState = resizeStateRef.current;
      const currentResizingEntity = resizingEntityRef.current;

      if (!resizeState || !currentResizingEntity) {
        resizeStateRef.current = null;
        isResizingRef.current = false;
        setResizingEntityRef.current(null);
        return;
      }

      resizeEntityRef.current(resizeState.entityId, currentResizingEntity.previewSize);
      resizeStateRef.current = null;
      isResizingRef.current = false;
    };

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);

      // Clean up resize state if component unmounts during active resize
      if (resizeStateRef.current) {
        resizeStateRef.current = null;
        isResizingRef.current = false;
        setResizingEntityRef.current(null);
      }
    };
  }, []);

  return {
    isResizingRef,
    resizeStateRef,
    handleResizeStart,
  };
}
