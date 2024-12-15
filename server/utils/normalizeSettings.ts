import {
	AppSettings,
	SettingsString,
	SettingsMultiSelect,
} from "deskthing-server";

export const normalizeSettings = (settings?: AppSettings | null) => {
	const url = (settings?.url as SettingsString)?.value || "";
	const token = (settings?.token as SettingsString)?.value || "";
	const entities = (settings?.entities as SettingsMultiSelect)?.value || [];

	return {
		url,
		token,
		entities,
	};
};
