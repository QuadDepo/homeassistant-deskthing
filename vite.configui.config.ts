import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "./config-ui",
  base: "./",
  plugins: [react()],
  server: {
    port: 8766,
    proxy: {
      "/api": {
        // Dev server runs on 8767, production on 8765
        target: "http://localhost:8767",
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
