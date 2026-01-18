import { FC, useEffect, useState } from "react";
import { SocketData } from "@deskthing/types";
import DeskThing from "./Deskthing";
import { useEntityStore, useOrderedEntityIds } from "./stores/entityStore";
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

  const entityIds = useOrderedEntityIds();

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
      const layout = data.payload as { version: 1; items: Array<{ entityId: string }> } | undefined;
      if (layout) {
        console.log("[HA Client] Received layout config with", layout.items.length, "items");
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
        return <LightEntity key={entityId} entityId={entityId} />;
      // Future entity types will be added here
      default:
        return null;
    }
  };

  return (
    <div className="bg-black w-screen h-screen overflow-hidden">
      <Startup />
      <Grid>{entityIds.map(renderEntity)}</Grid>
    </div>
  );
};

export default App;
