export async function getHomeAssistantStates(
	baseUrl: string,
	accessToken: string,
	entityId?: string
): Promise<Array<any>> {
	const headers = {
		Authorization: `Bearer ${accessToken}`,
		"Content-Type": "application/json",
	};

	const normalizedUrl = baseUrl.replace(/\/$/, "");
	const endpoint = entityId ? `/api/states/${entityId}` : "/api/states";

	try {
		const response = await fetch(`${normalizedUrl}${endpoint}`, {
			method: "GET",
			headers,
		});

		if (!response.ok) {
			throw new Error(
				`Failed to fetch states: ${response.status} ${response.statusText}`
			);
		}

		const data = await response.json();
		return Array.isArray(data) ? data : [data];
	} catch (error) {
		console.error("Failed to fetch Home Assistant states:", error);
		throw error;
	}
}
