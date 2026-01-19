import { memo, useMemo } from "react";
import { cx } from "class-variance-authority";
import { canMove } from "../../../../shared";
import type { EntitySize } from "../../../../shared";
import { calculateDropPreviewState } from "../../../utils/gridUtils";

export interface DropPreviewProps {
  targetRow: number | null;
  targetCol: number | null;
  entityId: string;
  size: EntitySize;
  fromRow: number;
  fromCol: number;
  gridConfig: { rows: number; cols: number };
  items: { entityId: string; position?: { row: number; col: number }; size?: EntitySize }[];
}

const DropPreview = memo(function DropPreview({
  targetRow,
  targetCol,
  entityId,
  size,
  fromRow,
  fromCol,
  gridConfig,
  items,
}: DropPreviewProps) {
  const target = targetRow !== null && targetCol !== null
    ? { row: targetRow, col: targetCol }
    : null;

  const from = useMemo(() => ({ row: fromRow, col: fromCol }), [fromRow, fromCol]);

  const { snapped, isValid, isOverOriginal } = useMemo(
    () => calculateDropPreviewState(target, from, entityId, size, gridConfig, items, canMove),
    [target, from, entityId, size, gridConfig, items]
  );

  const gridStyle = useMemo(() => ({
    gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
  }), [gridConfig.cols, gridConfig.rows]);

  const originStyle = useMemo(() => ({
    gridColumn: `${fromCol + 1} / span ${size.colSpan}`,
    gridRow: `${fromRow + 1} / span ${size.rowSpan}`,
  }), [fromCol, fromRow, size.colSpan, size.rowSpan]);

  const previewStyle = useMemo(() => {
    if (!snapped) return null;
    return {
      gridColumn: `${snapped.col + 1} / span ${size.colSpan}`,
      gridRow: `${snapped.row + 1} / span ${size.rowSpan}`,
    };
  }, [snapped, size.colSpan, size.rowSpan]);

  return (
    <div className="absolute inset-4 pointer-events-none">
      <div className="relative grid gap-2 h-full" style={gridStyle}>
        {/* Original position indicator */}
        <div
          style={originStyle}
          className="rounded-xl border-2 border-dashed border-white/30 bg-white/5"
        />

        {/* Drop preview cell - only show if hovering and different from original */}
        {previewStyle && !isOverOriginal && (
          <div
            style={previewStyle}
            className={cx(
              "rounded-xl border-2 transition-all",
              isValid
                ? "border-green-500/70 bg-green-500/20"
                : "border-red-500/70 bg-red-500/20"
            )}
          />
        )}
      </div>
    </div>
  );
});

export default DropPreview;
