import { SettingsMultiSelect } from "deskthing-server";
import { DeskThing } from "..";
import { HassEntity } from "home-assistant-js-websocket";

const createEntitySetting = (
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

export default createEntitySetting;
