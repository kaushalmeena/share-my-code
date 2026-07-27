import type { Relay } from "./index";

/**
 * The relay is created by whoever owns the HTTP server — the Vite plugin in
 * development, `server.js` in production — but SvelteKit endpoints need to
 * reach it too. Those live in a different module graph, so a plain module-level
 * variable would not be shared. A symbol on `globalThis` crosses that boundary.
 */
const RELAY_KEY = Symbol.for("sharemycode.relay");

type RelayGlobal = typeof globalThis & { [RELAY_KEY]?: Relay };

export function setRelay(relay: Relay): void {
  (globalThis as RelayGlobal)[RELAY_KEY] = relay;
}

export function getRelay(): Relay {
  const relay = (globalThis as RelayGlobal)[RELAY_KEY];
  if (!relay) {
    throw new Error(
      "Relay is not attached. It must be mounted on the HTTP server at startup."
    );
  }
  return relay;
}
