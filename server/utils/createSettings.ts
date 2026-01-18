import { SETTING_TYPES, SettingOption } from "@deskthing/types";
import { DeskThing } from "..";
import { HassEntity } from "home-assistant-js-websocket";

export const createEntitySetting = (
  entities: HassEntity[],
  currentEntities: string[],
) => {
  const options: SettingOption[] = entities
    .map((entity) => entity.entity_id)
    // NOTE: Temporary only return light entities
    .filter((name) => name.startsWith("light."))
    .map((name) => ({
      value: name,
      label: name,
    }));

  DeskThing.setSettings({
    entities: {
      id: "entities",
      label: "Select your entities",
      description: "NOTE: some might not be supported YET",
      type: SETTING_TYPES.MULTISELECT,
      value: currentEntities,
      options,
    },
  });
};

export const updateEntityOptions = (entities: HassEntity[]) => {
  const options: SettingOption[] = entities
    .map((entity) => entity.entity_id)
    // NOTE: Temporary only return light entities
    .filter((name) => name.startsWith("light."))
    .map((name) => ({
      value: name,
      label: name,
    }));

  DeskThing.setSettingOptions("entities", options);
};

export const createBasicSettings = () => {
  DeskThing.initSettings({
    url: {
      id: "url",
      label: "Your HomeAssistant URL",
      type: SETTING_TYPES.STRING,
      value: "http://homeassistant.local:8123",
    },
    token: {
      id: "token",
      label: "HomeAssistant Long Lived Access Token",
      type: SETTING_TYPES.STRING,
      value: "",
    },
  });
};
