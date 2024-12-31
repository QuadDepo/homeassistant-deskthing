import { cva, cx } from "class-variance-authority";
import { EntityMachineActor } from "../../state/entityManagerMachine";
import { positionToTailwindClass } from "../../utils/positionToTailwindClass";
import { useMemo } from "react";
import LightEntity from "./LightEntity";

type Size = "1x1" | "1x2" | "2x1" | "2x2" | "3x3";

type Props = {
	machine: EntityMachineActor;
	id: string;
	size?: Size;
};

const entityStyles = cva(["rounded-xl bg-slate-200/10"]);

const Entity = ({ machine, id, size = "1x1" }: Props) => {
	const entityContent = useMemo(() => {
		if (id.startsWith("light.")) {
			return <LightEntity machine={machine} />;
		}
	}, [machine, id]);

	return (
		<div className={cx(entityStyles(), positionToTailwindClass(size))}>
			{entityContent}
		</div>
	);
};

export default Entity;
