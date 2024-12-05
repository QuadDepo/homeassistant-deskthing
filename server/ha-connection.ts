import { DeskThing as DK } from "deskthing-server";
import {
	createConnection,
	subscribeEntities,
	createLongLivedTokenAuth,
	Connection,
} from "home-assistant-js-websocket";

type HAConfig = {
	url: string;
	token: string;
};

//  NodeJS doesn't include a WebSocket client by default. We use the 'ws' package
//  from NPM and polyfill it into the global namespace for compatibility.
const wnd = globalThis;
wnd.WebSocket = require("ws");

const deskThing = DK.getInstance();

let connection: Connection | null = null;

let config: HAConfig = {
	url: "",
	token: "",
};

const updateConfig = ({ url, token }) => {
	config = { url, token };
	if (connection) {
		deskThing.sendLog("[HA] Config updated - disconnecting current session");
		disconnect();
	}
};

const connect = async (connectionConfig?: HAConfig) => {
	if (connectionConfig) {
		updateConfig(connectionConfig);
	}

	if (!config.url || !config.token) {
		throw new Error("[HA] URL and token must be configured before connecting");
	}

	if (connection) {
		deskThing.sendLog("[HA] Connection already exists");
		return;
	}

	try {
		const auth = createLongLivedTokenAuth(config.url, config.token);
		connection = await createConnection({ auth });

		subscribeEntities(connection, (ent) => {
			deskThing.sendDataToClient({
				type: "homeassistant_data",
				payload: ent,
			});
		});

		deskThing.sendLog("[HA] Successfully connected");
	} catch (err) {
		deskThing.sendLog(`[HA] ${err}`);
		connection = null;
		throw err;
	}
};

const disconnect = () => {
	if (connection) {
		connection.close();
		connection = null;
		deskThing.sendLog("[HA] Disconnected");
	}
};

const isConnected = () => connection !== null;

const getConfig = () => ({ ...config });

export const homeAssistant = {
	connect,
	disconnect,
	isConnected,
	updateConfig,
	getConfig,
};
