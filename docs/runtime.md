# Persistence and process model

## Persistence

`SnapshotStore` writes two files per room under `ROOM_STORAGE_DIR`
(default `.data/rooms`):

- `<roomId>.bin` — `Y.encodeStateAsUpdate` of the document
- `<roomId>.json` — host token hash and timestamps

Writes are debounced 2s with a 10s ceiling, so continuous typing still gets
flushed. Rooms unload from memory 30s after the last connection leaves, after a
final flush. Snapshots untouched for 14 days are swept.

`server.js` flushes every room on `SIGINT`/`SIGTERM`, so a normal deploy does
not lose the last few seconds of work.

## Process model

A WebSocket upgrade cannot be served through `adapter-node`'s request handler,
so the app owns its HTTP server:

- **Development** — `relayDevServer()` (a Vite plugin) mounts the relay on
  Vite's server once it is listening, alongside Vite's own HMR upgrade
  handler. One process, one port.
- **Production** — `server.js` creates the HTTP server, gives requests to the
  SvelteKit handler and `/relay/*` upgrades to the relay.

The relay is TypeScript under `src/`, but `server.js` needs JavaScript at
runtime and `adapter-node` only builds the app, so `scripts/build-relay.js`
bundles it separately with esbuild.

The relay instance is registered on a `Symbol.for()` key on `globalThis`
(`relay/registry.ts`). Endpoints such as `POST /api/rooms` live in a different
module graph from whoever created the relay — Vite's SSR graph in development,
a separate bundle in production — so a module-level variable would not be
shared between them.

### Build outputs

`npm run build` runs two builds, and `server.js` needs all of them:

| Path                      | Produced by              | Contains                      |
| ------------------------- | ------------------------ | ----------------------------- |
| `build/handler.js`        | `adapter-node`           | The SvelteKit request handler |
| `build/relay.js`          | `scripts/build-relay.js` | The relay, `ws` left external |
| `build/relay-registry.js` | `scripts/build-relay.js` | The `globalThis` handoff      |

The registry is emitted separately because `server.js` and the SvelteKit
handler each import their own copy; they find each other through the symbol,
not through module identity.

## Configuration

Every setting has a working default, so the app runs with no environment at
all.

| Variable           | Default       | Purpose                          |
| ------------------ | ------------- | -------------------------------- |
| `PORT`             | `3000`        | Port to listen on.               |
| `HOST`             | `0.0.0.0`     | Interface to bind.               |
| `ROOM_STORAGE_DIR` | `.data/rooms` | Where pad snapshots are written. |

In the Docker image `ROOM_STORAGE_DIR` defaults to `/data/rooms`, and `/data`
is declared a volume. **Mount something persistent there.** On an ephemeral
container filesystem every pad is lost on redeploy — the relay would come back
with no snapshots, and only clients that still hold an IndexedDB copy could
restore anything.

The image runs as the unprivileged `node` user. Persistent disks (Render's
included) mount root-owned, so `docker-entrypoint.sh` starts as root, hands the
storage directory to `node`, and then drops privileges with `su-exec`. Without
that step snapshot writes fail with `EACCES` and pads silently stop persisting.

## State ownership

Getting this boundary wrong causes bugs that look like haunted UI, so it is
worth stating plainly:

| State                          | Lives in                      | Shared?        |
| ------------------------------ | ----------------------------- | -------------- |
| Document text                  | `Y.Text`                      | Yes            |
| Language, title, edit lock     | `Y.Map`                       | Yes            |
| Name, cursor colour, selection | Awareness                     | Yes, ephemeral |
| Theme, font size, gutters      | `localStorage`                | No             |
| Host token                     | `localStorage` + hash on disk | No             |

Themes are deliberately local. Nobody should have their editor recoloured
because a collaborator preferred dark mode.
