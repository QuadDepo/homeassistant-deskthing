import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cva, cx } from "class-variance-authority";
import Icon from "@mdi/react";
import {
  mdiLightbulb,
  mdiToggleSwitch,
  mdiThermometer,
  mdiSpeaker,
  mdiBlindsHorizontal,
  mdiFan,
  mdiLock,
  mdiEye,
  mdiPlus,
  mdiClose,
} from "@mdi/js";
import EntityPicker from "./EntityPicker";
import { positionKey } from "../../shared";
import {
  useConfigStore,
  useGridConfig,
  useGridEntities,
  type EntityWithLayout,
} from "../stores/configStore";

const domainIcons: Record<string, string> = {
  light: mdiLightbulb,
  switch: mdiToggleSwitch,
  climate: mdiThermometer,
  media_player: mdiSpeaker,
  cover: mdiBlindsHorizontal,
  fan: mdiFan,
  lock: mdiLock,
  sensor: mdiEye,
  binary_sensor: mdiEye,
};

const cellStyles = cva(
  [
    "relative",
    "aspect-square",
    "rounded-xl",
    "border-2",
    "transition-all",
    "duration-200",
    "flex",
    "flex-col",
    "items-center",
    "justify-center",
    "p-2",
    "group",
  ],
  {
    variants: {
      isEmpty: {
        true: [
          "border-dashed",
          "border-white/20",
          "hover:border-white/40",
          "hover:bg-white/5",
          "cursor-pointer",
        ],
        false: [
          "border-solid",
          "border-blue-500/50",
          "bg-white/10",
          "cursor-grab",
        ],
      },
      isOver: {
        true: ["border-green-500/70", "bg-green-500/10"],
        false: [],
      },
      isDragging: {
        true: ["opacity-50"],
        false: [],
      },
    },
  }
);

interface DraggableCellProps {
  row: number;
  col: number;
  entity: EntityWithLayout;
  onRemove: () => void;
}

const DraggableCell = ({ row, col, entity, onRemove }: DraggableCellProps) => {
  const id = `${row}-${col}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { row, col, entity },
  });

  const iconPath = domainIcons[entity.domain] || mdiEye;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cx(cellStyles({ isEmpty: false, isDragging }))}
    >
      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/50 z-10"
        title="Remove from grid"
      >
        <Icon path={mdiClose} size={0.6} className="text-white" />
      </button>

      {/* Entity icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 mb-1">
        <Icon path={iconPath} size={1} className="text-white/80" />
      </div>

      {/* Entity name */}
      <div className="text-white text-xs font-medium text-center truncate w-full px-1">
        {entity.friendly_name}
      </div>
    </div>
  );
};

interface DroppableCellProps {
  row: number;
  col: number;
  onAdd: () => void;
}

const DroppableCell = ({ row, col, onAdd }: DroppableCellProps) => {
  const id = `${row}-${col}`;
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { row, col },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onAdd}
      className={cx(cellStyles({ isEmpty: true, isOver }))}
      title="Click to add entity or drag here"
    >
      <Icon
        path={mdiPlus}
        size={1.5}
        className={isOver ? "text-green-400" : "text-white/30 group-hover:text-white/50"}
      />
    </button>
  );
};

// Overlay shown while dragging
const DragOverlayContent = ({ entity }: { entity: EntityWithLayout }) => {
  const iconPath = domainIcons[entity.domain] || mdiEye;

  return (
    <div className={cx(cellStyles({ isEmpty: false }), "shadow-xl scale-105")}>
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 mb-1">
        <Icon path={iconPath} size={1} className="text-white/80" />
      </div>
      <div className="text-white text-xs font-medium text-center truncate w-full px-1">
        {entity.friendly_name}
      </div>
    </div>
  );
};

const GridEditor = () => {
  const gridConfig = useGridConfig();
  const gridEntities = useGridEntities();
  const placeEntity = useConfigStore((state) => state.placeEntity);
  const removeFromGrid = useConfigStore((state) => state.removeFromGrid);
  const moveEntity = useConfigStore((state) => state.moveEntity);

  // Drag state
  const [activeEntity, setActiveEntity] = useState<EntityWithLayout | null>(null);

  // Entity picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [targetCell, setTargetCell] = useState<{ row: number; col: number } | null>(null);

  // Configure sensors - require some movement before drag starts
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { entity } = event.active.data.current as { entity: EntityWithLayout };
    setActiveEntity(entity);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEntity(null);

    const { active, over } = event;
    if (!over) return;

    const fromData = active.data.current as { row: number; col: number };
    const toData = over.data.current as { row: number; col: number };

    // Don't move to same position
    if (fromData.row === toData.row && fromData.col === toData.col) return;

    moveEntity(fromData.row, fromData.col, toData.row, toData.col);
  };

  const handleAddClick = (row: number, col: number) => {
    setTargetCell({ row, col });
    setPickerOpen(true);
  };

  const handleSelectEntity = (entityId: string) => {
    if (targetCell) {
      placeEntity(entityId, targetCell.row, targetCell.col);
      setTargetCell(null);
    }
  };

  const handleClosePicker = () => {
    setPickerOpen(false);
    setTargetCell(null);
  };

  // Generate grid cells
  const cells = [];
  for (let row = 0; row < gridConfig.rows; row++) {
    for (let col = 0; col < gridConfig.cols; col++) {
      const key = positionKey(row, col);
      const entity = gridEntities.get(key) || null;

      if (entity) {
        cells.push(
          <DraggableCell
            key={key}
            row={row}
            col={col}
            entity={entity}
            onRemove={() => removeFromGrid(row, col)}
          />
        );
      } else {
        cells.push(
          <DroppableCell
            key={key}
            row={row}
            col={col}
            onAdd={() => handleAddClick(row, col)}
          />
        );
      }
    }
  }

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
          Drag to reorder, click empty cells to add
        </div>
      </div>

      {/* Grid with DnD context */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid gap-2 p-4 bg-white/5 rounded-2xl border border-white/10"
          style={{
            gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
          }}
        >
          {cells}
        </div>

        <DragOverlay>
          {activeEntity ? <DragOverlayContent entity={activeEntity} /> : null}
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
