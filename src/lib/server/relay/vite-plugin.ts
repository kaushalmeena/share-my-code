import type { Server as HttpServer } from "node:http";
import type { Plugin } from "vite";
import type { Relay } from "./index";
// Type-only views of the modules loaded at runtime through `ssrLoadModule`,
// which is untyped. These imports are erased at compile time.
import type * as RelayModule from "./index";
import type * as RegistryModule from "./registry";

/**
 * Mounts the relay on Vite's own HTTP server during `vite dev`, so
 * collaboration works without running a second process.
 *
 * The relay module is pulled in through `ssrLoadModule` rather than a static
 * import: this file is loaded by `vite.config.ts` before aliases like `$lib`
 * exist, and going through Vite means the relay is type-checked and
 * transformed the same way the rest of the server code is.
 *
 * Production does not use this plugin — `server.js` mounts the relay itself.
 */
export function relayDevServer(): Plugin {
  let relay: Relay | null = null;

  return {
    name: "sharemycode:relay",
    apply: "serve",

    configureServer(server) {
      // Wait for `listening`: by then Vite has registered its own upgrade
      // handler for HMR, and the two coexist on the same server.
      server.httpServer?.once("listening", () => {
        void (async () => {
          if (relay || !server.httpServer) return;
          const [{ attachRelay }, { setRelay }] = await Promise.all([
            server.ssrLoadModule("/src/lib/server/relay/index.ts") as Promise<
              typeof RelayModule
            >,
            server.ssrLoadModule(
              "/src/lib/server/relay/registry.ts"
            ) as Promise<typeof RegistryModule>
          ]);
          // Vite types this as possibly HTTP/2; the dev server is always
          // HTTP/1 here, which is what the upgrade handler expects.
          relay = attachRelay(server.httpServer as HttpServer);
          setRelay(relay);
        })();
      });
    },

    async closeBundle() {
      await relay?.close();
      relay = null;
    }
  };
}
