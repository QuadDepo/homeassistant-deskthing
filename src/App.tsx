import { FC, useEffect, useState } from "react";
import { SocketData } from "@deskthing/types";
import DeskThing from "./Deskthing";
import { useEntityStore, useGridCells, useGridConfig } from "./stores/entityStore";
import { getEntityDomain } from "./utils/entityTypes";
import Grid from "./components/grid/Grid";
import LightEntity from "./components/entity/LightEntity";
import Startup from "./components/startup/Startup";
import { type HassEntities } from "home-assistant-js-websocket";

console.log("[HA Client] App.tsx module loaded");

const App: FC = () => {
  const [isConnected, setIsConnected] = useState(false);

  const updateEntities = useEntityStore((state) => state.updateEntities);
  const updateLayout = useEntityStore((state) => state.updateLayout);

  const gridCells = useGridCells();
  const gridConfig = useGridConfig();

  // Initialize DeskThing connection
  useEffect(() => {
    const initConnection = async () => {
      console.log("[HA Client] Checking DeskThing connection...");
      try {
        const manifest = await DeskThing.getManifest();
        if (manifest) {
          console.log("[HA Client] DeskThing connected");
          setIsConnected(true);
        } else {
          setTimeout(initConnection, 500);
        }
      } catch (error) {
        console.error("[HA Client] Connection error:", error);
        setTimeout(initConnection, 1000);
      }
    };

    initConnection();
  }, []);

  // Set up entity data listener after connection
  useEffect(() => {
    if (!isConnected) return;

    console.log("[HA Client] Setting up entity listener");

    const onEntityData = (data: SocketData) => {
      const entities = data.payload as HassEntities | undefined;
      if (entities) {
        console.log(
          "[HA Client] Received",
          Object.keys(entities).length,
          "entities"
        );
        updateEntities(entities);
      }
    };

    const onLayoutConfig = (data: SocketData) => {
      const rawLayout = data.payload as {
        version: 1;
        grid: { rows: number; cols: number };
        items: Array<{
          entityId: string;
          enabled?: boolean;
          position?: { row: number; col: number };
        }>;
      } | undefined;
      if (rawLayout) {
        // Ensure all items have `enabled` field (default to true if has position)
        const layout = {
          ...rawLayout,
          items: rawLayout.items.map((item) => ({
            ...item,
            enabled: item.enabled ?? !!item.position,
          })),
        };
        const positionedItems = layout.items.filter((item) => item.position).length;
        console.log(
          "[HA Client] Received layout config:",
          `${layout.grid?.rows || 3}x${layout.grid?.cols || 5} grid,`,
          `${positionedItems} positioned items`
        );
        updateLayout(layout);
      }
    };

    const offEntityData = DeskThing.on("homeassistant_data", onEntityData);
    const offLayoutConfig = DeskThing.on("LAYOUT_CONFIG", onLayoutConfig);

    // Request initial data
    console.log("[HA Client] Sending CLIENT_CONNECTED");
    DeskThing.send({
      type: "get",
      payload: { type: "CLIENT_CONNECTED" },
    });

    return () => {
      offEntityData();
      offLayoutConfig();
    };
  }, [isConnected, updateEntities, updateLayout]);

  const renderEntity = (entityId: string) => {
    const domain = getEntityDomain(entityId);

    switch (domain) {
      case "light":
        return <LightEntity entityId={entityId} />;
      // Future entity types will be added here
      default:
        return null;
    }
  };

  const renderCell = (cell: { entityId: string | null; row: number; col: number }) => {
    if (!cell.entityId) {
      // Empty cell - render placeholder to preserve grid position
      return <div key={`empty-${cell.row}-${cell.col}`} />;
    }
    return (
      <div key={`cell-${cell.row}-${cell.col}`}>
        {renderEntity(cell.entityId)}
      </div>
    );
  };

  return (
    <div className="bg-black w-screen h-screen overflow-hidden">
      <Startup />
      <Grid rows={gridConfig.rows} cols={gridConfig.cols}>
        {gridCells.map(renderCell)}
      </Grid>
    </div>
  );
};

export default App;
