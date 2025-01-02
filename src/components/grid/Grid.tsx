import { ReactNode } from "react";

const ROWS = 3;

const Grid = ({ children }: { children: ReactNode }) => {
	return (
		<div className="w-full h-full">
			<div className="w-full overflow-x-auto scroll-px-4 h-full snap-x p-4 snap-mandatory">
				<div
					className="grid gap-4 w-fit h-full"
					style={{
						display: "grid",
						gridTemplateRows: `repeat(${ROWS}, 1fr)`,
						gridTemplateColumns: "repeat(6, 150px)",
						gridAutoColumns: "150px",
						gridAutoFlow: "column dense",
					}}
				>
					{children}
				</div>
			</div>
		</div>
	);
};

export default Grid;
