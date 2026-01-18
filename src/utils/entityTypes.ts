// Domains our app explicitly supports
// HA domains are extensible, so we define what we handle
const ENTITY_DOMAINS = [
  "light",
  "switch",
  "climate",
  "media_player",
  "cover",
  "fan",
  "lock",
  "sensor",
  "binary_sensor",
] as const;

export type EntityDomain = (typeof ENTITY_DOMAINS)[number];

export function getEntityDomain(entityId: string): EntityDomain | null {
  const domain = entityId.split(".")[0];
  return ENTITY_DOMAINS.includes(domain as EntityDomain)
    ? (domain as EntityDomain)
    : null;
}

export function isControllable(domain: EntityDomain | null): boolean {
  if (!domain) return false;
  return !["sensor", "binary_sensor"].includes(domain);
}

// Domain-specific toggle actions
export function getToggleAction(domain: EntityDomain | null): string | null {
  if (!domain) return null;

  switch (domain) {
    case "light":
      return "light/toggle";
    case "switch":
      return "switch/toggle";
    case "fan":
      return "fan/toggle";
    case "cover":
      return "cover/toggle";
    case "lock":
      // Locks don't have toggle, handled separately
      return null;
    case "climate":
    case "media_player":
      // These have complex controls, no simple toggle
      return null;
    default:
      return null;
  }
}
