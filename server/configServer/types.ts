// Server-specific types for the config API
import type { LayoutConfig } from "../../shared";

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
