import React, { useEffect, useMemo } from "react";
import { SocketData } from "@deskthing/types";
import Startup from "./components/startup/Startup";
import Grid from "./components/grid/Grid";
import { entityManagerActor } from "./state/entityManagerMachine";
import { useSelector } from "@xstate/react";
import BaseEntity from "./components/entity/BaseEntity";
import { DeskThing } from "@deskthing/client";

const App: React.FC = () => {
  const refs = useSelector(
    entityManagerActor,
    (snapshot) => snapshot.context.refs,
  );

  useEffect(() => {
    const onEntityData = (data: SocketData) => {
      console.log("Received homeassistant_data:", data);
      entityManagerActor.send({
        type: "ENTITIES_CHANGE",
        entities: data.payload,
      });
    };

    const off = DeskThing.on("homeassistant_data", onEntityData);

    // Notify server that client is ready - this triggers entity data to be sent
    DeskThing.send({
      type: "get",
      payload: {
        type: "CLIENT_CONNECTED",
      },
    });

    return () => {
      off();
    };
  }, []);

  const entities = useMemo(() => {
    return Object.entries(refs);
  }, [refs]);

  return (
    <div className="bg-dark-grey w-screen h-screen">
      <Startup />
      <Grid>
        {entities.map(([id, entity]) => (
          <BaseEntity key={id} id={id} machine={entity} />
        ))}
      </Grid>
    </div>
  );
};

export default App;
