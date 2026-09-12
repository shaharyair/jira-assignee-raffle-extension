/**
 * Every user setting, in one live object.
 *
 * One storage read and one change listener for the whole extension: each
 * setting owning its own loader is how the sound toggle ended up silent on a
 * fresh install (`!!undefined`). Defaults live here and nowhere else.
 */
export const DEFAULTS = {
  sound: true,
  /** Share of pulls that land a match; the rest read NO MATCH and cost nobody a turn. */
  winChance: 0.5,
  /** Milliseconds to keep the cabinet up after a win. 0 = until dismissed. */
  autoClose: 5000,
  motion: "system" as "full" | "reduced" | "system",
};

export type Settings = typeof DEFAULTS;

/** Popup choices. Order is the order they render in. */
export const WIN_CHANCES = [
  { value: 1, label: "Always" },
  { value: 0.75, label: "Usually" },
  { value: 0.5, label: "Even" },
  { value: 0.25, label: "Rare" },
];
export const AUTO_CLOSES = [
  { value: 0, label: "Off" },
  { value: 3000, label: "3s" },
  { value: 5000, label: "5s" },
  { value: 10000, label: "10s" },
];
export const MOTIONS = [
  { value: "full", label: "Full" },
  { value: "reduced", label: "Reduced" },
  { value: "system", label: "System" },
];

/** Mutated in place, so importers can hold the reference and always read current. */
export const settings: Settings = { ...DEFAULTS };

const apply = (stored: Record<string, unknown>) => {
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    if (stored[key] !== undefined) (settings as Record<string, unknown>)[key] = stored[key];
  }
};

export const settingsReady = browser.storage.local
  .get(Object.keys(DEFAULTS))
  .then(apply)
  .catch(() => {});

browser.storage.onChanged.addListener((changes) => {
  apply(Object.fromEntries(Object.entries(changes).map(([k, c]) => [k, c.newValue])));
});

/** Animations off: the popup choice wins over the OS, "system" defers to it. */
export const isCalm = () =>
  settings.motion === "reduced" ||
  (settings.motion === "system" && matchMedia("(prefers-reduced-motion: reduce)").matches);
