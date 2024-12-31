import { useSelector } from "@xstate/react";
import { EntityMachineActor } from "../../state/entityManagerMachine";
import Icon from "@mdi/react";
import { mdiLightbulb } from "@mdi/js";

type Props = {
	machine: EntityMachineActor;
};

const LightEntity = ({ machine }: Props) => {
	const friendlyName = useSelector(
		machine,
		(snapshot) => snapshot.context.attributes.friendly_name
	);

	return (
		<div className="flex flex-col justify-between h-full p-3">
			<Icon path={mdiLightbulb} size={1.5} />
			<p>{friendlyName}</p>
		</div>
	);
};

export default LightEntity;
