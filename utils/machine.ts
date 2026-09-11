/**
 * The slot machine itself: a full-screen cabinet the user pulls the lever on.
 *
 * Plain DOM on document.body, not a Vue subtree: Jira rebuilds the filter row
 * (and with it our mount container) while the spin is running, which would tear
 * a component-owned overlay off the page mid-animation.
 *
 * The draw is handed in as a callback and is invoked ONLY on the pull, so
 * opening the cabinet and walking away never burns an assignee.
 */
import { confetti, shake, shockwave } from "./effects";
import type { Assignee } from "./jira";
import { REEL_ITEM, reelFrames, reelStrip, spinMs } from "./reel";
import { chime, clunk, drumroll, lever, payline, teeter, tick } from "./sound";

const REELS = 3;
/** Lever travel in px, and the share of it that latches the pull. */
const MAX_TRAVEL = 80;
const LATCH_TRAVEL = MAX_TRAVEL * 0.6;
const NEAR_MISS_CHANCE = 0.35;
const CLOSE_AFTER_WIN_MS = 1600;

const CSS = `
@keyframes jr-bulbs { to { background-position: 32px 0 } }
@keyframes jr-cab-in { from { transform: translateY(24px) scale(.92); opacity: 0 } }
@keyframes jr-payline-hit {
  0%, 100% { opacity: 1; box-shadow: 0 0 18px 2px #ffc400 }
  50% { opacity: .45; box-shadow: 0 0 6px 0 #ffc400 }
}
.jr-machine {
  position: fixed; inset: 0; z-index: 2147483646;
  display: flex; align-items: center; justify-content: center;
  background: rgba(9,15,30,.72); backdrop-filter: blur(6px);
  font: 500 14px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.jr-cab {
  position: relative; width: 520px; max-width: calc(100vw - 48px);
  padding: 0 0 26px; border-radius: 24px;
  background: linear-gradient(180deg, #1b2440, #0d1428);
  border: 3px solid #ffc400;
  box-shadow: 0 30px 80px rgba(0,0,0,.6), inset 0 0 60px rgba(255,196,0,.12);
  animation: jr-cab-in .32s cubic-bezier(.2,.9,.3,1.2);
}
.jr-marquee {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  height: 54px; border-radius: 20px 20px 0 0;
  color: #ffdf6e; font-weight: 800; letter-spacing: .22em; font-size: 15px;
  background: repeating-linear-gradient(90deg, rgba(255,196,0,.85) 0 6px, transparent 6px 16px) 0 0/32px 4px no-repeat,
              repeating-linear-gradient(90deg, rgba(255,196,0,.85) 0 6px, transparent 6px 16px) 0 100%/32px 4px no-repeat,
              linear-gradient(180deg, #2a3556, #1b2440);
  background-color: #222c4d;
  animation: jr-bulbs .9s linear infinite;
}
.jr-reels {
  position: relative; display: flex; gap: 10px; justify-content: center;
  margin: 22px 34px 18px; padding: 14px; border-radius: 16px;
  background: #05080f; box-shadow: inset 0 6px 18px rgba(0,0,0,.8);
}
.jr-window {
  width: ${REEL_ITEM}px; height: ${REEL_ITEM}px; overflow: hidden; border-radius: 12px;
  background: linear-gradient(180deg, #101828, #060a14);
  box-shadow: inset 0 0 0 2px rgba(255,196,0,.35);
}
.jr-reel { display: block; will-change: transform, filter }
.jr-reel img {
  width: ${REEL_ITEM}px; height: ${REEL_ITEM}px; display: block; object-fit: cover;
}
.jr-payline {
  position: absolute; left: 20px; right: 20px; top: 50%; height: 2px;
  background: #ffc400; opacity: .18; pointer-events: none;
}
.jr-payline.is-hit { opacity: 1; animation: jr-payline-hit .5s ease-in-out 3 }
.jr-plate {
  min-height: 28px; margin: 0 34px; padding: 5px 12px; border-radius: 10px;
  text-align: center; color: #ffdf6e; font-weight: 700; font-size: 17px;
  background: rgba(255,196,0,.08); box-shadow: inset 0 0 0 1px rgba(255,196,0,.25);
}
.jr-hint { margin-top: 12px; text-align: center; color: #8fa0c4; font-size: 12px }
.jr-lever { position: absolute; top: 96px; right: -30px; width: 26px; text-align: center }
.jr-rail {
  display: block; width: 8px; height: ${MAX_TRAVEL}px; margin: 0 auto;
  border-radius: 4px; background: linear-gradient(180deg, #8993a4, #3b455c);
}
.jr-knob {
  position: absolute; top: -14px; left: 50%; width: 26px; height: 26px; padding: 0;
  border: none; border-radius: 50%; cursor: grab; touch-action: none;
  background: radial-gradient(circle at 34% 30%, #ff8b7a, #d93f2b 70%);
  box-shadow: 0 4px 12px rgba(0,0,0,.5);
  transform: translate(-50%, var(--travel, 0px));
}
.jr-knob:active { cursor: grabbing }
.jr-knob:focus-visible { outline: 3px solid #ffc400; outline-offset: 3px }
.jr-knob:disabled { cursor: default }
@media (prefers-reduced-motion: reduce) {
  .jr-machine { backdrop-filter: none }
  .jr-cab { animation: none }
  .jr-marquee { animation: none }
  .jr-payline.is-hit { animation: none }
}
`;

let injected = false;
function ensureStyles() {
  if (injected) return;
  injected = true;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
  const node = document.createElement(tag);
  node.className = className;
  return node;
};

const frame = (src: string) => {
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  return img;
};

/**
 * Open the cabinet and resolve once it closes: with the winner if the lever was
 * pulled, with null if it was dismissed first (in which case `draw` never ran).
 */
