import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    // Target older Chrome for DeskThing device compatibility
    target: "es2017",
    outDir: "dist",
    rollupOptions: {
      output: {
        assetFileNames: "[name]-[hash][extname]",
        chunkFileNames: "[name]-[hash].js",
        entryFileNames: "[name]-[hash].js",
      },
    },
  },
});
