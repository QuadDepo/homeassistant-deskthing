import React, { useCallback, useRef, useEffect, useMemo } from "react";
import { cva } from "class-variance-authority";
import { useDebouncedCallback } from "use-debounce";

type Orientation = "vertical" | "horizontal";

type SliderProps = {
	orientation?: Orientation;
	value?: number;
	onChange?: (value: number) => void;
	onDragEnd?: (value: number) => void;
	color: [number, number, number];
	min?: number;
	max?: number;
	disabled?: boolean;
};

interface SliderCSSVars extends React.CSSProperties {
	"--value": string;
	"--slider-thickness": string;
	"--handle-size": string;
	"--handle-margin": string;
	"--slider-size": string;
}

const sliderStyles = cva("flex shrink-0 overflow-hidden bg-white rounded-2xl", {
	variants: {
		orientation: {
			vertical: "flex-col w-32 h-full",
			horizontal: "flex-row-reverse w-full h-32",
		},
		disabled: {
			true: ["grayscale", "opacity-20"],
		},
	},
	defaultVariants: { orientation: "vertical" },
});

const trackStyles = cva("relative cursor-pointer touch-none", {
	variants: {
		orientation: {
			vertical: "w-32 h-full",
			horizontal: "w-full h-32",
		},
	},
	defaultVariants: { orientation: "vertical" },
});

const handleStyles = cva("absolute flex items-center justify-center", {
	variants: {
		orientation: {
			vertical: "w-full top-2",
			horizontal: "h-full right-2",
		},
	},
	defaultVariants: { orientation: "vertical" },
});

const handleBarStyles = cva("rounded-full bg-white", {
	variants: {
		orientation: {
			vertical: "w-1/2 h-1",
			horizontal: "h-1/2 w-1",
		},
	},
	defaultVariants: { orientation: "vertical" },
});

