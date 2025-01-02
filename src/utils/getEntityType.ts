// TODO: check if we can type nicely
const getEntityType = (type: string): string | null => {
	const prefix = type.split(".")[0];

	switch (prefix) {
		case "light":
			return "light";
		case "switch":
			return "switch";
		default:
			return null;
	}
};

export default getEntityType;
