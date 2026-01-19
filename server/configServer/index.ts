import { existsSync } from "fs";
import { join } from "path";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { createApiRoutes } from "./routes.js";
import type { SystemMachineSnaphot } from "../systemMachine.js";

// Use different ports for dev vs production to avoid clashing
// Production (DeskThing app): 8765
// Development (pnpm dev): 8767
const isProduction = typeof __dirname !== "undefined";
const CONFIG_PORT = isProduction ? 8765 : 8767;

type GetSnapshot = () => SystemMachineSnaphot;

// Determine the correct path to config-ui static files
// DeskThing CLI injects __dirname via esbuild banner in production
// In production: __dirname points to the server folder, config-ui is a subfolder
// In development: use CWD-relative paths
const getConfigUiRoot = (): string | null => {
  // Check paths in order of likelihood
  const paths: string[] = [];

  if (typeof __dirname !== "undefined") {
    const dirnameConfigUi = join(__dirname, "config-ui");
    paths.push(dirnameConfigUi);
    console.log(`[HA] __dirname is: ${__dirname}`);
  }

  for (const p of paths) {
    console.log(`[HA] Checking for config-ui at: ${p}`);
    if (existsSync(p)) {
      console.log(`[HA] Config UI found at: ${p}`);
      return p;
    }
  }

  // In development, static files don't exist (Vite serves them on port 8766)
  // Return null instead of throwing - API will still work
  console.log("[HA] Development mode: Config API only (no static files)");
  console.log(
    "[HA] Run 'pnpm dev:configui' for hot-reload UI on http://localhost:8766",
  );
  return null;
};

export const createConfigServer = (getSnapshot: GetSnapshot) => {
  const app = new Hono();
  const configUiRoot = getConfigUiRoot();

  // Enable CORS for development
  app.use(
    "*",
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:8766",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8766",
      ],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  );

  // Mount API routes (always available)
  app.route("/api", createApiRoutes(getSnapshot));

  // Only serve static files if config-ui was found (production)
  // In development, Vite serves the UI on port 5174
  if (configUiRoot) {
    // Serve static files for the config UI
    app.use(
      "/*",
      serveStatic({
        root: configUiRoot,
      }),
    );

    // Fallback for SPA routing - serve index.html for non-file routes
    app.get(
      "*",
      serveStatic({
        root: configUiRoot,
        path: "index.html",
      }),
    );
  }

  let server: ReturnType<typeof serve> | null = null;

  return {
    start: () => {
      server = serve(
        {
          fetch: app.fetch,
          port: CONFIG_PORT,
        },
        (info) => {
          console.log(
            `[HA] Config server running at http://localhost:${info.port}`,
          );
        },
      );
      return server;
    },
    stop: () => {
      if (server) {
        console.log("[HA] Stopping config server...");
        server.close();
        server = null;
      }
    },
  };
};
