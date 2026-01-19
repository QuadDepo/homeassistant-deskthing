import { ReactNode } from "react";

interface GridProps {
  children: ReactNode;
  rows?: number;
  cols?: number;
}

const Grid = ({ children, rows = 3, cols = 5 }: GridProps) => {
  return (
    <div className="w-full h-full">
      <div className="w-full overflow-x-auto scroll-px-4 h-full snap-x p-4 snap-mandatory">
        <div
          className="grid gap-4 w-fit h-full"
          style={{
            display: "grid",
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gridTemplateColumns: `repeat(${cols}, 140.5px)`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Grid;
