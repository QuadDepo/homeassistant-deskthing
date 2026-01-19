import { FC, useEffect, useState, useMemo } from "react";
import { SocketData } from "@deskthing/types";
import DeskThing from "./Deskthing";
import { useEntityStore, useGridCells, useGridConfig } from "./stores/entityStore";
import { getEntityDomain } from "./utils/entityTypes";
import Grid from "./components/grid/Grid";
import LightEntity from "./components/entity/LightEntity";
import Startup from "./components/startup/Startup";
import { type HassEntities } from "home-assistant-js-websocket";
import type { EntitySize } from "../shared";

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
          size?: { rowSpan: number; colSpan: number };
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

  const layout = useEntityStore((state) => state.layout);

  // Build a map to quickly look up layout items by their primary position
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

  // Build a set of cells that are spanned by multi-cell entities (excluding primary position)
  const spannedCells = useMemo(() => {
    const set = new Set<string>();
    if (layout?.items) {
      for (const item of layout.items) {
        if (item.position && item.size) {
          const { rowSpan, colSpan } = item.size;
          if (rowSpan > 1 || colSpan > 1) {
            // Add all cells except the primary position
            for (let r = 0; r < rowSpan; r++) {
              for (let c = 0; c < colSpan; c++) {
                if (r === 0 && c === 0) continue; // Skip primary position
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

  // Convert EntitySize to size string for components (e.g., "2x3")
  const sizeToString = (size?: EntitySize): "1x1" | "1x2" | "2x1" | "2x2" | "3x3" | string => {
    if (!size) return "1x1";
    return `${size.rowSpan}x${size.colSpan}`;
  };

  const renderEntity = (entityId: string, size?: EntitySize) => {
    const domain = getEntityDomain(entityId);
    const sizeString = sizeToString(size);

    switch (domain) {
      case "light":
        return <LightEntity entityId={entityId} size={sizeString} />;
      // Future entity types will be added here
      default:
        return null;
    }
  };

  const renderCell = (cell: { entityId: string | null; row: number; col: number }) => {
    const posKey = `${cell.row}-${cell.col}`;

    // Skip cells that are spanned by multi-cell entities
    if (spannedCells.has(posKey)) {
      return null;
    }

    if (!cell.entityId) {
      // Empty cell - render placeholder to preserve grid position
      return <div key={`empty-${cell.row}-${cell.col}`} />;
    }

    // Get the layout item for this cell to check size
    const layoutItem = layoutItemsByPosition.get(posKey);
    const size = layoutItem?.size;

    // Apply grid spanning styles for multi-cell entities
    const spanStyle = size && (size.rowSpan > 1 || size.colSpan > 1)
      ? {
          gridRow: `span ${size.rowSpan}`,
          gridColumn: `span ${size.colSpan}`,
        }
      : undefined;

    return (
      <div key={`cell-${cell.row}-${cell.col}`} style={spanStyle}>
        {renderEntity(cell.entityId, size)}
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
