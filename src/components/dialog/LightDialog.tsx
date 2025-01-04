import { useCallback, useMemo } from "react";
import { LightEntityMachineActor } from "../../state/lightMachine";
import Slider from "../slider/Slider";
import { useSelector } from "@xstate/react";

type Props = {
	machine: LightEntityMachineActor;
};

const LightDialog = ({ machine }: Props) => {
	const valueFromContext = useSelector(
		machine,
		(snapshot) => snapshot.context.attributes.brightness
	);

	const colorFromContext = useSelector(
		machine,
		(snapshot) => snapshot.context.attributes.rgb_color
	);

	const value = useMemo(() => {
		return valueFromContext || 0;
	}, [valueFromContext]);

	const color = useMemo(() => {
		return colorFromContext || [70, 70, 70];
	}, [colorFromContext]);

	const isDisabled = useMemo(() => {
		return !colorFromContext && !valueFromContext;
	}, [colorFromContext, valueFromContext]);

	const handleSliderOnChange = useCallback((value: number) => {
		console.log("context", machine.getSnapshot());

		machine.send({
			type: "BRIGHTNESS",
			brightness: value,
		});
	}, []);

	return (
		<div className="bg-dark-grey flex-col flex w-full h-full z-40 rounded-lg p-10">
			<Slider
				min={1}
				max={255}
				value={value}
				onDragEnd={handleSliderOnChange}
				color={color}
				disabled={isDisabled}
			/>
		</div>
	);
};

export default LightDialog;
