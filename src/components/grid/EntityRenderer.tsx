import { memo } from "react";
import { getEntityDomain } from "../../utils/entityTypes";
import { sizeToString } from "../../hooks/useGridLayout";
import LightEntity from "../entity/LightEntity";
import type { EntitySize } from "../../../shared";

type Props = {
  entityId: string;
  size?: EntitySize;
};

const EntityRenderer = memo(({ entityId, size }: Props) => {
  const domain = getEntityDomain(entityId);
  const sizeString = sizeToString(size);

  switch (domain) {
    case "light":
      return <LightEntity entityId={entityId} size={sizeString} />;
    default:
      return null;
  }
});

EntityRenderer.displayName = "EntityRenderer";

export default EntityRenderer;
