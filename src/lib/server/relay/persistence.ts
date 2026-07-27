import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Snapshot store for room documents.
 *
 * Rooms live in memory while someone is connected; this is what lets a late
 * joiner — or everyone at once, after a server restart — get the content back.
 * Each room is two files: the encoded Y.Doc state and a small metadata sidecar
 * holding the host token hash.
 */

export type RoomMeta = {
  /** SHA-256 of the host token. The token itself is never written to disk. */
  hostTokenHash: string | null;
  createdAt: number;
  updatedAt: number;
};

const encoder = new TextEncoder();

export class SnapshotStore {
  readonly #directory: string;

  constructor(directory: string) {
    this.#directory = directory;
  }

  #docPath(roomId: string) {
    return join(this.#directory, `${roomId}.bin`);
  }

  #metaPath(roomId: string) {
    return join(this.#directory, `${roomId}.json`);
  }

  async #ensureDirectory(path: string) {
    await mkdir(dirname(path), { recursive: true });
  }

  async loadDoc(roomId: string): Promise<Uint8Array | null> {
    try {
      const buffer = await readFile(this.#docPath(roomId));
      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  }

  async saveDoc(roomId: string, state: Uint8Array): Promise<void> {
    const path = this.#docPath(roomId);
    await this.#ensureDirectory(path);
    await writeFile(path, state);
  }

  async loadMeta(roomId: string): Promise<RoomMeta | null> {
    try {
      const raw = await readFile(this.#metaPath(roomId), "utf8");
      return JSON.parse(raw) as RoomMeta;
    } catch {
      return null;
    }
  }

  async saveMeta(roomId: string, meta: RoomMeta): Promise<void> {
    const path = this.#metaPath(roomId);
    await this.#ensureDirectory(path);
    await writeFile(path, encoder.encode(JSON.stringify(meta)));
  }

  async remove(roomId: string): Promise<void> {
    await Promise.all([
      rm(this.#docPath(roomId), { force: true }),
      rm(this.#metaPath(roomId), { force: true })
    ]);
  }

  /** Delete rooms untouched for longer than `maxAgeMs`. Returns how many went. */
  async sweep(maxAgeMs: number): Promise<number> {
    let removed = 0;
    let entries: string[];
    try {
      entries = await readdir(this.#directory);
    } catch {
      return 0;
    }

    const cutoff = Date.now() - maxAgeMs;
    for (const entry of entries) {
      if (!entry.endsWith(".bin")) continue;
      const roomId = entry.slice(0, -".bin".length);
      try {
        const info = await stat(join(this.#directory, entry));
        if (info.mtimeMs < cutoff) {
          await this.remove(roomId);
          removed += 1;
        }
      } catch {
        // Raced with another sweep or a manual delete; nothing to do.
      }
    }
    return removed;
  }
}
