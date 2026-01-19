import { useEffect, useState } from "react";
import DeskThing from "../Deskthing";

export const useDeskThingConnection = () => {
  const [isConnected, setIsConnected] = useState(false);

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

  return { isConnected };
};
