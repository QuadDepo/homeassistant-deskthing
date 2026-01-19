import { useCallback } from "react";
import { mdiLightbulb } from "@mdi/js";
import { useEntityStore } from "../../stores/entityStore";
import EntityCard from "./EntityCard";

type Props = {
  entityId: string;
  size?: string;
};

const LightEntity = ({ entityId, size = "1x1" }: Props) => {
  const entity = useEntityStore((state) => state.entities[entityId]);
  const isPending = useEntityStore((state) => state.isPending(entityId));
  const performOptimisticAction = useEntityStore(
    (state) => state.performOptimisticAction,
  );

  const handleToggle = useCallback(() => {
    if (!entity) return;

    const optimisticState = entity.state === "on" ? "off" : "on";
    performOptimisticAction(entityId, "light/toggle", optimisticState);
  }, [entityId, entity, performOptimisticAction]);

  if (!entity) return null;

  const isOn = entity.state === "on";
  const friendlyName = entity.attributes.friendly_name ?? entityId;

  return (
    <EntityCard
      name={friendlyName}
      isActive={isOn}
      isPending={isPending}
      iconPath={mdiLightbulb}
      size={size}
      onClick={handleToggle}
    />
  );
};

export default LightEntity;
