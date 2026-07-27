/**
 * Values shared by the browser client and the relay server. Keep this module
 * dependency-free so both sides can import it without pulling in a runtime.
 */

/** Path the relay WebSocket server is mounted on. Rooms hang off it: `/relay/<roomId>`. */
export const RELAY_PATH = "/relay";

/** Query parameter carrying the host's proof-of-ownership token. */
export const HOST_TOKEN_PARAM = "host";

/** Yjs shared-type keys. Both sides must agree on these. */
export const DOC_KEYS = {
  /** The code itself. */
  content: "content",
  /** Room-wide settings every participant sees. */
  settings: "settings"
} as const;

/** Keys inside the settings `Y.Map`. Theme is deliberately absent: it is a
 *  personal preference, not a room-wide one. */
export const SETTINGS_KEYS = {
  language: "language",
  guestsCanEdit: "guestsCanEdit",
  title: "title"
} as const;

/** Room ids look like `abcd-efgh-jkmn` — short enough to read aloud. */
export const ROOM_ID_PATTERN = /^[a-z0-9]{4}(-[a-z0-9]{4}){2}$/;

/** localStorage key holding the host token for a room the user created. */
export const hostTokenStorageKey = (roomId: string) => `smc:host:${roomId}`;

/** localStorage key holding the viewer's own display preferences. */
export const PREFERENCES_STORAGE_KEY = "smc:preferences";
