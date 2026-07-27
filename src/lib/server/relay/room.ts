import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";
import type { WebSocket } from "ws";
import { DOC_KEYS, SETTINGS_KEYS } from "$lib/config";
import {
  AUTH_PERMISSION_DENIED,
  MESSAGE_AWARENESS,
  MESSAGE_AUTH,
  MESSAGE_QUERY_AWARENESS,
  MESSAGE_SYNC
} from "$lib/protocol";
import type { SnapshotStore } from "./persistence";

/** How long to coalesce document changes before writing a snapshot. */
const PERSIST_DEBOUNCE_MS = 2_000;
/** Hard ceiling, so a room under continuous editing still gets written. */
const PERSIST_MAX_WAIT_MS = 10_000;

/** Origin tag for updates we applied from disk, so they are not re-broadcast. */
const HYDRATION_ORIGIN = Symbol("hydration");

export type Connection = {
  socket: WebSocket;
  isHost: boolean;
  /** Awareness ids this socket has announced, so we can retract them on close. */
  awarenessIds: Set<number>;
  alive: boolean;
};

/**
 * One collaborative document, its awareness state, and every socket attached
 * to it. The relay owns a `Room` per active room id and drops it once the last
 * connection leaves and the final snapshot is flushed.
 */
export class Room {
  readonly id: string;
  readonly doc = new Y.Doc();
  readonly awareness: awarenessProtocol.Awareness;
  readonly connections = new Set<Connection>();

  /** SHA-256 of the host token, or null for rooms nobody has claimed. */
  hostTokenHash: string | null = null;

  #store: SnapshotStore;
  #persistTimer: ReturnType<typeof setTimeout> | null = null;
  #persistDeadline: ReturnType<typeof setTimeout> | null = null;
  #dirty = false;
  #createdAt = Date.now();
  #destroyed = false;

  constructor(id: string, store: SnapshotStore) {
    this.id = id;
    this.#store = store;
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    // The relay is a conduit, not a participant.
    this.awareness.setLocalState(null);

    this.doc.on("update", this.#onDocUpdate);
    this.awareness.on("update", this.#onAwarenessUpdate);
  }

  /** Restore a previous snapshot, if one exists. Call once, before serving. */
  async hydrate(): Promise<void> {
    const [state, meta] = await Promise.all([
      this.#store.loadDoc(this.id),
      this.#store.loadMeta(this.id)
    ]);
    if (state) {
      Y.applyUpdate(this.doc, state, HYDRATION_ORIGIN);
    }
    if (meta) {
      this.hostTokenHash = meta.hostTokenHash;
      this.#createdAt = meta.createdAt;
    }
    // Reading our own snapshot back is not a change worth writing out again.
    this.#dirty = false;
    this.#clearPersistTimers();
  }

  /**
   * Whether guests may write. Rooms with no registered host stay open — there
   * is nobody who could have locked them.
   */
  get guestsCanEdit(): boolean {
    if (!this.hostTokenHash) return true;
    const settings = this.doc.getMap(DOC_KEYS.settings);
    // Unset means "never locked".
    return settings.get(SETTINGS_KEYS.guestsCanEdit) !== false;
  }

  get isEmpty(): boolean {
    return this.connections.size === 0;
  }

  // -- messaging ------------------------------------------------------------

  #send(connection: Connection, payload: Uint8Array) {
    const { socket } = connection;
    // 0 = CONNECTING, 1 = OPEN.
    if (socket.readyState !== 0 && socket.readyState !== 1) {
      this.removeConnection(connection);
      return;
    }
    try {
      socket.send(payload);
    } catch {
      this.removeConnection(connection);
    }
  }

  #broadcast(payload: Uint8Array, except?: Connection) {
    for (const connection of [...this.connections]) {
      if (connection !== except) this.#send(connection, payload);
    }
  }