const Slider: React.FC<SliderProps> = ({
	orientation = "vertical",
	value = 0.5,
	min = 0,
	max = 1,
	disabled,
	color,
	onChange,
	onDragEnd,
}) => {
	const isDragging = useRef<boolean>(false);
	const isScrolling = useRef<boolean>(false);
	const sliderRef = useRef<HTMLDivElement>(null);
	const progressRef = useRef<HTMLDivElement>(null);
	const rafId = useRef<number | null>(null);
	const valueRef = useRef<number>(value);
	const lastInteractionTime = useRef<number>(0);

	const normalizeValue = useCallback(
		(value: number): number => {
			return (value - min) / (max - min);
		},
		[min, max]
	);

	const denormalizeValue = useCallback(
		(normalized: number): number => {
			return normalized * (max - min) + min;
		},
		[min, max]
	);

	const updateStyles = useCallback(
		(newValue: number) => {
			if (rafId.current) cancelAnimationFrame(rafId.current);

			rafId.current = requestAnimationFrame(() => {
				if (progressRef.current) {
					const normalizedValue = normalizeValue(newValue);
					progressRef.current.style.setProperty(
						"--value",
						normalizedValue.toString()
					);
				}
			});
		},
		[normalizeValue]
	);

	const getBackgroundColor = useCallback(
		(opacity = 1) => {
			return `rgba(${[...color, opacity].join(", ")})`;
		},
		[color]
	);

	const getPosition = useCallback(
		(event: React.MouseEvent | React.TouchEvent): number => {
			if (!sliderRef.current) return min;

			const rect = sliderRef.current.getBoundingClientRect();
			const { clientX, clientY } =
				"touches" in event ? event.touches[0] : event;

			let normalizedValue: number;
			if (orientation === "vertical") {
				const y = clientY - rect.top;
				normalizedValue = Math.max(0, Math.min(1, 1 - y / rect.height));
			} else {
				const x = clientX - rect.left;
				normalizedValue = Math.max(0, Math.min(1, x / rect.width));
			}

			return denormalizeValue(normalizedValue);
		},
		[orientation, min, denormalizeValue]
	);

	const handleScrollEnd = useDebouncedCallback((value: number) => {
		if (isScrolling.current) {
			isScrolling.current = false;
			onDragEnd?.(value);
		}
	}, 250);

	const handleScroll = useCallback(
		(event: WheelEvent) => {
			event.preventDefault();
			const delta = event.deltaX;
			const step = (max - min) * 0.05;
			const newValue = Math.max(
				min,
				Math.min(max, valueRef.current + (delta > 0 ? step : -step))
			);

			lastInteractionTime.current = Date.now();
			valueRef.current = newValue;
			updateStyles(newValue);
			onChange?.(newValue);

			isScrolling.current = true;
			handleScrollEnd(newValue);
		},
		[onChange, updateStyles, min, max, handleScrollEnd]
	);

	const handleDragging = useCallback(
		(event: MouseEvent | TouchEvent) => {
			if (!isDragging.current) return;
			event.preventDefault();

			const newValue = getPosition(event as any);
			lastInteractionTime.current = Date.now();
			updateStyles(newValue);
			onChange?.(newValue);
			console.log("ondrag", newValue);

			valueRef.current = newValue;
		},
		[getPosition, updateStyles, onChange]
	);

	const handleStartDragging = useCallback(
		(
			event: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>
		) => {
			event.preventDefault();
			isDragging.current = true;
			lastInteractionTime.current = Date.now();

			const handleMove = (e: MouseEvent | TouchEvent) => handleDragging(e);
			const handleEnd = () => {
				isDragging.current = false;
				document.removeEventListener("mousemove", handleMove);
				document.removeEventListener("touchmove", handleMove);
				document.removeEventListener("mouseup", handleEnd);
				document.removeEventListener("touchend", handleEnd);
				onDragEnd?.(valueRef.current);
			};

			document.addEventListener("mousemove", handleMove);
			document.addEventListener("touchmove", handleMove, { passive: false });
			document.addEventListener("mouseup", handleEnd);
			document.addEventListener("touchend", handleEnd);
		},
		[getPosition, handleDragging, onChange, onDragEnd, updateStyles]
	);

	useEffect(() => {
		window.addEventListener("wheel", handleScroll, { passive: false });
		return () => window.removeEventListener("wheel", handleScroll);
	}, [handleScroll]);

	useEffect(() => {
		const now = Date.now();
		if (now - lastInteractionTime.current > 1000) {
			updateStyles(value);
		}
	}, [value, updateStyles]);

	useEffect(() => {
		return () => {
			if (rafId.current) cancelAnimationFrame(rafId.current);
		};
	}, []);

	const baseStyles = useMemo<SliderCSSVars>(
		() => ({
			"--slider-thickness": "100px",
			"--handle-size": "4px",
			"--handle-margin": "calc(var(--slider-thickness) / 8)",
			"--slider-size":
				"calc(100% - 2 * var(--handle-margin) - var(--handle-size))",
			"--value": normalizeValue(value).toString(),
		}),
		[value, normalizeValue]
	);

	const progressStyle = useMemo<React.CSSProperties>(
		() => ({
			transform:
				orientation === "vertical"
					? `translate3d(0, calc((1 - var(--value)) * var(--slider-size)), 0)`
					: `translate3d(calc((var(--value) - 1) * var(--slider-size)), 0, 0)`,
			transition: isDragging.current ? "none" : "transform 0.075s ease-out",
			backgroundColor: getBackgroundColor(),
		}),
		[orientation, isDragging, getBackgroundColor]
	);

	return (
		<div className={sliderStyles({ orientation, disabled })} style={baseStyles}>
			<div
				ref={sliderRef}
				className={trackStyles({ orientation })}
				onMouseDown={handleStartDragging}
				onTouchStart={handleStartDragging}
			>
				<div
					className="absolute inset-0"
					style={{ backgroundColor: getBackgroundColor(0.5) }}
				/>
				<div
					ref={progressRef}
					className="absolute inset-0 will-change-transform"
					style={progressStyle}
				>
					<div className={handleStyles({ orientation })}>
						<div className={handleBarStyles({ orientation })} />
					</div>
				</div>
			</div>
		</div>
	);
};

export default Slider;
