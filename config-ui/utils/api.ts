import type { LayoutConfig } from "../../shared/types/grid";
import type {
  EntitiesResponse,
  LayoutResponse,
  StatusResponse,
} from "../../server/configServer/types";

const API_BASE = "/api";

async function handleResponse<T>(response: Response, operation: string): Promise<T> {
  if (!response.ok) {
    let errorMessage = `${operation} failed: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error) {
        errorMessage += ` - ${errorBody.error}`;
      }
    } catch {
      // If response body is not JSON or empty, use default message
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function fetchEntities(): Promise<EntitiesResponse> {
  const response = await fetch(`${API_BASE}/entities`);
  return handleResponse(response, "Fetch entities");
}

export async function fetchSelectedEntities(): Promise<{ selectedEntityIds: string[] }> {
  const response = await fetch(`${API_BASE}/selected-entities`);
  return handleResponse(response, "Fetch selected entities");
}

export async function fetchLayout(): Promise<LayoutResponse> {
  const response = await fetch(`${API_BASE}/layout`);
  return handleResponse(response, "Fetch layout");
}

export async function saveLayout(layout: LayoutConfig): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/layout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ layout }),
  });
  return handleResponse(response, "Save layout");
}

export async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch(`${API_BASE}/status`);
  return handleResponse(response, "Fetch status");
}
