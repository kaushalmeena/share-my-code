import { build } from "esbuild";

/**
 * The relay lives in TypeScript under `src/lib/server/relay`, but `server.js`
 * needs plain JavaScript at runtime. `adapter-node` only builds the SvelteKit
 * app, so the relay gets its own small bundle here.
 *
 * The registry is emitted separately because `server.js` and the SvelteKit
 * handler each import their own copy; they find each other through the symbol
 * on `globalThis` rather than through module identity.
 */
const shared = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  sourcemap: true,
  // `ws` stays external so Node resolves it from node_modules as usual.
  external: ["ws"],
  alias: { $lib: "./src/lib" },
  logLevel: "info"
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ["src/lib/server/relay/index.ts"],
    outfile: "build/relay.js"
  }),
  build({
    ...shared,
    entryPoints: ["src/lib/server/relay/registry.ts"],
    outfile: "build/relay-registry.js"
  })
]);
