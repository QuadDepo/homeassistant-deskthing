import { useCallback, useState } from "react";
import type { GridPosition } from "../../shared/types/grid";

interface UseEntityPickerOptions {
  onEntitySelected: (entityId: string, position: GridPosition) => void;
}

export function useEntityPicker({ onEntitySelected }: UseEntityPickerOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetCell, setTargetCell] = useState<GridPosition | null>(null);

  const openPicker = useCallback((row: number, col: number) => {
    setTargetCell({ row, col });
    setIsOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    setIsOpen(false);
    setTargetCell(null);
  }, []);

  const selectEntity = useCallback(
    (entityId: string) => {
      if (targetCell) {
        onEntitySelected(entityId, targetCell);
        setTargetCell(null);
      }
    },
    [targetCell, onEntitySelected]
  );

  return {
    isOpen,
    targetCell,
    openPicker,
    closePicker,
    selectEntity,
  };
}
