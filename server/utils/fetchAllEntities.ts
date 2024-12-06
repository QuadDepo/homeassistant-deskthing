export async function fetchAllEntities(url: string, token: string) {
	const headers = {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	};

	try {
		// Ensure URL ends without slash
		const response = await fetch(`${url.replace(/\/$/, "")}/api/states`, {
			method: "GET",
			headers: headers,
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const entities = await response.json();
		return entities;
	} catch (error) {
		console.error("Error fetching entities:", error);
		throw error;
	}
}
