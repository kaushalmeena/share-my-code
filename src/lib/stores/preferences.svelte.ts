import { browser } from "$app/environment";
import { PREFERENCES_STORAGE_KEY } from "$lib/config";
import { randomColor, randomName } from "$lib/utils/identity";
import type { Preferences, ResolvedThemeId, ThemeId } from "$lib/types";

const DEFAULTS: Omit<Preferences, "name" | "color" | "seed"> = {
  theme: "system",
  fontSize: 14,
  lineNumbers: true,
  wrapLines: false,
  colorPinned: false
};

/** Stable id for this browser. Only ever used to seed colour selection. */
function newSeed(): string {
  if (browser && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function load(): Preferences {
  const fallback: Preferences = {
    ...DEFAULTS,
    name: randomName(),
    color: randomColor(),
    seed: newSeed()
  };
  if (!browser) return fallback;

  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      ...fallback,
      ...parsed,
      // Guard against a hand-edited or outdated payload.
      fontSize: clampFontSize(parsed.fontSize ?? fallback.fontSize),
      // Preferences saved before seeds existed still need one.
      seed: parsed.seed || fallback.seed
    };
  } catch {
    return fallback;
  }
}

export const MIN_FONT_SIZE = 11;
export const MAX_FONT_SIZE = 22;

export const clampFontSize = (size: number) =>
  Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)));

/**
 * Per-browser settings: who you are, and how the editor looks to you.
 *
 * Deliberately separate from room settings — changing your theme or font size
 * must never alter what anyone else sees.
 */
class PreferencesStore {
  #value = $state<Preferences>(load());
  #systemPrefersDark = $state(false);

  constructor() {
    if (!browser) return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    this.#systemPrefersDark = query.matches;
    query.addEventListener("change", (event) => {
      this.#systemPrefersDark = event.matches;
    });

    // Persist on change and keep the document theme attribute in step.
    $effect.root(() => {
      $effect(() => {
        const snapshot = $state.snapshot(this.#value);
        try {
          localStorage.setItem(
            PREFERENCES_STORAGE_KEY,
            JSON.stringify(snapshot)
          );
        } catch {
          // Private mode or a full quota; preferences just will not persist.
        }
      });

      $effect(() => {
        document.documentElement.dataset.theme = this.resolvedTheme;
      });
    });
  }

  get value(): Preferences {
    return this.#value;
  }

  /** The theme actually in effect, with `system` resolved. */
  get resolvedTheme(): ResolvedThemeId {
    const { theme } = this.#value;
    if (theme !== "system") return theme;
    return this.#systemPrefersDark ? "ink" : "paper";
  }

  update(patch: Partial<Preferences>): void {
    this.#value = { ...this.#value, ...patch };
  }

  setTheme(theme: ThemeId): void {
    this.update({ theme });
  }

  setFontSize(size: number): void {
    this.update({ fontSize: clampFontSize(size) });
  }
}

export const preferences = new PreferencesStore();
