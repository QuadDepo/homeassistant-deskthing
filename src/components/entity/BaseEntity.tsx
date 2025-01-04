import { cva, cx } from "class-variance-authority";
import { positionToTailwindClass } from "../../utils/positionToTailwindClass";
import { MouseEvent, useCallback, useMemo, useRef } from "react";
import { useSelector } from "@xstate/react";
import { mdiAlertCircle, mdiLightbulb } from "@mdi/js";
import Icon from "@mdi/react";
import getEntityType from "../../utils/getEntityType";
import Dialog, { DialogHandle } from "../dialog/Dialog";
import LightDialog from "../dialog/LightDialog";
import { LightEntityMachineActor } from "../../state/lightMachine";

type Size = "1x1" | "1x2" | "2x1" | "2x2" | "3x3";

type BaseEntitiesActors = LightEntityMachineActor;

type Props = {
	machine: BaseEntitiesActors;
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

const contentStyles = cva([
	"flex",
	"flex-col",
	"justify-between",
	"h-full",
	"p-3",
]);

const titleStyles = cva([
	"text-pretty",
	"text-sm",
	"text-ellipsis",
	"line-clamp-2",
]);

const BaseEntity = ({ machine, id, size = "1x1" }: Props) => {
	const entityType = getEntityType(id);
	const pressTimer = useRef<NodeJS.Timeout>();
	const dialogRef = useRef<DialogHandle>(null);
	const isLongPress = useRef<boolean>(false);

	const friendlyName = useSelector(
		machine,
		(snapshot) => snapshot.context.attributes.friendly_name
	);

	const isActive = useSelector(
		machine,
		(snapshot) => snapshot.context.state === "on"
	);
	const handlePressStart = useCallback(() => {
		isLongPress.current = false;
		pressTimer.current = setTimeout(() => {
			isLongPress.current = true;
			dialogRef.current?.open();
		}, 500);
	}, []);

	const handlePressEnd = useCallback(() => {
		if (pressTimer.current) {
			clearTimeout(pressTimer.current);
		}

		if (!isLongPress.current && !dialogRef.current?.element?.open) {
			machine.send({
				type: "TOGGLE",
			});
		}

		isLongPress.current = false;
	}, []);

	const handleContextMenu = useCallback((e: MouseEvent) => {
		e.preventDefault();
	}, []);

	const IconPath = useMemo(() => {
		switch (entityType) {
			case "light":
				return mdiLightbulb;
			default:
				return mdiAlertCircle;
		}
	}, [entityType, machine]);

	const DialogContent = useMemo(() => {
		switch (entityType) {
			case "light":
				return <LightDialog machine={machine} />;
			default:
				return null;
		}
	}, [machine]);

	return (
		<>
			<Dialog ref={dialogRef}>{DialogContent}</Dialog>
			<div
				className={cx(
					entityStyles({
						active: isActive,
					}),
					positionToTailwindClass(size)
				)}
				onMouseDown={handlePressStart}
				onMouseUp={handlePressEnd}
				onMouseLeave={handlePressEnd}
				onTouchStart={handlePressStart}
				onTouchEnd={handlePressEnd}
				onContextMenu={handleContextMenu}
			>
				<div className={contentStyles()}>
					<Icon path={IconPath} size={1.25} />
					<p className={titleStyles()}>{friendlyName}</p>
				</div>
			</div>
		</>
	);
};

export default BaseEntity;
