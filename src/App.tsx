import React, { useEffect, useMemo } from "react";
import { DeskThing } from "deskthing-client";
import { SocketData } from "deskthing-client/dist/types";
import Startup from "./components/startup/Startup";
import Grid from "./components/grid/Grid";
import { entityManagerActor } from "./state/entityManagerMachine";
import { useSelector } from "@xstate/react";
import Entity from "./components/entity/Entity";

const deskthing = DeskThing.getInstance();

const App: React.FC = () => {
	const refs = useSelector(
		entityManagerActor,
		(snapshot) => snapshot.context.refs
	);

	useEffect(() => {
		const onAppData = async (data: SocketData) => {
			switch (data.type) {
				case "homeassistant_data":
					entityManagerActor.send({
						type: "ENTITIES_CHANGE",
						entities: data.payload,
					});
					break;
				default:
					console.log(`Unknown data type recieved from server ${data.type}`);
			}
		};

		deskthing.on("homeassistant", onAppData);
	}, []);

	const entities = useMemo(() => {
		return Object.entries(refs);
	}, [refs]);

	return (
		<div className="bg-slate-800 w-screen h-screen">
			<Startup />
			<Grid>
				{entities.map(([id, entity]) => (
					<Entity id={id} machine={entity} />
				))}
			</Grid>
		</div>
	);
};

export default App;
