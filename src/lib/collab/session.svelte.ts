import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import {
  DOC_KEYS,
  HOST_TOKEN_PARAM,
  RELAY_PATH,
  SETTINGS_KEYS,
  hostTokenStorageKey
} from "$lib/config";
import { DEFAULT_LANGUAGE_ID } from "$editor/languages";
import { MESSAGE_AUTH } from "$lib/protocol";
import { pickDistinctColor } from "$lib/utils/identity";
import type {
  ConnectionStatus,
  Participant,
  Presence,
  RoomSettings
} from "$lib/types";

/** What the session needs in order to choose a cursor colour. */
export type ColorIdentity = {
  /** Stable per-browser id, so simultaneous joiners start from different
   *  points in the palette. */
  seed: string;
  /** Whether the colour was chosen deliberately and must not be reassigned. */
  colorPinned: boolean;
};

/**
 * A live connection to one room.
 *
 * Three layers stack up here, and each one covers a different failure:
 *
 *  - **Y.Doc (CRDT)** merges concurrent edits without a central sequencer, so
 *    two people typing in the same spot never clobber each other.
 *  - **IndexedDB** keeps a local copy, so your own reload restores instantly
 *    and edits made while offline survive and merge on reconnect.
 *  - **The relay** holds the authoritative copy, so a late joiner — or someone
 *    on a different device — gets the full document even if every other tab
 *    is closed.
 *
 * Construct in the browser only, and always `destroy()` on teardown.
 */
export class RoomSession {
  readonly roomId: string;
  readonly doc: Y.Doc;
  readonly text: Y.Text;

  /** Live connection state, for the status indicator. */
  status = $state<ConnectionStatus>("connecting");
  /** True once the local IndexedDB copy has been read back. */
  restored = $state(false);
  /** True once the relay has sent us the authoritative state at least once. */
  synced = $state(false);
  /** Whether this browser holds the room's host token. */
  readonly isHost: boolean;
  /** Shared room settings, kept in step with the `settings` Y.Map. */
  settings = $state<RoomSettings>({
    language: DEFAULT_LANGUAGE_ID,
    guestsCanEdit: true,
    title: ""
  });
  /** Everyone currently in the room, self included. */
  participants = $state<Participant[]>([]);
  /**
   * Set when the relay refused one of our writes. Our local copy now contains
   * changes the room will never accept, and Yjs will hold every later change
   * behind that gap — so this connection cannot contribute again until the
   * local copy is discarded via `resetLocalState()`.
   */
  diverged = $state(false);
  /** Our display name as the room sees it. */
  name = $state("");
  /**
   * Our cursor colour as the room sees it. May differ from the stored
   * preference: on joining we take a colour nobody else is using, unless the
   * person picked one deliberately.
   */
  color = $state("");

  #provider: WebsocketProvider;
  #persistence: IndexeddbPersistence;
  #settingsMap: Y.Map<unknown>;
  #cleanups: Array<() => void> = [];
  #destroyed = false;
  #seed: string;
  #colorPinned: boolean;

