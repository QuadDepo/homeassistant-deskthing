import { cva, cx } from "class-variance-authority";
import { positionToTailwindClass } from "../../utils/positionToTailwindClass";
import Icon from "@mdi/react";

type Size = "1x1" | "1x2" | "2x1" | "2x2" | "3x3";

type Props = {
  name: string;
  isActive: boolean;
  iconPath: string;
  size?: Size;
  onClick?: () => void;
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

const EntityCard = ({
  name,
  isActive,
  iconPath,
  size = "1x1",
  onClick,
}: Props) => {
  return (
    <div
      className={cx(
        entityStyles({ active: isActive }),
        positionToTailwindClass(size),
      )}
    >
      <div onClick={onClick} className={contentStyles()}>
        <Icon path={iconPath} size={1.25} />
        <p className={titleStyles()}>{name}</p>
      </div>
    </div>
  );
};

export default EntityCard;
