import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cva, cx } from "class-variance-authority";
import Icon from "@mdi/react";
import {
  mdiLightbulb,
  mdiToggleSwitch,
  mdiThermometer,
  mdiSpeaker,
  mdiBlindsHorizontal,
  mdiFan,
  mdiLock,
  mdiEye,
  mdiDrag,
  mdiCheckCircle,
  mdiCircleOutline,
} from "@mdi/js";
import type { EntityWithLayout } from "../stores/configStore";

interface Props {
  entity: EntityWithLayout;
  onToggle: () => void;
}

const domainIcons: Record<string, string> = {
  light: mdiLightbulb,
  switch: mdiToggleSwitch,
  climate: mdiThermometer,
  media_player: mdiSpeaker,
  cover: mdiBlindsHorizontal,
  fan: mdiFan,
  lock: mdiLock,
  sensor: mdiEye,
  binary_sensor: mdiEye,
};

const entityStyles = cva(
  [
    "flex",
    "items-center",
    "gap-3",
    "p-4",
    "rounded-xl",
    "border",
    "transition-all",
    "duration-200",
  ],
  {
    variants: {
      isDragging: {
        true: ["opacity-50", "scale-105", "shadow-lg"],
        false: ["opacity-100"],
      },
      enabled: {
        true: ["bg-white/15", "border-blue-500/50"],
        false: ["bg-white/5", "border-white/10", "opacity-60"],
      },
    },
  }
);

const SortableEntity = ({ entity, onToggle }: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entity.entity_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const iconPath = domainIcons[entity.domain] || mdiEye;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(entityStyles({ isDragging, enabled: entity.enabled }))}
      {...attributes}
    >
      <div
        className="cursor-grab active:cursor-grabbing p-2 -m-2 rounded hover:bg-white/10"
        {...listeners}
      >
        <Icon path={mdiDrag} size={1} className="text-white/50" />
      </div>

      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10">
        <Icon path={iconPath} size={1} className="text-white/80" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">
          {entity.friendly_name}
        </div>
        <div className="text-white/50 text-sm truncate">{entity.entity_id}</div>
      </div>

      <button
        onClick={onToggle}
        className="p-2 -m-2 rounded hover:bg-white/10 transition-colors"
        title={entity.enabled ? "Disable entity" : "Enable entity"}
      >
        <Icon
          path={entity.enabled ? mdiCheckCircle : mdiCircleOutline}
          size={1}
          className={entity.enabled ? "text-blue-400" : "text-white/30"}
        />
      </button>
    </div>
  );
};

export default SortableEntity;
