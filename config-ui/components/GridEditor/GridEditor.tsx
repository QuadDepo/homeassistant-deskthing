import { useCallback, useRef, useMemo } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { DEFAULT_SIZE } from "../../../shared/types/grid";
import type { GridPosition } from "../../../shared/types/grid";
import { useConfigStore, useGridConfig, useGridEntities } from "../../stores/configStore";
import { useResize } from "../../hooks/useResize";
import { useDrag } from "../../hooks/useDrag";
import EntityPicker, { type EntityPickerRef } from "../EntityPicker";
import GridCells from "./GridCells";
import DragGhost from "./overlays/DragGhost";
import ResizePreview from "./overlays/ResizePreview";
import DropPreview from "./overlays/DropPreview";

const DRAG_ACTIVATION_DISTANCE = 8;

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

  const { overlayData, hoveredCell, handlers: dragHandlers } = useDrag({
    gridRef,
    gridConfig,
    moveEntity,
  });

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

  const pickerRef = useRef<EntityPickerRef>(null);

  const handleAddClick = useCallback((row: number, col: number) => {
    pickerRef.current?.open(row, col);
  }, []);

  const handleEntitySelected = useCallback(
    (entityId: string, position: GridPosition) => {
      placeEntity(entityId, position.row, position.col);
    },
    [placeEntity]
  );

  const resizingEntityId = resizingEntity?.entityId ?? null;

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
        onDragStart={dragHandlers.onDragStart}
        onDragOver={dragHandlers.onDragOver}
        onDragEnd={dragHandlers.onDragEnd}
        onDragCancel={dragHandlers.onDragCancel}
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
          {overlayData && (
            <DropPreview
              targetRow={hoveredCell?.row ?? null}
              targetCol={hoveredCell?.col ?? null}
              entityId={overlayData.entity.entity_id}
              size={overlayData.entity.size || DEFAULT_SIZE}
              fromRow={overlayData.fromCell.row}
              fromCol={overlayData.fromCell.col}
              gridConfig={gridConfig}
              items={layout.items}
            />
          )}
        </div>

        <DragOverlay>
          {overlayData ? (
            <DragGhost
              entity={overlayData.entity}
              cellWidth={overlayData.cellDimensions.width}
              cellHeight={overlayData.cellDimensions.height}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Helper text */}
      <p className="text-center text-xs text-white/40">
        This preview matches your DeskThing display layout
      </p>

      {/* Entity picker modal */}
      <EntityPicker ref={pickerRef} onSelect={handleEntitySelected} />
    </div>
  );
};

export default GridEditor;
