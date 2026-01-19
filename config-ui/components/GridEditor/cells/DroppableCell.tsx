import { memo, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cx } from "class-variance-authority";
import Icon from "@mdi/react";
import { mdiPlus } from "@mdi/js";
import { cellStyles } from "../styles";

export interface DroppableCellProps {
  row: number;
  col: number;
  onAddClick: (row: number, col: number) => void;
}

const DroppableCell = memo(function DroppableCell({ row, col, onAddClick }: DroppableCellProps) {
  const id = `${row}-${col}`;
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { row, col },
  });

  const handleClick = useCallback(() => {
    onAddClick(row, col);
  }, [onAddClick, row, col]);

  return (
    <button
      ref={setNodeRef}
      onClick={handleClick}
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
});

export default DroppableCell;