  /** Every document change funnels through here — including ones we applied
   *  on a socket's behalf, whose origin is that `Connection`. */
  #onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== HYDRATION_ORIGIN) this.#schedulePersist();
    if (origin === HYDRATION_ORIGIN) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    this.#broadcast(encoding.toUint8Array(encoder), this.#asConnection(origin));
  };

  #onAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    const changed = [...changes.added, ...changes.updated, ...changes.removed];
    if (changed.length === 0) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed)
    );
    this.#broadcast(encoding.toUint8Array(encoder), this.#asConnection(origin));
  };

  #asConnection(origin: unknown): Connection | undefined {
    return origin && this.connections.has(origin as Connection)
      ? (origin as Connection)
      : undefined;
  }

  // -- connections ----------------------------------------------------------

  addConnection(socket: WebSocket, isHost: boolean): Connection {
    const connection: Connection = {
      socket,
      isHost,
      awarenessIds: new Set(),
      alive: true
    };
    this.connections.add(connection);

    // Offering our state vector is an *invitation to push*: the client answers
    // with sync step 2 containing anything we lack. That is how a client's
    // IndexedDB copy can repopulate a room whose snapshot was lost, so we want
    // it — but only from connections allowed to write.
    //
    // Skipping it for read-only guests matters more than it looks. A dropped
    // step 2 would leave a permanent gap in that client's clock sequence, and
    // Yjs holds every later update from them pending on the missing
    // dependency — so one rejected message would mute them for good, even
    // after the host unlocked the room. Never inviting the push avoids that
    // entirely; they still receive content by way of their own step 1.
    if (isHost || this.guestsCanEdit) {
      const syncEncoder = encoding.createEncoder();
      encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(syncEncoder, this.doc);
      this.#send(connection, encoding.toUint8Array(syncEncoder));
    }

    // Bring the newcomer up to date on who else is already here.
    this.#sendAwarenessSnapshot(connection);

    return connection;
  }

  removeConnection(connection: Connection): void {
    if (!this.connections.delete(connection)) return;
    if (connection.awarenessIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        [...connection.awarenessIds],
        null
      );
    }
    try {
      connection.socket.close();
    } catch {
      // Already gone.
    }
  }

  handleMessage(connection: Connection, data: Uint8Array): void {
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC:
        this.#handleSync(connection, decoder);
        break;
      case MESSAGE_AWARENESS:
        this.#handleAwareness(connection, decoder);
        break;
      case MESSAGE_QUERY_AWARENESS:
        this.#sendAwarenessSnapshot(connection);
        break;
      default:
        // Ignore unknown types rather than dropping the socket, so a slightly
        // older or newer client can still talk to us.
        break;
    }
  }

  #handleSync(connection: Connection, decoder: decoding.Decoder) {
    // Peek at the sync sub-type without consuming it.
    const syncType = decoding.peekVarUint(decoder);
    const isWrite =
      syncType === syncProtocol.messageYjsUpdate ||
      syncType === syncProtocol.messageYjsSyncStep2;

    if (isWrite && !connection.isHost && !this.guestsCanEdit) {
      this.#denyWrite(connection);
      return;
    }

    // Applying with `connection` as the origin is what lets `#onDocUpdate`
    // fan the change out to everyone *except* the sender.
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.readSyncMessage(decoder, encoder, this.doc, connection);

    // Only sync step 1 produces a reply; skip empty envelopes.
    if (encoding.length(encoder) > 1) {
      this.#send(connection, encoding.toUint8Array(encoder));
    }
  }

  #handleAwareness(connection: Connection, decoder: decoding.Decoder) {
    const update = decoding.readVarUint8Array(decoder);
    for (const id of decodeAwarenessClientIds(update)) {
      connection.awarenessIds.add(id);
    }
    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, connection);
  }

  #sendAwarenessSnapshot(connection: Connection) {
    const states = this.awareness.getStates();
    if (states.size === 0) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
        ...states.keys()
      ])
    );
    this.#send(connection, encoding.toUint8Array(encoder));
  }

  /**
   * Reject a write from a read-only connection.
   *
   * Reached only by a client that ignored the lock — the editor is read-only
   * for guests, and `addConnection` never invites them to push. That makes this
   * a backstop against a modified client rather than part of a normal flow,
   * which is why it does not try to repair the sender: their dropped update has
   * already left a gap in their clock sequence that no reply can fill. The
   * client is told, and it is up to it to reset its local state.
   */
  #denyWrite(connection: Connection) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AUTH);
    encoding.writeVarUint(encoder, AUTH_PERMISSION_DENIED);
    encoding.writeVarString(encoder, "This pad is read-only");
    this.#send(connection, encoding.toUint8Array(encoder));
  }

  // -- persistence ----------------------------------------------------------

  #schedulePersist() {
    this.#dirty = true;
    if (this.#persistTimer) clearTimeout(this.#persistTimer);
    this.#persistTimer = setTimeout(
      () => void this.flush(),
      PERSIST_DEBOUNCE_MS
    );
    this.#persistDeadline ??= setTimeout(
      () => void this.flush(),
      PERSIST_MAX_WAIT_MS
    );
  }

  #clearPersistTimers() {
    if (this.#persistTimer) clearTimeout(this.#persistTimer);
    if (this.#persistDeadline) clearTimeout(this.#persistDeadline);
    this.#persistTimer = null;
    this.#persistDeadline = null;
  }

  /** Write current state to disk now. Cheap no-op when nothing changed. */
  async flush(): Promise<void> {
    this.#clearPersistTimers();
    if (!this.#dirty) return;
    this.#dirty = false;
    await Promise.all([
      this.#store.saveDoc(this.id, Y.encodeStateAsUpdate(this.doc)),
      this.#store.saveMeta(this.id, {
        hostTokenHash: this.hostTokenHash,
        createdAt: this.#createdAt,
        updatedAt: Date.now()
      })
    ]);
  }

  /** Record ownership of this room and persist it right away. */
  async claim(hostTokenHash: string): Promise<void> {
    this.hostTokenHash = hostTokenHash;
    this.#dirty = true;
    await this.flush();
  }

  async destroy(): Promise<void> {
    if (this.#destroyed) return;
    this.#destroyed = true;
    await this.flush();
    this.doc.off("update", this.#onDocUpdate);
    this.awareness.off("update", this.#onAwarenessUpdate);
    this.awareness.destroy();
    this.doc.destroy();
  }
}

/**
 * Read the client ids out of an encoded awareness update.
 *
 * `y-protocols` does not expose this, but the encoding is stable: a var-uint
 * count followed by `(clientId, clock, jsonState)` triples.
 */
function decodeAwarenessClientIds(update: Uint8Array): number[] {
  const decoder = decoding.createDecoder(update);
  const count = decoding.readVarUint(decoder);
  const ids: number[] = [];
  for (let i = 0; i < count; i += 1) {
    ids.push(decoding.readVarUint(decoder));
    decoding.readVarUint(decoder); // clock
    decoding.readVarString(decoder); // state json
  }
  return ids;
}
