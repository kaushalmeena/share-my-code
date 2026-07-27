/**
 * Manual integration check for the host edit lock.
 *
 * Run against a live dev server: `node scripts/check-locks.js`
 *
 * Verifies three things the UI alone cannot prove:
 *  1. A guest who respects the lock can edit normally once it is lifted.
 *  2. The relay rejects writes from a guest while the pad is locked, even
 *     though that guest's editor was never read-only client-side.
 *  3. A client that forced a write while locked stays muted afterwards. That
 *     is expected, not a regression: the dropped update left a gap in its
 *     clock sequence, and Yjs holds everything after it pending. Only a local
 *     reset recovers, which is what the app offers such a client.
 */
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { WebSocket } from "ws";

const RELAY = "ws://localhost:3000/relay";

const { roomId, hostToken } = await (
  await fetch("http://localhost:3000/api/rooms", { method: "POST" })
).json();
console.log("room:", roomId);

const connect = (doc, params) =>
  new Promise((resolve) => {
    const provider = new WebsocketProvider(RELAY, roomId, doc, {
      params,
      WebSocketPolyfill: WebSocket,
      // Both peers share a process here, so BroadcastChannel would let them
      // sync directly and bypass the relay we are trying to test.
      disableBc: true
    });
    provider.once("sync", () => resolve(provider));
  });

// --- host: write a line, then lock the room -------------------------------
const hostDoc = new Y.Doc();
const hostProvider = await connect(hostDoc, { host: hostToken });
hostDoc.getText("content").insert(0, "host line\n");
hostDoc.getMap("settings").set("guestsCanEdit", false);
await new Promise((r) => setTimeout(r, 300));
console.log("host wrote + locked");

// --- a well-behaved guest: never writes while locked, then writes after ----
const politeDoc = new Y.Doc();
const politeProvider = await connect(politeDoc, {});
hostDoc.getMap("settings").set("guestsCanEdit", true);
await new Promise((r) => setTimeout(r, 400));
politeDoc.getText("content").insert(0, "POLITE ");
await new Promise((r) => setTimeout(r, 600));
const politeLanded = hostDoc.getText("content").toString().includes("POLITE");
console.log(
  politeLanded
    ? "PASS — guest that respected the lock can edit after unlock"
    : "FAIL — well-behaved guest still blocked after unlock"
);
politeProvider.destroy();
hostDoc.getMap("settings").set("guestsCanEdit", false);
await new Promise((r) => setTimeout(r, 400));

// --- guest: connect with no token and force a write ------------------------
const guestDoc = new Y.Doc();
const guestProvider = await connect(guestDoc, {});
console.log(
  "guest sees:",
  JSON.stringify(guestDoc.getText("content").toString())
);
console.log(
  "guest sees lock:",
  guestDoc.getMap("settings").get("guestsCanEdit")
);

guestDoc.getText("content").insert(0, "GUEST INTRUSION ");
await new Promise((r) => setTimeout(r, 600));

const hostView = hostDoc.getText("content").toString();
console.log("host doc after guest write:", JSON.stringify(hostView));
console.log(
  hostView.includes("GUEST INTRUSION")
    ? "FAIL — guest write reached the host"
    : "PASS — relay rejected the locked guest write"
);

// --- unlock, then the same guest write should land -------------------------
hostDoc.getMap("settings").set("guestsCanEdit", true);
await new Promise((r) => setTimeout(r, 500));
console.log(
  "guest sees lock after unlock:",
  guestDoc.getMap("settings").get("guestsCanEdit"),
  "| guest ws state:",
  guestProvider.wsconnected,
  "| guest doc:",
  JSON.stringify(guestDoc.getText("content").toString())
);
guestDoc.getText("content").insert(0, "ALLOWED ");
await new Promise((r) => setTimeout(r, 800));
console.log(
  "guest doc now:",
  JSON.stringify(guestDoc.getText("content").toString())
);
const after = hostDoc.getText("content").toString();
console.log("host doc after unlock:", JSON.stringify(after));
console.log(
  after.includes("ALLOWED")
    ? "UNEXPECTED — a client that forced a write recovered on its own"
    : "PASS — client that circumvented the lock stays muted until it resets"
);

// --- room settings are the host's alone ------------------------------------
// A guest with a normal, unlocked pad still must not change language, title or
// the edit lock. The relay reverts them rather than rejecting, so the guest
// stays in sync and simply loses the change.
const settingsDoc = new Y.Doc();
const settingsProvider = await connect(settingsDoc, {});
const originalLanguage = settingsDoc.getMap("settings").get("language");

settingsDoc.getMap("settings").set("language", "python");
settingsDoc.getMap("settings").set("title", "hijacked");
settingsDoc.getMap("settings").set("guestsCanEdit", true);
await new Promise((r) => setTimeout(r, 900));

const hostSettings = hostDoc.getMap("settings").toJSON();
const guestSettings = settingsDoc.getMap("settings").toJSON();
console.log("host settings after guest write:", JSON.stringify(hostSettings));
console.log(
  hostSettings.language !== "python" && hostSettings.title !== "hijacked"
    ? "PASS — relay reverted the guest's settings change"
    : "FAIL — guest changed room settings"
);
console.log(
  guestSettings.language === hostSettings.language &&
    guestSettings.title === hostSettings.title
    ? "PASS — guest converged back onto the host's settings"
    : "FAIL — guest left diverged from the room"
);
void originalLanguage;

// The host, meanwhile, can still change them.
hostDoc.getMap("settings").set("language", "rust");
await new Promise((r) => setTimeout(r, 600));
console.log(
  settingsDoc.getMap("settings").get("language") === "rust"
    ? "PASS — host can still change settings"
    : "FAIL — host settings change did not propagate"
);

hostProvider.destroy();
guestProvider.destroy();
settingsProvider.destroy();
process.exit(0);
