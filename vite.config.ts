import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { relayDevServer } from "./src/lib/server/relay/vite-plugin";

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
    port: 3000
  },
  preview: {
    port: 3000
  }
});
