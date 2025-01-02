export const positionToTailwindClass = (position: string) => {
	const [rowSpan, colSpan] = position.split("x").map(Number);

	const classes = [
		rowSpan > 1 ? `row-span-${rowSpan}` : "",
		colSpan > 1 ? `col-span-${colSpan}` : "",
	].filter(Boolean);

	return classes.join(" ");
};
