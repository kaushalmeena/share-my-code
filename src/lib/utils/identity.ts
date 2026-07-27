/**
 * Participant colours and default names.
 *
 * The palette is the one place the UI uses colour, so the entries are chosen
 * to stay legible as a caret and a name tag against every theme background.
 */
export const PARTICIPANT_COLORS = [
  "#e5484d",
  "#e5793a",
  "#d4a017",
  "#46a758",
  "#12a594",
  "#3e8fd6",
  "#6e56cf",
  "#c44795"
] as const;

/**
 * Word lists for generated display names, e.g. `quiet-otter`.
 *
 * Both lists are kept deliberately long: 56 x 56 is 3,136 combinations, so two
 * strangers landing in the same pad almost never collide, and someone clearing
 * their storage sees a genuinely different name rather than cycling through a
 * handful. Keep additions calm, concrete, and inoffensive in any pairing —
 * every adjective can end up in front of every noun.
 */
const ADJECTIVES = [
  "quiet",
  "brisk",
  "amber",
  "hollow",
  "swift",
  "plain",
  "north",
  "candid",
  "spare",
  "loose",
  "calm",
  "clever",
  "dusty",
  "early",
  "faint",
  "gentle",
  "humble",
  "idle",
  "jolly",
  "keen",
  "lively",
  "mellow",
  "noble",
  "olive",
  "patient",
  "quick",
  "rustic",
  "sunny",
  "tidy",
  "upbeat",
  "vivid",
  "warm",
  "wily",
  "zesty",
  "ancient",
  "bold",
  "crisp",
  "deep",
  "eager",
  "fresh",
  "glad",
  "hazy",
  "ivory",
  "jade",
  "lucid",
  "misty",
  "nimble",
  "open",
  "prime",
  "quaint",
  "rapid",
  "silent",
  "tender",
  "urban",
  "velvet",
  "wise"
];

const NOUNS = [
  "otter",
  "finch",
  "cedar",
  "harbor",
  "ember",
  "willow",
  "lantern",
  "marble",
  "quartz",
  "meadow",
  "acorn",
  "badger",
  "birch",
  "canyon",
  "comet",
  "coral",
  "dune",
  "falcon",
  "ferret",
  "glacier",
  "granite",
  "heron",
  "iris",
  "juniper",
  "kestrel",
  "lagoon",
  "lotus",
  "maple",
  "marten",
  "mesa",
  "nebula",
  "oak",
  "orchid",
  "osprey",
  "pebble",
  "pine",
  "plover",
  "prairie",
  "quail",
  "raven",
  "reef",
  "ridge",
  "river",
  "sable",
  "sparrow",
  "spruce",
  "summit",
  "thistle",
  "thrush",
  "tundra",
  "vale",
  "vireo",
  "walnut",
  "warbler",
  "wren",
  "zephyr"
];

const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)] as T;

export const randomColor = (): string => pick(PARTICIPANT_COLORS);

export const randomName = (): string => `${pick(ADJECTIVES)}-${pick(NOUNS)}`;

/** FNV-1a. Small, fast, and well spread for short strings. */
function hash(seed: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/**
 * Choose a cursor colour that nobody in the room is already using.
 *
 * Hashing alone would not do it — with eight colours, random or hashed picks
 * collide surprisingly often (a coin-flip's chance by the fourth participant),
 * and two identical carets are worse than an unexpected hue. So the hash only
 * decides *where in the palette to start looking*; the scan then skips
 * whatever is taken.
 *
 * Seeding the starting point per person matters when two people open the link
 * at the same moment: neither has seen the other in awareness yet, so both are
 * choosing against the same "taken" set, and a fixed starting point would hand
 * them the same colour. Different offsets make that collision unlikely.
 *
 * Falls back to the hashed colour once every colour is in use.
 */
export function pickDistinctColor(
  seed: string,
  taken: Iterable<string>
): string {
  const used = new Set(taken);
  const start = hash(seed) % PARTICIPANT_COLORS.length;

  for (let step = 0; step < PARTICIPANT_COLORS.length; step += 1) {
    const color = PARTICIPANT_COLORS[
      (start + step) % PARTICIPANT_COLORS.length
    ] as string;
    if (!used.has(color)) return color;
  }

  return PARTICIPANT_COLORS[start] as string;
}

/** Two initials for the presence chips, e.g. `quiet-otter` → `QO`. */
export function initialsOf(name: string): string {
  const [first, second] = name.split(/[\s\-_]+/).filter(Boolean);
  if (!first) return "?";
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first[0]}${second[0]}`.toUpperCase();
}
