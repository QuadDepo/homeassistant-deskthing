import React, { useEffect, useMemo } from "react";
import { SocketData } from "deskthing-client/dist/types";
import Startup from "./components/startup/Startup";
import Grid from "./components/grid/Grid";
import { entityManagerActor } from "./state/entityManagerMachine";
import { useSelector } from "@xstate/react";
import BaseEntity from "./components/entity/BaseEntity";
import deskthing from "./Deskthing";

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
		<div className="bg-dark-grey w-screen h-screen">
			<Startup />
			<Grid>
				{entities.map(([id, entity]) => (
					<BaseEntity id={id} machine={entity} />
				))}
			</Grid>
		</div>
	);
};

export default App;
