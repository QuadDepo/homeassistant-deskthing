import { existsSync } from "fs";
import { join } from "path";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { createApiRoutes } from "./routes.js";
import type { SystemMachineSnaphot } from "../systemMachine.js";

const CONFIG_PORT = 8765;

type GetSnapshot = () => SystemMachineSnaphot;

// Determine the correct path to config-ui static files
// DeskThing CLI injects __dirname via esbuild banner in production
// In production: __dirname points to the server folder, config-ui is a subfolder
// In development: use CWD-relative paths
const getConfigUiRoot = () => {
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

  // Fallback - will show error in logs if not found
  console.warn("[HA] Config UI static files not found, tried:", paths);

  throw new Error("Config UI static files not found");
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
        "http://localhost:5174",
        "http://127.0.0.1:5173",
      ],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  );

  // Mount API routes
  app.route("/api", createApiRoutes(getSnapshot));

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

  return {
    start: () => {
      const server = serve(
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
  };
};
