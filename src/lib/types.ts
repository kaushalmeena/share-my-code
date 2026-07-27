/**
 * `system` follows the OS preference and resolves to `paper` or `ink`.
 * Themes are a personal choice, so they live in local preferences rather than
 * in the shared room settings — nobody gets their editor recoloured by a peer.
 */
export type ThemeId = "system" | "paper" | "sepia" | "ink" | "slate";

/** A theme after `system` has been resolved. */
export type ResolvedThemeId = Exclude<ThemeId, "system">;

export type ConnectionStatus =
  "connecting" | "connected" | "reconnecting" | "offline";

/** Room-wide settings, mirrored in the shared `settings` Y.Map. */
export type RoomSettings = {
  /** Id from the language registry, e.g. `typescript`. */
  language: string;
  /** When false, only the host's edits are accepted — enforced by the relay. */
  guestsCanEdit: boolean;
  title: string;
};

/** What each participant broadcasts about themselves over awareness. */
export type Presence = {
  name: string;
  color: string;
};

/** A participant as rendered in the people list. */
export type Participant = Presence & {
  /** Yjs awareness client id. */
  id: number;
  isSelf: boolean;
};

/** Settings that stay in this browser and are never shared with the room. */
export type Preferences = {
  name: string;
  color: string;
  /**
   * True once the colour was picked deliberately in Settings. Until then the
   * room may reassign it on join to keep every cursor distinguishable.
   */
  colorPinned: boolean;
  /** Stable per-browser id, used only to seed colour selection. */
  seed: string;
  theme: ThemeId;
  fontSize: number;
  lineNumbers: boolean;
  wrapLines: boolean;
};
