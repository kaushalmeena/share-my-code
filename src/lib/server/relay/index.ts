import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { HOST_TOKEN_PARAM, RELAY_PATH, ROOM_ID_PATTERN } from "$lib/config";
import { SnapshotStore } from "./persistence";
import { Room } from "./room";

/** Interval between keepalive pings. Proxies commonly idle out around 60s. */
const PING_INTERVAL_MS = 25_000;
/** Grace period before an empty room is unloaded from memory. */
const ROOM_IDLE_MS = 30_000;
/** Snapshots older than this are swept from disk. */
const ROOM_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

export type RelayOptions = {
  /** Where room snapshots are written. */
  storageDirectory?: string;
};

export type Relay = {
  /** Reserve a room id and hand back the one-time host token. */
  createRoom(): Promise<{ roomId: string; hostToken: string }>;
  /** Whether a room currently has any content or history on record. */
  roomExists(roomId: string): Promise<boolean>;
  close(): Promise<void>;
};

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/** Ids like `k3f9-2mxq-7bwd`: short, unambiguous, safe to read out loud. */
const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function generateRoomId(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(
    bytes,
    (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]
  );
  return [
    chars.slice(0, 4).join(""),
    chars.slice(4, 8).join(""),
    chars.slice(8, 12).join("")
  ].join("-");
}

/**
 * Mounts the collaboration relay on an existing HTTP server.
 *
 * The relay speaks the standard `y-websocket` protocol, so the browser can use
 * the stock client. It keeps an authoritative `Y.Doc` per room, which is what
 * makes reloads and late joins safe, and enforces the host's edit lock — a
 * client-side read-only editor alone would be trivially bypassed.
 */
export function attachRelay(
  httpServer: HttpServer,
  options: RelayOptions = {}
): Relay {
  const store = new SnapshotStore(
    options.storageDirectory ?? process.env.ROOM_STORAGE_DIR ?? ".data/rooms"
  );

  const rooms = new Map<string, Room>();
  const loading = new Map<string, Promise<Room>>();
  const idleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const wss = new WebSocketServer({ noServer: true });

  async function getRoom(roomId: string): Promise<Room> {
    const existing = rooms.get(roomId);
    if (existing) return existing;

    // Two sockets can race to open the same cold room; share one hydration.
    const inFlight = loading.get(roomId);
    if (inFlight) return inFlight;

    const pending = (async () => {
      const room = new Room(roomId, store);
      await room.hydrate();
      rooms.set(roomId, room);
      loading.delete(roomId);
      return room;
    })();

    loading.set(roomId, pending);
    return pending;
  }

  function cancelIdleTimer(roomId: string) {
    const timer = idleTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      idleTimers.delete(roomId);
    }
  }

  function scheduleIdleUnload(room: Room) {
    cancelIdleTimer(room.id);
    idleTimers.set(
      room.id,
      setTimeout(() => {
        idleTimers.delete(room.id);
        if (!room.isEmpty) return;
        rooms.delete(room.id);
        void room.destroy();
      }, ROOM_IDLE_MS)
    );
  }

  function parseRequest(request: IncomingMessage) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith(`${RELAY_PATH}/`)) return null;
    const roomId = decodeURIComponent(
      url.pathname.slice(RELAY_PATH.length + 1)
    );
    if (!ROOM_ID_PATTERN.test(roomId)) return null;
    return { roomId, hostToken: url.searchParams.get(HOST_TOKEN_PARAM) };
  }

  function onUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ): boolean {
    const parsed = parseRequest(request);
    if (!parsed) return false;

    wss.handleUpgrade(request, socket, head, (ws) => {
      void onConnection(ws, parsed.roomId, parsed.hostToken);
    });
    return true;
  }

  async function onConnection(
    socket: WebSocket,
    roomId: string,
    hostToken: string | null
  ) {
    let room: Room;
    try {
      room = await getRoom(roomId);
    } catch (error) {
      console.error(`[relay] failed to open room ${roomId}`, error);
      socket.close(1011, "Room unavailable");
      return;
    }

    // The socket may have died while the room was hydrating.
    if (socket.readyState !== socket.OPEN) return;

    cancelIdleTimer(roomId);

    const isHost = Boolean(
      hostToken &&
      room.hostTokenHash &&
      hashToken(hostToken) === room.hostTokenHash
    );
    const connection = room.addConnection(socket, isHost);

    socket.binaryType = "arraybuffer";

    socket.on("message", (data: ArrayBuffer | Buffer) => {
      try {
        const bytes =
          data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        room.handleMessage(connection, bytes);
      } catch (error) {
        console.error(`[relay] bad message in room ${roomId}`, error);
      }
    });

    socket.on("pong", () => {
      connection.alive = true;
    });

    const disconnect = () => {
      room.removeConnection(connection);
      if (room.isEmpty) scheduleIdleUnload(room);
    };

    socket.on("close", disconnect);
    socket.on("error", disconnect);
  }

  // Drop half-open sockets: without this, a client that vanished without a
  // FIN keeps a ghost cursor in the room forever.
  const pingTimer = setInterval(() => {
    for (const room of rooms.values()) {
      for (const connection of [...room.connections]) {
        if (!connection.alive) {
          room.removeConnection(connection);
          if (room.isEmpty) scheduleIdleUnload(room);
          continue;
        }
        connection.alive = false;
        try {
          connection.socket.ping();
        } catch {
          room.removeConnection(connection);
        }
      }
    }
  }, PING_INTERVAL_MS);

  const sweepTimer = setInterval(() => {
    void store.sweep(ROOM_MAX_AGE_MS).catch((error) => {
      console.error("[relay] snapshot sweep failed", error);
    });
  }, SWEEP_INTERVAL_MS);

  // Timers must not hold the process open on their own.
  pingTimer.unref?.();
  sweepTimer.unref?.();

  httpServer.on("upgrade", (request, socket, head) => {
    // Other upgrade listeners (Vite HMR) get their turn if this is not ours.
    if (!onUpgrade(request, socket as Duplex, head)) return;
  });

  return {
    async createRoom() {
      const roomId = generateRoomId();
      const hostToken = randomBytes(24).toString("base64url");
      const room = await getRoom(roomId);
      await room.claim(hashToken(hostToken));
      if (room.isEmpty) scheduleIdleUnload(room);
      return { roomId, hostToken };
    },

    async roomExists(roomId: string) {
      if (rooms.has(roomId)) return true;
      return (await store.loadMeta(roomId)) !== null;
    },

    async close() {
      clearInterval(pingTimer);
      clearInterval(sweepTimer);
      await Promise.all([...rooms.values()].map((room) => room.destroy()));
      rooms.clear();
      wss.close();
    }
  };
}
