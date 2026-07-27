import { createServer } from "node:http";
import { handler } from "./build/handler.js";
import { attachRelay } from "./build/relay.js";
import { setRelay } from "./build/relay-registry.js";

/**
 * Production entry point.
 *
 * `adapter-node` gives us a request handler but no control over the HTTP
 * server, and a WebSocket upgrade cannot be served through it. So we own the
 * server here: SvelteKit handles HTTP, the relay handles `/relay/*` upgrades.
 */
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const server = createServer(handler);
const relay = attachRelay(server);
setRelay(relay);

server.listen(port, host, () => {
  console.info(`ShareMyCode listening on http://${host}:${port}`);
});

let shuttingDown = false;

/** Flush every room to disk before the process goes away. */
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`\n${signal} received, flushing rooms…`);

  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();

  server.close();
  await relay.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
