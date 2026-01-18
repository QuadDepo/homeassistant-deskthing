import { useCallback } from "react";
import { mdiLightbulb } from "@mdi/js";
import { useEntityStore } from "../../stores/entityStore";
import EntityCard from "./EntityCard";

type Props = {
  entityId: string;
  size?: "1x1" | "1x2" | "2x1" | "2x2" | "3x3";
};

const LightEntity = ({ entityId, size = "1x1" }: Props) => {
  const entity = useEntityStore((state) => state.entities[entityId]);
  const performAction = useEntityStore((state) => state.performAction);

  const handleToggle = useCallback(() => {
    performAction(entityId, "light/toggle");
  }, [entityId, performAction]);

  if (!entity) return null;

  const isOn = entity.state === "on";
  const friendlyName = entity.attributes.friendly_name ?? entityId;

  return (
    <EntityCard
      name={friendlyName}
      isActive={isOn}
      iconPath={mdiLightbulb}
      size={size}
      onClick={handleToggle}
    />
  );
};

export default LightEntity;
