import { useActorRef, useSelector } from "@xstate/react";
import { DeskThing, SocketData } from "deskthing-client";
import { useEffect, useMemo } from "react";
import startupMachine from "../../state/startupMachine";

import HomeAssistantLogo from "./assets/homeassistant.svg";

const deskthing = DeskThing.getInstance();

const Startup = () => {
	const startupRef = useActorRef(startupMachine);

	const startupStatus = useSelector(
		startupRef,
		(snapshot) => snapshot.context.status
	);

	const isReady = useSelector(startupRef, (snapshot) =>
		snapshot.matches("started")
	);

	useEffect(() => {
		const onAppData = async (data: SocketData) => {
			switch (data.type) {
				case "SERVER_STATUS":
					startupRef.send({
						type: "UPDATE_STATUS",
						status: data.payload,
					});
					break;
				default:
					console.log(`Unknown data type recieved from server ${data.type}`);
			}
		};

		deskthing.on("homeassistant", onAppData);
	}, []);

	const getStatusText = useMemo(() => {
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
