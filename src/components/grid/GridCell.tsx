import { memo } from "react";
import type { GridCellData } from "../../../shared";
import type { EntitySize } from "../../../shared";
import EntityRenderer from "./EntityRenderer";

type Props = {
  cell: GridCellData;
  layoutItem?: { entityId: string; size?: EntitySize };
  isSpanned: boolean;
};

const GridCell = memo(({ cell, layoutItem, isSpanned }: Props) => {
  if (isSpanned) {
    return null;
  }

  if (!cell.entityId) {
    return <div key={`empty-${cell.row}-${cell.col}`} />;
  }

  const size = layoutItem?.size;
  const spanStyle =
    size && (size.rowSpan > 1 || size.colSpan > 1)
      ? {
          gridRow: `span ${size.rowSpan}`,
          gridColumn: `span ${size.colSpan}`,
        }
      : undefined;

  return (
    <div key={`cell-${cell.row}-${cell.col}`} style={spanStyle}>
      <EntityRenderer entityId={cell.entityId} size={size} />
    </div>
  );
});

GridCell.displayName = "GridCell";

export default GridCell;
