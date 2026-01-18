import type {
  EntitiesResponse,
  LayoutResponse,
  LayoutConfig,
  StatusResponse,
} from "../../server/configServer/types";

const API_BASE = "/api";

export async function fetchEntities(): Promise<EntitiesResponse> {
  const response = await fetch(`${API_BASE}/entities`);
  if (!response.ok) {
    throw new Error("Failed to fetch entities");
  }
  return response.json();
}

export async function fetchSelectedEntities(): Promise<{ selectedEntityIds: string[] }> {
  const response = await fetch(`${API_BASE}/selected-entities`);
  if (!response.ok) {
    throw new Error("Failed to fetch selected entities");
  }
  return response.json();
}

export async function fetchLayout(): Promise<LayoutResponse> {
  const response = await fetch(`${API_BASE}/layout`);
  if (!response.ok) {
    throw new Error("Failed to fetch layout");
  }
  return response.json();
}

export async function saveLayout(layout: LayoutConfig): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/layout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ layout }),
  });
  if (!response.ok) {
    throw new Error("Failed to save layout");
  }
  return response.json();
}

export async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch(`${API_BASE}/status`);
  if (!response.ok) {
    throw new Error("Failed to fetch status");
  }
  return response.json();
}
