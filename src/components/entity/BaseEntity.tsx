import { cva, cx } from "class-variance-authority";
import { EntityMachineActor } from "../../state/entityManagerMachine";
import { positionToTailwindClass } from "../../utils/positionToTailwindClass";
import { useCallback, useMemo } from "react";
import { useSelector } from "@xstate/react";
import { mdiAlertCircle, mdiLightbulb } from "@mdi/js";
import Icon from "@mdi/react";
import getEntityType from "../../utils/getEntityType";

type Size = "1x1" | "1x2" | "2x1" | "2x2" | "3x3";

type Props = {
	machine: EntityMachineActor;
	id: string;
	size?: Size;
};

const entityStyles = cva(["rounded-xl", "bg-white/70"], {
	variants: {
		active: {
			true: ["opacity-100"],
			false: ["opacity-20"],
		},
	},
});

const BaseEntity = ({ machine, id, size = "1x1" }: Props) => {
	const entityType = getEntityType(id);

	const friendlyName = useSelector(
		machine,
		(snapshot) => snapshot.context.attributes.friendly_name
	);

	const isActive = useSelector(
		machine,
		(snapshot) => snapshot.context.state === "on"
	);

	const handleOnClick = useCallback(() => {
		machine.send({
			type: "ACTION",
		});
	}, []);

	const IconPath = useMemo(() => {
		switch (entityType) {
			case "light":
				return mdiLightbulb;
			default:
				return mdiAlertCircle;
		}
	}, [entityType]);

	return (
		<div
			className={cx(
				entityStyles({
					active: isActive,
				}),
				positionToTailwindClass(size)
			)}
		>
			<div
				onClick={handleOnClick}
				className="flex flex-col justify-between h-full p-3"
			>
				<Icon path={IconPath} size={1.5} />
				<p>{friendlyName}</p>
			</div>
		</div>
	);
};

export default BaseEntity;
