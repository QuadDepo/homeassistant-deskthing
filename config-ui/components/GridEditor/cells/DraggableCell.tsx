import { memo, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { cx } from "class-variance-authority";
import Icon from "@mdi/react";
import { mdiClose, mdiResize } from "@mdi/js";
import { DEFAULT_SIZE } from "../../../../shared";
import { domainIcons, defaultIcon } from "../../../utils/domainIcons";
import { cellStyles } from "../styles";
import type { EntityWithLayout } from "../../../stores/configStore";

export interface DraggableCellProps {
  row: number;
  col: number;
  entity: EntityWithLayout;
  removeFromGrid: (row: number, col: number) => void;
  onResizeStart: (entityId: string, e: React.MouseEvent) => void;
  isResizing: boolean;
}

const DraggableCell = memo(function DraggableCell({
  row,
  col,
  entity,
  removeFromGrid,
  onResizeStart,
  isResizing,
}: DraggableCellProps) {
  const id = `${row}-${col}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { row, col, entity },
    disabled: isResizing,
  });

  const iconPath = domainIcons[entity.domain] || defaultIcon;
  const size = entity.size || DEFAULT_SIZE;

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromGrid(row, col);
  }, [removeFromGrid, row, col]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onResizeStart(entity.entity_id, e);
  }, [entity.entity_id, onResizeStart]);

  // Stop pointer events to prevent @dnd-kit from triggering drag
  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  // Grid span styles - keep them even during drag to preserve grid layout
  // The cell becomes invisible (visibility: hidden) but keeps its space
  const spanStyle = {
    gridRow: `span ${size.rowSpan}`,
    gridColumn: `span ${size.colSpan}`,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={spanStyle}
      className={cx(cellStyles({ isEmpty: false, isDragging, isResizing }))}
    >
      {/* Remove button */}
      <button
        onClick={handleRemove}
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

      {/* Resize handle - bottom-right corner */}
      <div
        onMouseDown={handleResizeMouseDown}
        onPointerDown={handleResizePointerDown}
        className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/50 rounded-sm hover:bg-blue-500/80 flex items-center justify-center z-10"
        title="Drag to resize"
      >
        <Icon path={mdiResize} size={0.5} className="text-white" />
      </div>
    </div>
  );
});

export default DraggableCell;
