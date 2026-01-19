import { FC } from "react";
import { useGridCells, useGridConfig } from "./stores/entityStore";
import Grid from "./components/grid/Grid";
import GridCell from "./components/grid/GridCell";
import Startup from "./components/startup/Startup";
import { useDeskThingConnection } from "./hooks/useDeskThingConnection";
import { useEntityData } from "./hooks/useEntityData";
import { useGridLayout } from "./hooks/useGridLayout";

console.log("[HA Client] App.tsx module loaded");

const App: FC = () => {
  const { isConnected } = useDeskThingConnection();
  useEntityData(isConnected);

  const gridCells = useGridCells();
  const gridConfig = useGridConfig();
  const { layoutItemsByPosition, spannedCells } = useGridLayout();

  return (
    <div className="bg-black w-screen h-screen overflow-hidden">
      <Startup />
      <Grid rows={gridConfig.rows} cols={gridConfig.cols}>
        {gridCells.map((cell) => {
          const posKey = `${cell.row}-${cell.col}`;
          return (
            <GridCell
              key={posKey}
              cell={cell}
              layoutItem={layoutItemsByPosition.get(posKey)}
              isSpanned={spannedCells.has(posKey)}
            />
          );
        })}
      </Grid>
    </div>
  );
};

export default App;