  constructor(roomId: string, presence: Presence, identity: ColorIdentity) {
    this.roomId = roomId;
    this.#seed = identity.seed;
    this.#colorPinned = identity.colorPinned;
    this.doc = new Y.Doc();
    this.text = this.doc.getText(DOC_KEYS.content);
    this.#settingsMap = this.doc.getMap(DOC_KEYS.settings);

    const hostToken = readHostToken(roomId);
    this.isHost = Boolean(hostToken);

    // Local-first: read the cached copy before the network answers.
    this.#persistence = new IndexeddbPersistence(`smc:${roomId}`, this.doc);
    this.#persistence.once("synced", () => {
      this.restored = true;
    });

    this.#provider = new WebsocketProvider(
      relayUrl(),
      roomId,
      this.doc,
      hostToken
        ? { params: { [HOST_TOKEN_PARAM]: hostToken }, connect: true }
        : { connect: true }
    );

    this.#watchConnection();
    this.#watchRejections();
    this.#watchSettings();
    this.#watchPresence(presence);
  }

  // -- reactive views -------------------------------------------------------

  /** Whether this participant may type. Mirrors what the relay enforces. */
  get canEdit(): boolean {
    return this.isHost || this.settings.guestsCanEdit;
  }

  get awareness() {
    return this.#provider.awareness;
  }

  /** Content is safe to show once either layer has answered. */
  get ready(): boolean {
    return this.restored || this.synced;
  }

  // -- wiring ---------------------------------------------------------------

  #watchConnection() {
    const onStatus = ({ status }: { status: string }) => {
      if (status === "connected") {
        this.status = "connected";
      } else if (
        this.status === "connected" ||
        this.status === "reconnecting"
      ) {
        // A drop after a successful connect: y-websocket retries on its own.
        this.status = "reconnecting";
      } else {
        this.status = "connecting";
      }
    };

    const onSync = (isSynced: boolean) => {
      if (isSynced) this.synced = true;
    };

    const onOffline = () => {
      this.status = "offline";
    };
    const onOnline = () => {
      // Nudge the provider instead of waiting out its backoff.
      if (this.status === "offline") this.status = "reconnecting";
      this.#provider.connect();
    };

    this.#provider.on("status", onStatus);
    this.#provider.on("sync", onSync);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    this.#cleanups.push(() => {
      this.#provider.off("status", onStatus);
      this.#provider.off("sync", onSync);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    });

    if (!navigator.onLine) this.status = "offline";
  }

  /**
   * Notice writes the relay refused.
   *
   * Normally unreachable: the editor is read-only for guests when a pad is
   * locked. It fires in one narrow race — the host locks the pad in the
   * moment between a keystroke and its update reaching the relay.
   *
   * `y-websocket` only logs permission denials, so we swap in our own handler.
   * The handler table is shared module state, so it has to be copied onto this
   * instance before being touched.
   */
  #watchRejections() {
    const provider = this.#provider as WebsocketProvider & {
      messageHandlers: unknown[];
    };
    provider.messageHandlers = [...provider.messageHandlers];
    provider.messageHandlers[MESSAGE_AUTH] = () => {
      this.diverged = true;
    };
  }

  /**
   * Throw away this browser's copy of the room and reload from the relay.
   *
   * The cached copy is what holds the rejected changes, so clearing IndexedDB
   * is the part that matters — a plain reload would restore the same gap.
   */
  async resetLocalState(): Promise<void> {
    try {
      await this.#persistence.clearData();
    } catch {
      // If the cache cannot be cleared, the reload below is still worth doing.
    }
    location.reload();
  }

  #watchSettings() {
    const read = () => {
      this.settings = {
        language:
          asString(this.#settingsMap.get(SETTINGS_KEYS.language)) ??
          DEFAULT_LANGUAGE_ID,
        guestsCanEdit:
          this.#settingsMap.get(SETTINGS_KEYS.guestsCanEdit) !== false,
        title: asString(this.#settingsMap.get(SETTINGS_KEYS.title)) ?? ""
      };
    };

    read();
    this.#settingsMap.observe(read);
    this.#cleanups.push(() => this.#settingsMap.unobserve(read));
  }

  #watchPresence(presence: Presence) {
    const { awareness } = this.#provider;
    this.#applyPresence(presence);

    // Claim a colour nobody else is using, once the room has told us who is
    // already here. `synced` is the first moment that set is trustworthy —
    // resolving earlier would just compare against an empty room.
    if (!this.#colorPinned) {
      const claim = () => {
        const taken = this.#colorsInUse();
        const color = pickDistinctColor(this.#seed, taken);
        if (color !== this.color) {
          this.#applyPresence({ name: this.name, color });
        }
      };
      if (this.synced) claim();
      else this.#provider.once("sync", claim);
    }

    const read = () => {
      const self = awareness.clientID;
      const next: Participant[] = [];
      for (const [id, state] of awareness.getStates()) {
        const user = (state as { user?: Partial<Presence> } | undefined)?.user;
        if (!user?.name) continue;
        next.push({
          id,
          name: user.name,
          color: user.color ?? "#888888",
          isSelf: id === self
        });
      }
      // Stable order so the list does not shuffle on every keystroke.
      next.sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || a.id - b.id);
      this.participants = next;
    };

    read();
    awareness.on("change", read);
    this.#cleanups.push(() => awareness.off("change", read));
  }

  /** Colours currently claimed by everyone except us. */
  #colorsInUse(): string[] {
    const self = this.#provider.awareness.clientID;
    const colors: string[] = [];
    for (const [id, state] of this.#provider.awareness.getStates()) {
      if (id === self) continue;
      const user = (state as { user?: Partial<Presence> } | undefined)?.user;
      if (user?.color) colors.push(user.color);
    }
    return colors;
  }

  #applyPresence(presence: Presence): void {
    this.name = presence.name;
    this.color = presence.color;
    this.#provider.awareness.setLocalStateField("user", {
      name: presence.name,
      color: presence.color,
      // y-codemirror.next tints selections with this; 20% alpha reads well
      // against both the light and dark canvases.
      colorLight: `${presence.color}33`
    });
  }

  // -- mutations ------------------------------------------------------------

  /**
   * Update your own display name and colour for everyone in the room.
   *
   * `pinColor` marks the colour as a deliberate choice, so a later join never
   * reassigns it out from under the person who picked it.
   */
  setPresence(presence: Presence, pinColor = false): void {
    if (pinColor) this.#colorPinned = true;
    this.#applyPresence(presence);
  }

  setLanguage(language: string): void {
    this.#settingsMap.set(SETTINGS_KEYS.language, language);
  }

  setTitle(title: string): void {
    this.#settingsMap.set(SETTINGS_KEYS.title, title);
  }

  /** Host only. Guests get rejected by the relay, so do not offer them the UI. */
  setGuestsCanEdit(allowed: boolean): void {
    this.#settingsMap.set(SETTINGS_KEYS.guestsCanEdit, allowed);
  }

  /** Replace the whole document, e.g. after an upload. */
  replaceContent(content: string): void {
    this.doc.transact(() => {
      this.text.delete(0, this.text.length);
      this.text.insert(0, content);
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    for (const cleanup of this.#cleanups) cleanup();
    this.#cleanups = [];
    this.#provider.destroy();
    void this.#persistence.destroy();
    this.doc.destroy();
  }
}

function relayUrl(): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}${RELAY_PATH}`;
}

function readHostToken(roomId: string): string | null {
  try {
    return localStorage.getItem(hostTokenStorageKey(roomId));
  } catch {
    return null;
  }
}

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
