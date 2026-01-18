import { useActorRef, useSelector } from "@xstate/react";
import { DeskThing } from "@deskthing/client";
import { SocketData } from "@deskthing/types";
import { useEffect, useMemo } from "react";
import startupMachine from "../../state/startupMachine";
import HomeAssistantLogo from "../../assets/homeassistant.svg";

const Startup = () => {
  const startupRef = useActorRef(startupMachine);

  const startupStatus = useSelector(
    startupRef,
    (snapshot) => snapshot.context.status,
  );

  const isReady = useSelector(startupRef, (snapshot) =>
    snapshot.matches("started"),
  );

  useEffect(() => {
    const onServerStatus = async (data: SocketData) => {
      console.log("Received SERVER_STATUS:", data);
      startupRef.send({
        type: "UPDATE_STATUS",
        status: data.payload,
      });
    };

    // Request current status from server
    DeskThing.send({ type: "get", request: "status" });

    const off = DeskThing.on("SERVER_STATUS", onServerStatus);

    return () => {
      off();
    };
  }, [startupRef]);

  const getStatusText = useMemo(() => {
    console.log("Startup status:", startupStatus);
    switch (startupStatus) {
      case "config":
        return "Please setup your settings";
      case "entities":
        return "Please select your entities";
      default:
        return "Loading...";
    }
  }, [startupStatus]);

  if (isReady) {
    return null;
  }

  return (
    <div className="absolute w-full text-white h-full gap-10 flex flex-col justify-center items-center">
      <img src={HomeAssistantLogo} className="w-1/2" />
      <p className="text-xl">{getStatusText}</p>
    </div>
  );
};

export default Startup;
