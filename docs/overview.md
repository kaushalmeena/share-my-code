# Overview

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
