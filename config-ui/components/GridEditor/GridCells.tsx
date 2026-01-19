import { memo, useMemo, type RefObject } from "react";
import type { LayoutItem } from "../../../shared/types/grid";
import { positionKey, buildOccupancyMap } from "../../../shared/utils/grid";
import type { EntityWithLayout } from "../../stores/configStore";
import EntityCell from "./cells/EntityCell";
import EmptyCell from "./cells/EmptyCell";

interface GridCellsProps {
  gridConfig: { rows: number; cols: number };
  gridEntities: Map<string, EntityWithLayout>;
  items: LayoutItem[];
  removeFromGrid: (row: number, col: number) => void;
  onResizeStart: (entityId: string, e: React.MouseEvent) => void;
  resizingEntityId: string | null;
  onAddClick: (row: number, col: number) => void;
}

/**
 * Memoized grid cells component.
 * Only re-renders when grid structure or entities change, not during drag operations.
 */
const GridCells = memo(function GridCells({
  gridConfig,
  gridEntities,
  items,
  removeFromGrid,
  onResizeStart,
  resizingEntityId,
  onAddClick,
}: GridCellsProps) {
  const cells = useMemo(() => {
    const occupancyMap = buildOccupancyMap(items);
    const result: JSX.Element[] = [];

    for (let row = 0; row < gridConfig.rows; row++) {
      for (let col = 0; col < gridConfig.cols; col++) {
        const key = positionKey(row, col);
        const occupyingEntityId = occupancyMap.get(key);

        if (occupyingEntityId) {
          // Check if this is the primary cell (top-left) of the entity
          const entity = gridEntities.get(key);

          if (
            entity &&
            entity.position?.row === row &&
            entity.position?.col === col
          ) {
            result.push(
              <EntityCell
                key={key}
                row={row}
                col={col}
                entity={entity}
                removeFromGrid={removeFromGrid}
                onResizeStart={onResizeStart}
                isResizing={resizingEntityId === entity.entity_id}
              />,
            );
          }
          // Skip secondary cells - they're visually covered by the spanning entity
        } else {
          result.push(
            <EmptyCell key={key} row={row} col={col} onAddClick={onAddClick} />,
          );
        }
      }
    }

    return result;
  }, [
    gridConfig,
    gridEntities,
    items,
    removeFromGrid,
    onResizeStart,
    resizingEntityId,
    onAddClick,
  ]);

  return <>{cells}</>;
});

export default GridCells;
