/** Pure slot-reel maths: strips, spin timing and keyframes. */

/** Height of one reel frame in px; must match `.jr-window` in machine.ts. */
export const REEL_ITEM = 96;
const REEL_LENGTH = 24;

/** First reel's spin, in ms. Later reels stop `REEL_STAGGER` apart. */
export const SPIN_MS = 1600;
export const REEL_STAGGER = 300;
/** Near-miss tease: hold one frame short, then creep the winner in. */
const HOLD_MS = 200;
const CREEP_MS = 380;

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

/** How long reel `index` runs; a near-miss reel takes the tease on top. */
export const spinMs = (index: number, nearMiss = false) =>
  SPIN_MS + index * REEL_STAGGER + (nearMiss ? HOLD_MS + CREEP_MS : 0);

/**
 * Keyframes for one reel. The last frame is always `-distance`, so the
 * near-miss tease is cosmetic: it can never land on anyone but the winner.
 */
export function reelFrames(distance: number, nearMiss: boolean, duration: number): Keyframe[] {
  /**
   * ONE deceleration curve for the whole travel. Splitting it across two eased
   * segments makes the reel slow down, speed back up and stop again, which
   * reads as a jump right at the landing.
   */
  const spin: Keyframe = {
    transform: "translateY(0)",
    filter: "blur(6px)",
    easing: "cubic-bezier(.12,.72,.1,1)",
  };
  const land: Keyframe = { transform: `translateY(-${distance}px)`, filter: "blur(0)" };

  if (!nearMiss) {
    // Blur-only midpoint: it carries no transform, so the travel stays a single
    // uninterrupted segment under the curve above.
    return [spin, { filter: "blur(2px)", offset: 0.55 }, land];
  }

  // Stop one frame short, hold, then creep the winner into the window.
  const stopsShort = (duration - HOLD_MS - CREEP_MS) / duration;
  return [
    spin,
    {
      transform: `translateY(-${distance - REEL_ITEM}px)`,
      filter: "blur(0)",
      offset: stopsShort,
      easing: "linear",
    },
    {
      transform: `translateY(-${distance - REEL_ITEM}px)`,
      offset: (duration - CREEP_MS) / duration,
      easing: "ease-out",
    },
    land,
  ];
}
