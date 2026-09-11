/** Pure slot-reel strip: filler frames ending on the winner. */

/** Height of one reel frame in px; must match the button size in the component. */
export const REEL_ITEM = 24;
const REEL_LENGTH = 24;

/**
 * A strip of `length` avatars whose LAST frame is the winner, so the reel can
 * animate to a single precomputed offset and stop exactly on the pick.
 */
export function reelStrip(avatars: string[], winner: string, length = REEL_LENGTH): string[] {
  if (!avatars.length) return [winner];
  const filler = Array.from(
    { length: Math.max(length - 1, 0) },
    () => avatars[Math.floor(Math.random() * avatars.length)]!,
  );
  return [...filler, winner];
}
