import { useCallback, useEffect, useRef, RefObject } from "react";
import type {
  EntitySize,
  GridConfig,
  LayoutItem,
} from "../../shared/types/grid";
import { DEFAULT_SIZE } from "../../shared/types/grid";
import { GRID_GAP } from "../utils/gridUtils";
import { useLatest } from "./useLatest";

type ResizeState =
  | { status: "idle" }
  | {
      status: "resizing";
      entityId: string;
      startX: number;
      startY: number;
      startSize: EntitySize;
      cellWidth: number;
      cellHeight: number;
    };

const IDLE_RESIZE_STATE: ResizeState = { status: "idle" };

interface UseResizeOptions {
  gridRef: RefObject<HTMLDivElement | null>;
  gridConfig: GridConfig;
  items: LayoutItem[];
  resizeEntity: (entityId: string, newSize: EntitySize) => void;
  setResizingEntity: (
    value: { entityId: string; previewSize: EntitySize } | null,
  ) => void;
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
  const resizeStateRef = useRef<ResizeState>(IDLE_RESIZE_STATE);

  const handleResizeStart = useCallback(
    (entityId: string, e: React.MouseEvent) => {
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
        status: "resizing",
        entityId,
        startX: e.clientX,
        startY: e.clientY,
        startSize: item.size || DEFAULT_SIZE,
        cellWidth,
        cellHeight,
      };
    },
    [items, gridConfig, gridRef],
  );

  const resizeEntityRef = useLatest(resizeEntity);
  const setResizingEntityRef = useLatest(setResizingEntity);
  const resizingEntityRef = useLatest(resizingEntity);

  const itemsRef = useLatest(items);
  const gridConfigRef = useLatest(gridConfig);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      const resizeState = resizeStateRef.current;
      if (resizeState.status !== "resizing") return;

      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;

      // Add a 35% bias in the drag direction for more responsive resizing
      const bias = 0.35;

      const biasX =
        deltaX > 0
          ? resizeState.cellWidth * bias
          : deltaX < 0
            ? -resizeState.cellWidth * bias
            : 0;
      const biasY =
        deltaY > 0
          ? resizeState.cellHeight * bias
          : deltaY < 0
            ? -resizeState.cellHeight * bias
            : 0;

      const addCols = Math.round((deltaX + biasX) / resizeState.cellWidth);
      const addRows = Math.round((deltaY + biasY) / resizeState.cellHeight);

      let newColSpan = Math.max(1, resizeState.startSize.colSpan + addCols);
      let newRowSpan = Math.max(1, resizeState.startSize.rowSpan + addRows);

      const currentItem = itemsRef.current.find(
        (i) => i.entityId === resizeState.entityId,
      );
      if (currentItem?.position) {
        const maxColSpan =
          gridConfigRef.current.cols - currentItem.position.col;
        const maxRowSpan =
          gridConfigRef.current.rows - currentItem.position.row;
        newColSpan = Math.min(newColSpan, maxColSpan);
        newRowSpan = Math.min(newRowSpan, maxRowSpan);
      }

      const newSize: EntitySize = {
        colSpan: newColSpan,
        rowSpan: newRowSpan,
      };

      setResizingEntityRef.current({
        entityId: resizeState.entityId,
        previewSize: newSize,
      });
    };

    const handleResizeEnd = () => {
      const resizeState = resizeStateRef.current;
      const currentResizingEntity = resizingEntityRef.current;

      if (resizeState.status !== "resizing" || !currentResizingEntity) {
        resizeStateRef.current = IDLE_RESIZE_STATE;
        setResizingEntityRef.current(null);
        return;
      }

      resizeEntityRef.current(
        resizeState.entityId,
        currentResizingEntity.previewSize,
      );
      resizeStateRef.current = IDLE_RESIZE_STATE;
    };

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);

      if (resizeStateRef.current.status === "resizing") {
        resizeStateRef.current = IDLE_RESIZE_STATE;
        setResizingEntityRef.current(null);
      }
    };
  }, []);

  return {
    resizeStateRef,
    handleResizeStart,
  };
}
