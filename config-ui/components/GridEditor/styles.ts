import { cva } from "class-variance-authority";

export const cellStyles = cva(
  [
    "relative",
    "rounded-xl",
    "border-2",
    "transition-all",
    "duration-200",
    "flex",
    "flex-col",
    "items-center",
    "justify-center",
    "p-2",
    "group",
  ],
  {
    variants: {
      isEmpty: {
        true: [
          "aspect-square",
          "border-dashed",
          "border-white/20",
          "hover:border-white/40",
          "hover:bg-white/5",
          "cursor-pointer",
        ],
        false: [
          "border-solid",
          "border-blue-500/50",
          "bg-white/10",
          "cursor-grab",
        ],
      },
      isOver: {
        true: ["border-green-500/70", "bg-green-500/10"],
        false: [],
      },
      isDragging: {
        true: ["invisible"],
        false: [],
      },
      isResizing: {
        true: ["cursor-se-resize"],
        false: [],
      },
    },
  }
);
