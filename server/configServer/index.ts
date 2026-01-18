import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { createApiRoutes } from "./routes.js";
import type { SystemMachineSnaphot } from "../systemMachine.js";

const CONFIG_PORT = 8765;

type GetSnapshot = () => SystemMachineSnaphot;

export const createConfigServer = (getSnapshot: GetSnapshot) => {
  const app = new Hono();

  // Enable CORS for development
  app.use(
    "*",
    cors({
      origin: ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    })
  );

  // Mount API routes
  app.route("/api", createApiRoutes(getSnapshot));

  // Serve static files for the config UI
  // In production, serve from dist/config-ui (relative to where the bundled server runs)
  // In development, the Vite dev server handles this
  app.use(
    "/*",
    serveStatic({
      root: "./config-ui",
    })
  );

  // Fallback for SPA routing - serve index.html for non-file routes
  app.get("*", serveStatic({
    root: "./config-ui",
    path: "index.html",
  }));

  return {
    start: () => {
      const server = serve(
        {
          fetch: app.fetch,
          port: CONFIG_PORT,
        },
        (info) => {
          console.log(`[HA] Config server running at http://localhost:${info.port}`);
        }
      );
      return server;
    },
  };
};
