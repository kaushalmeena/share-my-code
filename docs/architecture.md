# Architecture

How ShareMyCode keeps several people editing one document without losing
anything. Start here before changing sync, persistence, or permissions.

## The problem

A shared code pad has to answer four questions, and the interesting part is
that no single mechanism answers all of them:

1. Two people type in the same place at once. Who wins?
2. Someone reloads. Where does their text come from?
3. Someone opens the link an hour later, when every other tab is closed.
4. The host wants the pad read-only. What stops a guest from typing anyway?

## Three layers

| Layer                          | Answers | Fails at                                     |
| ------------------------------ | ------- | -------------------------------------------- |
| **Yjs CRDT**                   | 1       | Knows nothing about storage or transport     |
| **IndexedDB** (`y-indexeddb`)  | 2       | Only this browser; a new device sees nothing |
| **Relay** (`y-websocket` wire) | 3, 4    | Needs a server, unlike pure peer-to-peer     |

Each layer covers the previous one's blind spot. Removing any one of them
breaks a guarantee the product depends on.

### Yjs — conflict resolution

The document is a `Y.Text` inside a `Y.Doc`. Yjs is a CRDT: concurrent edits
converge to the same result regardless of arrival order, with no central
sequencer deciding a winner. Two people typing on one line both keep their
characters.

Room settings live in a `Y.Map` in the same document, so language, title, and
the edit lock replicate through the same channel as the text and cannot drift
out of step with it.

### IndexedDB — local durability

`IndexeddbPersistence` mirrors the document into the browser. This is what
makes a reload feel instant and lets editing continue with the network down;
offline changes merge on reconnect. It is per-browser, so it cannot help a new
participant.

### Relay — the authoritative copy

`src/lib/server/relay/` is a small WebSocket server, mounted on the app's own
HTTP server. No third-party service. It holds a `Y.Doc` per room and writes
debounced snapshots to disk, so a late joiner, a second device, or a server
restart all recover the full pad.

## Why not peer-to-peer

WebRTC was considered and rejected. It still needs a signalling server to
introduce peers, TURN relays for participants behind strict NATs, and — the
decisive part — a pad exists only while at least one tab is open. Close every
tab and the content is gone; open the link later and you get an empty
document. The relay is what makes "nothing gets lost" true.

## Wire protocol

The relay implements the standard `y-websocket` protocol, so the browser uses
the stock client with no patches. Message types are fixed by that client and
live in `src/lib/protocol.ts` — shared by both sides so they cannot disagree:

| Type | Name             | Direction |
| ---- | ---------------- | --------- |
| `0`  | `sync`           | both      |
| `1`  | `awareness`      | both      |
| `2`  | `auth`           | server    |
| `3`  | `queryAwareness` | client    |

Rooms hang off `/relay/<roomId>`; the host token rides as a query parameter.

### The sync handshake, and one subtlety

On connect, the client always sends sync step 1 (its state vector) and the
relay replies with step 2 (everything the client lacks). That alone is enough
to deliver content.

The relay _also_ sends its own step 1 — but only to connections allowed to
write. That message is an **invitation to push**: the client answers with a
step 2 containing anything the server is missing, which is how a client's
IndexedDB copy can repopulate a room whose snapshot was lost.

Skipping that invitation for read-only guests is not an optimisation, it is a
correctness fix. A dropped step 2 leaves a permanent gap in that client's clock
sequence, and Yjs holds _every_ later update from them pending on the missing
dependency. One rejected message would mute that participant for good, even
after the host unlocked the room. Never inviting the push avoids the situation
entirely.

See `Room#addConnection` in `src/lib/server/relay/room.ts`.

## Permissions

Creating a pad mints a room id and a one-time host token:

```
POST /api/rooms  →  { roomId, hostToken }
```

The token is stored in the creator's `localStorage`. The server persists only
its SHA-256, never the token itself. The client sends it as a query parameter
when opening the relay socket; a matching hash marks that connection as host.

When the host turns off _Guests can edit_, the relay drops write messages from
every non-host connection. Enforcing this server-side matters: a read-only
editor is a UI convention that anyone can bypass with devtools.

A room with no registered host stays open — nobody could have locked it.

### The one race

A guest can be mid-keystroke when the host locks the pad, so an update already
in flight gets rejected. That leaves the causal gap described above, and no
reply from the server can fill it, because the server is refusing exactly those
items. The relay sends a permission-denied message; the client sets
`RoomSession.diverged`, and the UI offers a reset that clears IndexedDB and
reloads from the authoritative copy. Discarding the guest's unsent edits is the
correct outcome — the host's lock wins.

`scripts/check-locks.js` exercises all of this against a running server.

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

## Module layout

```
src/
  lib/
    collab/      RoomSession — Y.Doc, providers, presence, settings
    components/  UI, with primitives under ui/
    editor/      CodeMirror extensions, themes, language registry
    server/
      relay/     index.ts      attach to an HTTP server, room lifecycle
                 room.ts       one document: sync, awareness, permissions
                 persistence.ts snapshot store and sweeper
                 registry.ts   globalThis handoff to SvelteKit endpoints
                 vite-plugin.ts dev-time mounting
    stores/      Local per-browser preferences
    config.ts    Values shared by client and relay
    protocol.ts  Wire message types shared by client and relay
  routes/        Landing page, /r/[room], /api/rooms
```

`RoomSession` (`collab/session.svelte.ts`) is the only thing components touch.
It owns the `Y.Doc`, both providers, and awareness, and exposes reactive state
via runes. Components never import Yjs directly.

## Scaling

The relay keeps rooms in memory on one process, so it does not scale
horizontally as written. **Run a single instance.** Two would each hold their
own copy of the same room and accept edits into it, and because neither ever
sees the other's updates, the two copies diverge permanently — whichever
instance a participant happened to connect to decides what they see. Nothing
warns you; it looks like edits randomly failing to arrive.

Options, roughly in order of effort:

1. Pin a room to an instance with a sticky hash on the room id.
2. Move snapshots to shared storage (S3, Postgres) and add a pub/sub fan-out
   between instances.
3. Replace the relay with a per-room Durable Object.

For a single instance with a persistent disk, none of this is needed. A code
pad is not a high-traffic workload: rooms are small, unload 30s after the last
participant leaves, and the relay only forwards binary diffs.
