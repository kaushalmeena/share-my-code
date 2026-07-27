import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { relayDevServer } from "./src/lib/server/relay/vite-plugin";

/**
 * 3000 by default, but `PORT` wins so the dev server can be moved aside when
 * something already holds the port. Nothing in the app depends on 3000 — the
 * client derives the relay's WebSocket URL from `location.host` — so a
 * different port needs no other changes.
 */
const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), relayDevServer()],
  ssr: {
    /*
     * `@lucide/svelte` ships `.js` entries that re-export `.svelte` sources but
     * declares no top-level `svelte` field, so Vite does not recognise it as a
     * Svelte library and externalises it. Node then tries to `import` a
     * `.svelte` file directly and throws ERR_UNKNOWN_FILE_EXTENSION during SSR.
     * Bundling it instead lets vite-plugin-svelte compile the components.
     */
    noExternal: ["@lucide/svelte"]
  },
  server: {
    port
  },
  preview: {
    port
  }
});
