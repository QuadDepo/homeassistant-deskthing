import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "./config-ui",
  base: "./",
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:8765",
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
