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
import {
  CAB_H,
  CAB_W,
  CABINET_SVG,
  GLASS_SVG,
  LED_H,
  LED_Y,
  PANEL_H,
  PANEL_Y,
  WINDOW_GAP,
  WINDOW_X,
  WINDOW_Y,
} from "./cabinet";
import { REEL_ITEM, reelFrames, reelStrip, spinMs } from "./reel";
import { chime, clunk, drumroll, lever, payline, teeter, tick } from "./sound";

const REELS = 3;
/** Lever travel in px, and the share of it that latches the pull. */
const MAX_TRAVEL = 80;
const LATCH_TRAVEL = MAX_TRAVEL * 0.6;
const NEAR_MISS_CHANCE = 0.35;

/* The cabinet is SVG artwork (cabinet.ts); CSS only positions the live parts
   over it: the reels in their windows, the neon/LED text, and the lever. */
const CSS = `
@keyframes jr-cab-in { from { transform: translateY(28px) scale(.94); opacity: 0 } }
@keyframes jr-bulbs { 0%, 100% { opacity: 1 } 50% { opacity: .3 } }
@keyframes jr-payline-hit {
  0%, 100% { opacity: 1; box-shadow: 0 0 16px 2px #ff3b3b }
  50% { opacity: .3; box-shadow: 0 0 4px 0 #ff3b3b }
}
.jr-machine {
  position: fixed; inset: 0; z-index: 2147483646;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 40%, rgba(60,14,14,.5), rgba(6,5,7,.9));
  backdrop-filter: blur(6px);
  font: 500 14px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.jr-cab {
  position: relative; width: ${CAB_W}px; height: ${CAB_H}px;
  animation: jr-cab-in .34s cubic-bezier(.2,.9,.3,1.2);
}
.jr-art, .jr-glass { position: absolute; inset: 0; pointer-events: none }
.jr-art { filter: drop-shadow(0 30px 60px rgba(0,0,0,.75)) }
.jr-bulb { animation: jr-bulbs .9s steps(2) infinite }
/* Live reels, sitting in the artwork's windows. */
.jr-reels {
  position: absolute; left: ${WINDOW_X}px; top: ${WINDOW_Y}px;
  display: flex; gap: ${WINDOW_GAP}px;
}
.jr-window {
  width: ${REEL_ITEM}px; height: ${REEL_ITEM}px; overflow: hidden; border-radius: 3px;
  background: linear-gradient(180deg, #8d8378 0%, #fffdf6 24%, #fff 50%, #f4ece0 76%, #8d8378 100%);
  box-shadow: inset 0 0 14px rgba(70,45,15,.5), inset 0 0 0 1px rgba(0,0,0,.4);
}
.jr-reel { display: block; will-change: transform, filter }
.jr-reel img {
  width: ${REEL_ITEM}px; height: ${REEL_ITEM}px; display: block; object-fit: cover;
  -webkit-mask: radial-gradient(circle at 50% 50%, #000 60%, transparent 74%);
  mask: radial-gradient(circle at 50% 50%, #000 60%, transparent 74%);
}
.jr-payline {
  position: absolute; left: -4px; right: -4px; top: 50%; height: 2px;
  background: linear-gradient(90deg, transparent, #ff3b3b 12%, #ff3b3b 88%, transparent);
  opacity: .45; pointer-events: none;
}
.jr-payline.is-hit { opacity: 1; animation: jr-payline-hit .5s ease-in-out 3 }
/* Neon name panel. */
.jr-plate {
  position: absolute; left: ${WINDOW_X}px; top: ${PANEL_Y}px;
  width: ${CAB_W - 2 * WINDOW_X}px; height: ${PANEL_H}px;
  display: flex; align-items: center; justify-content: center; padding: 0 10px;
  font: 700 24px/1.15 Georgia, "Times New Roman", serif; text-align: center;
  letter-spacing: .04em; color: #ffd85e;
  text-shadow: 0 0 6px #ff9d00, 0 0 18px rgba(255,157,0,.7);
}
/* LED credit strip. */
.jr-led {
  position: absolute; left: 96px; top: ${LED_Y}px; width: 188px; height: ${LED_H}px;
  display: flex; align-items: center; justify-content: center;
  font: 700 11px/1 "Courier New", monospace; letter-spacing: .28em;
  color: #ff6b5e; text-shadow: 0 0 8px #ff2d1a;
}
/* The arm hangs off the right edge, level with the reel deck. */
.jr-lever { position: absolute; top: 190px; right: -44px; width: 34px; text-align: center }
.jr-lever::before {
  content: ""; position: absolute; bottom: -13px; left: 50%; translate: -50% 0;
  width: 30px; height: 30px; border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, #fbfcfd, #9aa2ae 58%, #4a515b);
  box-shadow: 0 3px 8px rgba(0,0,0,.55);
}
.jr-rail {
  display: block; width: 10px; height: ${MAX_TRAVEL}px; margin: 0 auto;
  border-radius: 5px;
  background: linear-gradient(90deg, #4a515b 0 16%, #f6f8fa 42%, #aeb6c1 62%, #444b55 100%);
  box-shadow: 0 2px 6px rgba(0,0,0,.5);
}
/* translate + rotate as individual properties, never \`transform\`: \`rotate\`
   composes first, so a transform-based offset would be swung around with it. */
.jr-knob {
  position: absolute; top: -24px; left: 50%; width: 36px; height: 36px; padding: 0;
  border: none; border-radius: 50%; cursor: grab; touch-action: none;
  background: radial-gradient(circle at 34% 28%, #ff9e8d 0 12%, #e01f1f 55%, #7d0f0f 100%);
  box-shadow: 0 6px 16px rgba(0,0,0,.6), inset 0 -4px 8px rgba(0,0,0,.4);
  translate: -50% var(--travel, 0px);
}
/* Only way out besides Esc: the overlay never dismisses itself. */
.jr-close {
  position: fixed; top: 20px; right: 24px; width: 40px; height: 40px; padding: 0;
  border: 2px solid #c0c7d1; border-radius: 50%; cursor: pointer;
  font: 700 17px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #f2f5f8; background: rgba(12,14,18,.72);
  box-shadow: 0 4px 12px rgba(0,0,0,.5);
}
.jr-close:hover { color: #fff; background: #c1121f; border-color: #ffd85e }
.jr-close:focus-visible { outline: 3px solid #ffd85e; outline-offset: 3px }
.jr-knob:active { cursor: grabbing }
.jr-knob:focus-visible { outline: 3px solid #ffd166; outline-offset: 3px }
.jr-knob:disabled { cursor: default }
@media (prefers-reduced-motion: reduce) {
  .jr-machine { backdrop-filter: none }
  .jr-cab, .jr-bulb { animation: none }
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
  cab.innerHTML = CABINET_SVG; // static artwork, no interpolation

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
  plate.textContent = "— READY —"; // the panel is always lit; the name replaces it

  const hint = el("div", "jr-led");
  hint.textContent = "PULL THE LEVER";

  const closeButton = el("button", "jr-close");
  closeButton.type = "button";
  closeButton.textContent = "✕";
  closeButton.setAttribute("aria-label", "Close the raffle machine");

  const leverBox = el("div", "jr-lever");
  const knob = el("button", "jr-knob");
  knob.type = "button";
  knob.setAttribute("aria-label", "Pull the lever to draw an assignee");
  leverBox.append(el("span", "jr-rail"), knob);

  const glass = el("div", "");
  glass.innerHTML = GLASS_SVG;

  cab.append(reels, glass.firstElementChild!, plate, hint, leverBox);
  root.append(cab, closeButton); // screen corner, not bolted to the cabinet
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
  // pointerdown, not click: the cabinet opens under the cursor mid-click, so the
  // opening click's mouseup would otherwise land on the backdrop and dismiss it.
  closeButton.addEventListener("click", close);

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
    hint.textContent = "SPINNING…";
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
    plate.textContent = pick.name || "Someone";
    hint.textContent = "CLOSE WHEN READY";
    payline();
    chime();
    if (!calm) {
      confetti(innerWidth / 2, innerHeight / 2);
      shockwave(innerWidth / 2, innerHeight / 2);
      shake();
    }
    closeButton.focus(); // the lever is spent; the exit is the only control left
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
    knob.style.transition = "translate .32s cubic-bezier(.2,1.8,.3,1), rotate .32s ease-out";
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
