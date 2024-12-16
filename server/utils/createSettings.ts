import { SettingsMultiSelect, SettingsString } from "deskthing-server";
import { DeskThing } from "..";
import { HassEntity } from "home-assistant-js-websocket";

export const createEntitySetting = (
	entities: HassEntity[],
	currentEntities: string[]
) => {
	const setting: SettingsMultiSelect = {
		label: "Select your entities",
		description: "NOTE: some might not be supported YET",
		type: "multiselect",
		value: currentEntities,
		options: entities
			.map((entity) => entity.entity_id)
			// NOTE: Temporary only return light entities
			.filter((name) => name.startsWith("light."))
			.map((name) => ({
				value: name,
				label: name,
			})),
	};

	DeskThing.addSettings({
		entities: setting,
	});
};

export const createBasicSettings = () => {
	const url: SettingsString = {
		label: "Your HomeAssistant URL",
		type: "string",
		value: "http://homeassistant.local:8123",
	};

	const token: SettingsString = {
		label: "HomeAssistant Long Lived Access Token",
		type: "string",
		value: "",
	};

	DeskThing.addSettings({
		url,
		token,
	});
};
