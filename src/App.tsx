import { FC, useEffect, useMemo, useState } from "react";
import { SocketData } from "@deskthing/types";
import DeskThing from "./Deskthing";
import { useSelector } from "@xstate/react";
import { entityManagerActor } from "./state/entityManagerMachine";
import Grid from "./components/grid/Grid";
import BaseEntity from "./components/entity/BaseEntity";
import Startup from "./components/startup/Startup";
import { type HassEntities } from "home-assistant-js-websocket";

console.log("[HA Client] App.tsx module loaded");

const App: FC = () => {
  const [isConnected, setIsConnected] = useState(false);

  // Get entity refs from the XState actor
  const entityRefs = useSelector(
    entityManagerActor,
    (state) => state.context.refs,
  );
  const entityIds = useMemo(() => Object.keys(entityRefs), [entityRefs]);

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
          "entities",
        );
        entityManagerActor.send({ type: "ENTITIES_CHANGE", entities });
      }
    };

    const off = DeskThing.on("homeassistant_data", onEntityData);

    // Request initial data
    console.log("[HA Client] Sending CLIENT_CONNECTED");
    DeskThing.send({
      type: "get",
      payload: { type: "CLIENT_CONNECTED" },
    });

    return () => off();
  }, [isConnected]);

  return (
    <div className="bg-black w-screen h-screen overflow-hidden">
      <Startup />
      <Grid>
        {entityIds.map((id) => (
          <BaseEntity key={id} id={id} machine={entityRefs[id]} />
        ))}
      </Grid>
    </div>
  );
};

export default App;
