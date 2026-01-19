import { useState, useCallback, useRef, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { DEFAULT_SIZE } from "../../../shared/types/grid";
import {
  useConfigStore,
  useGridConfig,
  useGridEntities,
  type EntityWithLayout,
} from "../../stores/configStore";
import { useResize } from "../../hooks/useResize";
import {
  calculateCellDimensions,
  calculateSnappedPosition,
  isValidMove,
  GRID_GAP,
} from "../../utils/gridUtils";

import EntityPicker from "../EntityPicker";
import GridCells from "./GridCells";
import DragOverlayContent from "./overlays/DragOverlayContent";
import ResizePreview from "./overlays/ResizePreview";
import DropPreview from "./overlays/DropPreview";

const DRAG_ACTIVATION_DISTANCE = 8;

type DragState =
  | { status: "idle" }
  | {
      status: "dragging";
      entity: EntityWithLayout;
      fromCell: { row: number; col: number };
      hoveredCell: { row: number; col: number } | null;
      cellDimensions: { width: number; height: number };
    };

const IDLE_DRAG_STATE: DragState = { status: "idle" };

const GridEditor = () => {
  const gridConfig = useGridConfig();
  const gridEntities = useGridEntities();
  const layout = useConfigStore((state) => state.layout);
  const placeEntity = useConfigStore((state) => state.placeEntity);
  const removeFromGrid = useConfigStore((state) => state.removeFromGrid);
  const moveEntity = useConfigStore((state) => state.moveEntity);
  const resizeEntity = useConfigStore((state) => state.resizeEntity);
  const resizingEntity = useConfigStore((state) => state.resizingEntity);
  const setResizingEntity = useConfigStore((state) => state.setResizingEntity);

  const gridRef = useRef<HTMLDivElement>(null);

  const dragStateRef = useRef<DragState>(IDLE_DRAG_STATE);

  // Minimal state for overlay rendering only (updates on drag start/end)
  const [dragOverlayData, setDragOverlayData] = useState<{
    entity: EntityWithLayout;
    cellDimensions: { width: number; height: number };
    fromCell: { row: number; col: number };
  } | null>(null);

  // Track hovered cell for drop preview (this needs state since it updates the preview)
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // Entity picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [targetCell, setTargetCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // Resize hook
  const { resizeStateRef, handleResizeStart } = useResize({
    gridRef,
    gridConfig,
    items: layout.items,
    resizeEntity,
    setResizingEntity,
    resizingEntity,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { entity, row, col } = event.active.data.current as {
        entity: EntityWithLayout;
        row: number;
        col: number;
      };

      const gridEl = gridRef.current;
      const cellDimensions = gridEl
        ? calculateCellDimensions(gridEl, gridConfig)
        : null;
      if (!cellDimensions) return;

      dragStateRef.current = {
        status: "dragging",
        entity,
        fromCell: { row, col },
        hoveredCell: null,
        cellDimensions,
      };

      setDragOverlayData({ entity, cellDimensions, fromCell: { row, col } });
    },
    [gridConfig],
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const dragState = dragStateRef.current;
    if (dragState.status !== "dragging") return;

    const { over } = event;
    if (over) {
      const toData = over.data.current as { row: number; col: number };
      dragState.hoveredCell = toData;
      setHoveredCell(toData);
    } else {
      dragState.hoveredCell = null;
      setHoveredCell(null);
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    dragStateRef.current = IDLE_DRAG_STATE;
    setDragOverlayData(null);
    setHoveredCell(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const dragState = dragStateRef.current;
      if (dragState.status !== "dragging") return;

      const draggedEntity = dragState.entity;

      dragStateRef.current = IDLE_DRAG_STATE;
      setDragOverlayData(null);
      setHoveredCell(null);

      const { active, over } = event;
      if (!over) return;

      const fromData = active.data.current as { row: number; col: number };
      const toData = over.data.current as { row: number; col: number };

      if (!isValidMove(fromData, toData)) return;

      const size = draggedEntity.size || DEFAULT_SIZE;
      const snapped = calculateSnappedPosition(
        toData.row,
        toData.col,
        size,
        gridConfig,
      );

      if (!isValidMove(fromData, snapped)) return;

      moveEntity(fromData.row, fromData.col, snapped.row, snapped.col);
    },
    [moveEntity, gridConfig],
  );

  const handleAddClick = useCallback((row: number, col: number) => {
    setTargetCell({ row, col });
    setPickerOpen(true);
  }, []);

  const handleSelectEntity = useCallback(
    (entityId: string) => {
      if (targetCell) {
        placeEntity(entityId, targetCell.row, targetCell.col);
        setTargetCell(null);
      }
    },
    [targetCell, placeEntity],
  );

  const handleClosePicker = useCallback(() => {
    setPickerOpen(false);
    setTargetCell(null);
  }, []);

  // Memoize resizing entity ID to prevent GridCells re-renders during resize preview updates
  const resizingEntityId = resizingEntity?.entityId ?? null;

  // Memoize grid style
  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
    }),
    [gridConfig.cols, gridConfig.rows],
  );

  return (
    <div className="space-y-4">
      {/* Grid preview label */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-white/70">Grid Layout</h2>
          <p className="text-xs text-white/40">
            {gridConfig.rows} rows × {gridConfig.cols} columns
          </p>
        </div>
        <div className="text-xs text-white/40">
          Drag to reorder, resize from corner handle
        </div>
      </div>

      {/* Grid with DnD context */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="relative">
          <div
            ref={gridRef}
            className="grid gap-2 p-4 bg-white/5 rounded-2xl border border-white/10"
            style={gridStyle}
          >
            <GridCells
              gridConfig={gridConfig}
              gridEntities={gridEntities}
              items={layout.items}
              removeFromGrid={removeFromGrid}
              onResizeStart={handleResizeStart}
              resizingEntityId={resizingEntityId}
              onAddClick={handleAddClick}
            />
          </div>

          {/* Resize preview overlay */}
          {resizingEntity && resizeStateRef.current && (
            <ResizePreview
              entityId={resizingEntity.entityId}
              previewSize={resizingEntity.previewSize}
              gridConfig={gridConfig}
              items={layout.items}
            />
          )}

          {/* Drop preview overlay for multi-cell entities */}
          {dragOverlayData && (
            <DropPreview
              targetRow={hoveredCell?.row ?? null}
              targetCol={hoveredCell?.col ?? null}
              entityId={dragOverlayData.entity.entity_id}
              size={dragOverlayData.entity.size || DEFAULT_SIZE}
              fromRow={dragOverlayData.fromCell.row}
              fromCol={dragOverlayData.fromCell.col}
              gridConfig={gridConfig}
              items={layout.items}
            />
          )}
        </div>

        <DragOverlay>
          {dragOverlayData ? (
            <DragOverlayContent
              entity={dragOverlayData.entity}
              cellWidth={dragOverlayData.cellDimensions.width}
              cellHeight={dragOverlayData.cellDimensions.height}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Helper text */}
      <p className="text-center text-xs text-white/40">
        This preview matches your DeskThing display layout
      </p>

      {/* Entity picker modal */}
      <EntityPicker
        isOpen={pickerOpen}
        onClose={handleClosePicker}
        onSelect={handleSelectEntity}
        targetRow={targetCell?.row ?? 0}
        targetCol={targetCell?.col ?? 0}
      />
    </div>
  );
};

export default GridEditor;
