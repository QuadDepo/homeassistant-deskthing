import React, { useEffect, useMemo } from "react";
import { DeskThing } from "deskthing-client";
import { SocketData } from "deskthing-client/dist/types";
import { useActorRef, useSelector } from "@xstate/react";
import entityManagerMachine, {
	EntityMachineActor,
} from "./state/entityManagerMachine";

import { createBrowserInspector } from "@statelyai/inspect";

const { inspect } = createBrowserInspector();
const deskthing = DeskThing.getInstance();

deskthing.send({
	type: "get",
	request: "initial_entities",
});

const Entity = ({ id, actor }: { id: string; actor: EntityMachineActor }) => {
	const entityState = useSelector(actor, (snapshot) => snapshot.context?.state);

	return (
		<div>
			{id} - {entityState}
		</div>
	);
};

const App: React.FC = () => {
	const actorRef = useActorRef(entityManagerMachine, {
		inspect: import.meta.env.DEV ? inspect : undefined,
	});

	const refs = useSelector(actorRef, (snapshot) => snapshot.context.refs);

	useEffect(() => {
		const onAppData = async (data: SocketData) => {
			switch (data.type) {
				case "homeassistant_data":
					actorRef.send({
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
			{entities.map(([entityId, actor]) => (
				<Entity id={entityId} key={entityId} actor={actor} />
			))}
		</div>
	);
};

export default App;
