# Wire protocol and permissions

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

The host holds two distinct privileges, enforced differently because the
failure modes differ:

| Privilege                                               | Enforcement         |
| ------------------------------------------------------- | ------------------- |
| Lock the pad (_Guests can edit_ off)                    | Reject guest writes |
| Change room settings — language, title, the lock itself | Revert guest writes |

Both are enforced server-side. A disabled control is a UI convention anyone can
undo with devtools, so neither is left to the client.

A room with no registered host stays open on both counts — nobody could have
locked it, and there is no host to reserve settings for. Clients learn which
case they are in from a relay-written `hostClaimed` flag in the settings map;
without it a guest could not tell "not the host" from "no host exists".

### Reject versus revert

Rejecting a write and reverting it are not interchangeable.

**Content** is rejected. Dropping the update is the only option — the relay
cannot un-type someone's characters without inventing an edit.

**Settings** are reverted: the write lands, then the relay immediately puts the
old value back and broadcasts the correction. Rejecting them instead would be
actively worse for two reasons. A dropped update leaves a permanent gap in that
client's clock sequence and mutes everything they send afterwards (below). And
settings changes travel in the same updates as ordinary text, so refusing one
could discard innocent typing with it. Reverting keeps the guest in sync; the
worst case is a brief flicker on a client that ignored its own disabled
controls.

The relay deliberately sends no permission-denied message for a reverted
setting. That message marks a client as diverged and prompts a reload, which
would be wrong here — the correction already restored sync.

### The one race

A guest can be mid-keystroke when the host locks the pad, so an update already
in flight gets rejected. That leaves the causal gap described above, and no
reply from the server can fill it, because the server is refusing exactly those
items. The relay sends a permission-denied message; the client sets
`RoomSession.diverged`, and the UI offers a reset that clears IndexedDB and
reloads from the authoritative copy. Discarding the guest's unsent edits is the
correct outcome — the host's lock wins.

`scripts/check-locks.js` exercises all of this against a running server.
