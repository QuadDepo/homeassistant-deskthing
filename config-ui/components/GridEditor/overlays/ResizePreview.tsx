import { memo } from "react";
import { cx } from "class-variance-authority";
import { canResize } from "../../../../shared";
import type { EntitySize } from "../../../../shared";

export interface ResizePreviewProps {
  entityId: string;
  previewSize: EntitySize;
  gridConfig: { rows: number; cols: number };
  items: { entityId: string; position?: { row: number; col: number }; size?: EntitySize }[];
}

const ResizePreview = memo(function ResizePreview({
  entityId,
  previewSize,
  gridConfig,
  items,
}: ResizePreviewProps) {
  const item = items.find((i) => i.entityId === entityId);
  if (!item?.position) return null;

  const isValid = canResize(entityId, previewSize, items, gridConfig);

  // Show size indicator
  const sizeText = `${previewSize.rowSpan}x${previewSize.colSpan}`;

  return (
    <div className="absolute inset-4 pointer-events-none">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
          height: "100%",
        }}
      >
        {/* Spacer for cells before the entity */}
        {item.position.row > 0 || item.position.col > 0 ? (
          <div
            style={{
              gridColumn: `1 / ${item.position.col + 1}`,
              gridRow: `1 / ${item.position.row + 1}`,
            }}
          />
        ) : null}
        {/* Preview cell */}
        <div
          style={{
            gridColumnStart: item.position.col + 1,
            gridRowStart: item.position.row + 1,
            gridColumnEnd: `span ${previewSize.colSpan}`,
            gridRowEnd: `span ${previewSize.rowSpan}`,
          }}
          className={cx(
            "rounded-xl border-2 transition-all flex items-center justify-center",
            isValid
              ? "border-green-500/70 bg-green-500/20"
              : "border-red-500/70 bg-red-500/20"
          )}
        >
          <span
            className={cx(
              "text-sm font-bold",
              isValid ? "text-green-400" : "text-red-400"
            )}
          >
            {sizeText}
          </span>
        </div>
      </div>
    </div>
  );
});

export default ResizePreview;
