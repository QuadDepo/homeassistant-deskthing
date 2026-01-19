export const CONFIG_SERVER_PORTS = {
  development: 8767,
  production: 8765,
} as const;

export const VITE_DEV_PORTS = {
  configUi: 8766,
  mainApp: 5173,
} as const;

const isProduction = process.env.NODE_ENV === "production";

export const getConfigServerBasePort = (): number =>
  isProduction
    ? CONFIG_SERVER_PORTS.production
    : CONFIG_SERVER_PORTS.development;
