import { useEffect } from "react";
import { SocketData } from "@deskthing/types";
import DeskThing from "../Deskthing";
import { useEntityStore } from "../stores/entityStore";
import type { HassEntities } from "home-assistant-js-websocket";

type RawLayoutConfig = {
  version: 1;
  grid: { rows: number; cols: number };
  items: Array<{
    entityId: string;
    enabled?: boolean;
    position?: { row: number; col: number };
    size?: { rowSpan: number; colSpan: number };
  }>;
};

const transformLayout = (rawLayout: RawLayoutConfig) => ({
  ...rawLayout,
  items: rawLayout.items.map((item) => ({
    ...item,
    enabled: item.enabled ?? !!item.position,
  })),
});

export const useEntityData = (isConnected: boolean) => {
  const updateEntities = useEntityStore((state) => state.updateEntities);
  const updateLayout = useEntityStore((state) => state.updateLayout);

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
      const rawLayout = data.payload as RawLayoutConfig | undefined;
      if (rawLayout) {
        const layout = transformLayout(rawLayout);
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
};
