import { useMemo } from "react";
import { useEntityStore } from "../stores/entityStore";
import type { EntitySize } from "../../shared";

export const useGridLayout = () => {
  const layout = useEntityStore((state) => state.layout);

  const layoutItemsByPosition = useMemo(() => {
    const map = new Map<string, { entityId: string; size?: EntitySize }>();
    if (layout?.items) {
      for (const item of layout.items) {
        if (item.position) {
          const key = `${item.position.row}-${item.position.col}`;
          map.set(key, { entityId: item.entityId, size: item.size });
        }
      }
    }
    return map;
  }, [layout]);

  const spannedCells = useMemo(() => {
    const set = new Set<string>();
    if (layout?.items) {
      for (const item of layout.items) {
        if (item.position && item.size) {
          const { rowSpan, colSpan } = item.size;
          if (rowSpan > 1 || colSpan > 1) {
            for (let r = 0; r < rowSpan; r++) {
              for (let c = 0; c < colSpan; c++) {
                if (r === 0 && c === 0) continue;
                const key = `${item.position.row + r}-${item.position.col + c}`;
                set.add(key);
              }
            }
          }
        }
      }
    }
    return set;
  }, [layout]);

  return { layoutItemsByPosition, spannedCells };
};

export const sizeToString = (size?: EntitySize): `${number}x${number}` => {
  if (!size) return "1x1";
  return `${size.rowSpan}x${size.colSpan}`;
};