export function runMachine(
  avatars: string[],
  draw: () => Promise<Assignee | null>,
): Promise<Assignee | null> {
  ensureStyles();
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pool = avatars.filter(Boolean);

  const root = el("div", "jr-machine");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Assignee raffle");

  const cab = el("div", "jr-cab");
  const marquee = el("div", "jr-marquee");
  marquee.textContent = "☀ RAFFLE ☀";

  const reels = el("div", "jr-reels");
  const strips = Array.from({ length: REELS }, () => {
    const slot = el("div", "jr-window");
    const strip = el("span", "jr-reel");
    // Idle face until the pull.
    strip.append(frame(pool[Math.floor(Math.random() * pool.length)] ?? ""));
    slot.append(strip);
    reels.append(slot);
    return strip;
  });
  const line = el("div", "jr-payline");
  reels.append(line);

  const plate = el("div", "jr-plate");
  plate.setAttribute("role", "status");

  const hint = el("div", "jr-hint");
  hint.textContent = "Pull the lever";

  const leverBox = el("div", "jr-lever");
  const knob = el("button", "jr-knob");
  knob.type = "button";
  knob.setAttribute("aria-label", "Pull the lever to draw an assignee");
  leverBox.append(el("span", "jr-rail"), knob);

  cab.append(marquee, reels, plate, hint, leverBox);
  root.append(cab);
  document.body.append(root);
  knob.focus();
  drumroll(); // anticipation while the lever sits there, untouched

  let winner: Assignee | null = null;
  let pulled = false;
  const closed = Promise.withResolvers<Assignee | null>();

  const close = () => {
    document.removeEventListener("keydown", onKey);
    root.remove();
    closed.resolve(winner);
  };
  function onKey(event: KeyboardEvent) {
    if (event.key === "Escape") close();
  }
  document.addEventListener("keydown", onKey);
  root.addEventListener("click", (event) => {
    if (event.target === root) close(); // backdrop only
  });

  /** Decaying tick chain: the gaps grow as the reels lose speed. */
  const ticks = (total: number) => {
    let gap = 45;
    let elapsed = 0;
    const step = () => {
      if (elapsed > total - 100 || !root.isConnected) return;
      tick();
      elapsed += gap;
      gap *= 1.07;
      setTimeout(step, gap);
    };
    step();
  };

  async function spin(pick: Assignee) {
    const faces = strips.map(() => reelStrip(pool, pick.avatar));
    strips.forEach((strip, i) => {
      strip.replaceChildren(...faces[i]!.map(frame));
    });
    const distance = (faces[0]!.length - 1) * REEL_ITEM;

    if (calm) {
      strips.forEach((strip) => (strip.style.transform = `translateY(-${distance}px)`));
      return;
    }

    // Only the last reel teases, and only sometimes.
    const teaseIndex = Math.random() < NEAR_MISS_CHANCE ? REELS - 1 : -1;
    const runs = strips.map((strip, i) => {
      const nearMiss = i === teaseIndex;
      const duration = spinMs(i, nearMiss);
      const animation = strip.animate(reelFrames(distance, nearMiss, duration), {
        duration,
        easing: "linear",
        fill: "forwards",
      });
      if (nearMiss) setTimeout(teeter, spinMs(i));
      return animation.finished.then(clunk, () => {});
    });

    ticks(spinMs(REELS - 1, teaseIndex >= 0));
    await Promise.all(runs);
  }

  async function pull() {
    if (pulled) return;
    pulled = true;
    knob.disabled = true;
    hint.textContent = "Spinning…";
    lever();

    const pick = await draw();
    if (!pick) {
      close();
      return;
    }
    await spin(pick);
    if (!root.isConnected) {
      winner = pick; // dismissed mid-spin: the pick still stands
      return;
    }

    winner = pick;
    line.classList.add("is-hit");
    plate.textContent = `🎉 ${pick.name || "Someone"}`;
    hint.textContent = "";
    payline();
    chime();
    if (!calm) {
      confetti(innerWidth / 2, innerHeight / 2);
      shockwave(innerWidth / 2, innerHeight / 2);
      shake();
    }
    setTimeout(close, CLOSE_AFTER_WIN_MS);
  }

  // Drag physics: grab the knob, haul it down, release past the latch point.
  let startY: number | null = null;
  const setTravel = (px: number) => {
    knob.style.setProperty("--travel", `${px}px`);
    knob.style.rotate = `${px * 0.9}deg`;
  };
  knob.addEventListener("pointerdown", (event) => {
    if (pulled) return;
    startY = event.clientY;
    knob.setPointerCapture(event.pointerId);
  });
  knob.addEventListener("pointermove", (event) => {
    if (startY === null) return;
    setTravel(Math.min(Math.max(event.clientY - startY, 0), MAX_TRAVEL));
  });
  knob.addEventListener("pointerup", (event) => {
    if (startY === null) return;
    const travel = Math.min(Math.max(event.clientY - startY, 0), MAX_TRAVEL);
    startY = null;
    if (travel >= LATCH_TRAVEL) {
      setTravel(MAX_TRAVEL);
      pull();
      return;
    }
    // Short of the latch: spring back and let them try again.
    knob.style.transition = "transform .32s cubic-bezier(.2,1.8,.3,1), rotate .32s ease-out";
    setTravel(0);
    setTimeout(() => (knob.style.transition = ""), 340);
  });
  // Click, Enter and Space land here too: one pull path, and `pulled` keeps a
  // drag that also fires a synthetic click from spinning twice.
  knob.addEventListener("click", () => {
    setTravel(MAX_TRAVEL);
    pull();
  });

  return closed.promise;
}
