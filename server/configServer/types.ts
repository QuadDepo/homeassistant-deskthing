// Layout configuration types for entity ordering and selection

export interface LayoutItem {
  entityId: string;
  enabled: boolean; // Whether this entity is selected to display on DeskThing
  // Future: position, size, custom config
}

export interface LayoutConfig {
  version: 1;
  items: LayoutItem[];
}

export interface EntityInfo {
  entity_id: string;
  friendly_name: string;
  domain: string;
  state: string;
}

export interface EntitiesResponse {
  entities: EntityInfo[];
}

export interface LayoutResponse {
  layout: LayoutConfig;
}

export interface SaveLayoutRequest {
  layout: LayoutConfig;
}

export interface StatusResponse {
  status: "connected" | "disconnected" | "configuring";
  entityCount: number;
}

export const createEmptyLayout = (): LayoutConfig => ({
  version: 1,
  items: [],
});
