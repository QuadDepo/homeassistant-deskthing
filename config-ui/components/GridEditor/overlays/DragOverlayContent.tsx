import { memo } from "react";
import { cx } from "class-variance-authority";
import Icon from "@mdi/react";
import { DEFAULT_SIZE } from "../../../../shared";
import { domainIcons, defaultIcon } from "../../../utils/domainIcons";
import { cellStyles } from "../styles";
import type { EntityWithLayout } from "../../../stores/configStore";

export interface DragOverlayContentProps {
  entity: EntityWithLayout;
  cellWidth: number;
  cellHeight: number;
}

const DragOverlayContent = memo(function DragOverlayContent({
  entity,
  cellWidth,
  cellHeight,
}: DragOverlayContentProps) {
  const iconPath = domainIcons[entity.domain] || defaultIcon;
  const size = entity.size || DEFAULT_SIZE;
  const gap = 8; // gap-2 = 8px

  // Calculate overlay dimensions based on entity size
  const width = cellWidth * size.colSpan + gap * (size.colSpan - 1);
  const height = cellHeight * size.rowSpan + gap * (size.rowSpan - 1);

  return (
    <div
      style={{ width, height }}
      className={cx(cellStyles({ isEmpty: false }), "shadow-xl scale-105")}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 mb-1">
        <Icon path={iconPath} size={1} className="text-white/80" />
      </div>
      <div className="text-white text-xs font-medium text-center truncate w-full px-1">
        {entity.friendly_name}
      </div>
    </div>
  );
});

export default DragOverlayContent;
