import "dotenv/config";
// +feature:realtime
import type { Server } from "node:http";
// -feature:realtime
import { serve } from "@hono/node-server";
import { initLogger, log } from "evlog";
import { createApp } from "./app.ts";
import { buildContainer, readConfig, startBackgroundWork } from "./composition.ts";
// +feature:realtime
import { WebSocketController } from "./interfaces/ws/websocket-controller.ts";
// -feature:realtime

// `service`/`environment` ride along with every wide event so we can
// filter in aggregators (Axiom/OTLP/etc.) once a drain is wired up.
// ESM import hoisting means modules above resolve first; that's fine
// because nothing logs at import time. This init just needs to run
// before the first request / worker tick.
initLogger({
  env: {
    service: "orbit-api",
    environment: process.env.NODE_ENV ?? "development",
  },
});

const port = Number(process.env.PORT ?? 4002);

const config = readConfig();
const container = buildContainer(config);
startBackgroundWork(container);

const { app } = createApp(container);

const server = serve({ fetch: app.fetch, port }, (info) => {
  log.info({ action: "api.listening", port: info.port });
  console.log(`[api] listening on http://localhost:${info.port}`);
});

// +feature:realtime
const ws = new WebSocketController(container);
ws.attachTo(server as unknown as Server);
// -feature:realtime


const shutdown = (signal: NodeJS.Signals) => {
  log.info({ action: "api.shutdown", signal });
  // +feature:realtime
  ws.close();
  // -feature:realtime
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
