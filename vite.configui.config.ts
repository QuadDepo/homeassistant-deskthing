import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { CONFIG_SERVER_PORTS, VITE_DEV_PORTS } from "./shared/config";

export default defineConfig({
  root: "./config-ui",
  base: "./",
  plugins: [react()],
  server: {
    port: VITE_DEV_PORTS.configUi,
    proxy: {
      "/api": {
        target: `http://localhost:${CONFIG_SERVER_PORTS.development}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Output to server folder so DeskThing CLI packages it with the server
    outDir: "../dist/server/config-ui",
    emptyOutDir: true,
  },
});
