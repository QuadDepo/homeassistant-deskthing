import { useActorRef, useSelector } from "@xstate/react";
import DeskThing from "../../Deskthing";
import { SocketData } from "@deskthing/types";
import { useEffect, useMemo } from "react";
import startupMachine from "../../state/startupMachine";
import HomeAssistantLogo from "../../assets/homeassistant.svg";

console.log("[HA Client] Startup.tsx module loaded");

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
    const onServerStatus = (data: SocketData) => {
      const status = data.payload as string;
      console.log("[Startup] Received SERVER_STATUS:", status);
      startupRef.send({ type: "UPDATE_STATUS", status });
    };

    // Register listener immediately (works before connection)
    const off = DeskThing.on("SERVER_STATUS", onServerStatus);

    // Request status once connected
    DeskThing.getManifest().then(() => {
      console.log("[Startup] Connected, requesting status");
      DeskThing.send({ type: "get", request: "status" });
    });

    return off;
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
    <div className="absolute w-full text-white h-full gap-10 flex flex-col justify-center items-center bg-black z-50">
      <img src={HomeAssistantLogo} className="w-1/2" />
      <p className="text-xl">{getStatusText}</p>
      <p className="text-xs text-gray-500">Status: {startupStatus}</p>
    </div>
  );
};

export default Startup;
