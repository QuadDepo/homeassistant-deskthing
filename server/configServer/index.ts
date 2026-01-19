import { existsSync } from "fs";
import { join } from "path";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import getPort, { portNumbers } from "get-port";
import { createApiRoutes } from "./routes";
import { getConfigServerBasePort } from "../../shared/config";
import type { SystemMachineSnaphot } from "../systemMachine";

type GetSnapshot = () => SystemMachineSnaphot;

// Determine the correct path to config-ui static files
// DeskThing CLI injects __dirname via esbuild banner in production
// In production: __dirname points to the server folder, config-ui is a subfolder
// In development: use CWD-relative paths
const getConfigUiRoot = (): string | null => {
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

  return null;
};

export const createConfigServer = (getSnapshot: GetSnapshot) => {
  const app = new Hono();
  const configUiRoot = getConfigUiRoot();

  app.route("/api", createApiRoutes(getSnapshot));

  if (configUiRoot) {
    app.use(
      "/*",
      serveStatic({
        root: configUiRoot,
      }),
    );

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
    start: async () => {
      const basePort = getConfigServerBasePort();
      const port = await getPort({
        port: portNumbers(basePort, basePort + 10),
      });

      server = serve(
        {
          fetch: app.fetch,
          port,
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
