import { Hono } from "hono";
import { DeskThing } from "@deskthing/server";
import { SETTING_TYPES, type SettingsList, type SettingsString } from "@deskthing/types";
import { getHomeAssistantStates } from "../utils/getHomeAssistantStates";
import type { SystemMachineSnaphot } from "../systemMachine";
import type { LayoutConfig } from "../../shared/index";
import {
  createEmptyLayout,
  LayoutConfigSchema,
  isWithinBounds,
  DEFAULT_SIZE,
} from "../../shared/index";
import type {
  EntitiesResponse,
  LayoutResponse,
  SaveLayoutRequest,
  StatusResponse,
  EntityInfo,
} from "./types";

type GetSnapshot = () => SystemMachineSnaphot;

export const createApiRoutes = (getSnapshot: GetSnapshot) => {
  const api = new Hono();

  // Get all available entities from Home Assistant
  api.get("/entities", async (c) => {
    const snapshot = getSnapshot();
    const { url, token } = snapshot.context;

    if (!url || !token) {
      return c.json<EntitiesResponse>({ entities: [] });
    }

    try {
      const allEntities = await getHomeAssistantStates(url, token);

      const entities: EntityInfo[] = allEntities.map((entity) => ({
        entity_id: entity.entity_id,
        friendly_name: entity.attributes?.friendly_name || entity.entity_id,
        domain: entity.entity_id.split(".")[0],
        state: entity.state,
      }));

      return c.json<EntitiesResponse>({ entities });
    } catch (error) {
      console.error("[Config Server] Failed to fetch entities:", error);
      return c.json<EntitiesResponse>({ entities: [] });
    }
  });

  // Get currently selected entities (from settings)
  api.get("/selected-entities", async (c) => {
    const snapshot = getSnapshot();
    const selectedEntityIds = snapshot.context.entities || [];
    return c.json({ selectedEntityIds });
  });

  // Get current layout configuration
  api.get("/layout", async (c) => {
    try {
      const settings = await DeskThing.getSettings();
      const layoutSetting = settings?.layout;
      let layout: LayoutConfig;

      if (typeof layoutSetting?.value === "string") {
        // Layout is stored as JSON string
        try {
          layout = JSON.parse(layoutSetting.value) as LayoutConfig;
        } catch {
          layout = createEmptyLayout();
        }
      } else {
        layout = createEmptyLayout();
      }

      return c.json<LayoutResponse>({ layout });
    } catch (error) {
      console.error("[Config Server] Failed to get layout:", error);
      return c.json<LayoutResponse>({ layout: createEmptyLayout() });
    }
  });

  // Save layout configuration
  api.post("/layout", async (c) => {
    try {
      const body = await c.req.json<SaveLayoutRequest>();
      const { layout } = body;

      // Validate layout structure with Zod
      const validationResult = LayoutConfigSchema.safeParse(layout);

      if (!validationResult.success) {
        return c.json(
          {
            success: false,
            error: `Invalid layout configuration: ${validationResult.error.message}`,
          },
          400,
        );
      }

      // Validate positions are within bounds (custom validation)
      for (const item of validationResult.data.items) {
        if (item.position) {
          const size = item.size || DEFAULT_SIZE;
          if (
            !isWithinBounds(item.position, size, validationResult.data.grid)
          ) {
            return c.json(
              {
                success: false,
                error: `Entity ${item.entityId} position out of bounds`,
              },
              400,
            );
          }
        }
      }

      // Get current settings
      const settings = await DeskThing.getSettings();

      const validatedLayout = validationResult.data;

      // Extract enabled entity IDs from layout to sync with DeskThing settings
      const enabledEntityIds = validatedLayout.items
        .filter((item) => item.enabled)
        .map((item) => item.entityId);

      // Update both layout and entities settings
      // Layout is stored as JSON string to work with DeskThing's type system
      const existingEntities = settings?.entities as SettingsList | undefined;

      const entitiesSetting: SettingsList & { id: string } = existingEntities
        ? { ...existingEntities, id: "entities", value: enabledEntityIds }
        : {
            id: "entities",
            label: "Entities",
            type: SETTING_TYPES.LIST,
            value: enabledEntityIds,
            options: [],
          };

      const layoutSetting: SettingsString & { id: string } = {
        id: "layout",
        label: "Entity Layout",
        type: SETTING_TYPES.STRING,
        value: JSON.stringify(validatedLayout),
      };

      await DeskThing.setSettings({
        ...settings,
        layout: layoutSetting,
        entities: entitiesSetting,
      });

      // Send layout update to the DeskThing client
      DeskThing.send({
        type: "LAYOUT_CONFIG",
        payload: validatedLayout,
      });

      return c.json({ success: true });
    } catch (error) {
      console.error("[Config Server] Failed to save layout:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  // Get server status
  api.get("/status", async (c) => {
    const snapshot = getSnapshot();
    const stateValue = snapshot.value;

    let status: StatusResponse["status"];
    if (typeof stateValue === "object" && "active" in stateValue) {
      status = "connected";
    } else if (typeof stateValue === "object" && "initialize" in stateValue) {
      status = "configuring";
    } else {
      status = "disconnected";
    }

    return c.json<StatusResponse>({
      status,
      entityCount: snapshot.context.entities?.length || 0,
    });
  });

  return api;
};
