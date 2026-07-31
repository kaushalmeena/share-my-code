# Module layout and scaling

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
