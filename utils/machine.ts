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
import { confetti, shockwave } from "./effects";
import type { Assignee } from "./jira";
import {
  CAB_H,
  CAB_W,
  CABINET_SVG,
  GLASS_SVG,
  LED_H,
  LED_W,
  LED_X,
  LED_Y,
  PANEL_H,
  PANEL_Y,
  WINDOW_GAP,
  WINDOW_X,
  WINDOW_Y,
} from "./cabinet";
import { REEL_ITEM, reelFrames, reelStrip, spinMs } from "./reel";
import { chime, clunk, drumroll, dud, lever, payline, teeter, tick } from "./sound";

const REELS = 3;
/** Lever travel in px, and the share of it that latches the pull. */
const MAX_TRAVEL = 80;
const LATCH_TRAVEL = MAX_TRAVEL * 0.6;
/** Length of the handle shaft, and how far it sweeps on a full pull.
 *  Past horizontal, so the ball finishes BELOW the pivot: a lever that stops at
 *  90 degrees reads as parked out to the side, not pulled down. */
const ARM_LEN = 104;
const MAX_SWING_DEG = 152;
const NEAR_MISS_CHANCE = 0.35;
/** Even odds: half the pulls land mismatched and draw nobody. Needs 2+ faces. */
const MISS_CHANCE = 0.5;
/** Exit animation; the node is only removed once it has played out. */
const EXIT_MS = 240;

/* The cabinet is SVG artwork (cabinet.ts); CSS only positions the live parts
   over it: the reels in their windows, the neon/LED text, and the lever. */
const CSS = `
@keyframes jr-cab-in { from { transform: translateY(28px) scale(.94); opacity: 0 } }
@keyframes jr-cab-out { to { transform: translateY(26px) scale(.92); opacity: 0 } }
/* The cabinet jolts, never document.body: a transform on body would become the
   containing block for this fixed overlay and drag the whole machine with it. */
@keyframes jr-cab-hit {
  10%, 90% { transform: translate(-3px, 2px) }
  30%, 70% { transform: translate(4px, -3px) }
  50% { transform: translate(-4px, 3px) }
}
@keyframes jr-fade-out { to { opacity: 0 } }

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
/* The artboard stays ${CAB_W}x${CAB_H} so every overlay keeps using SVG units;
   the whole cabinet is scaled up instead, stepping down on short viewports. */
/* The entrance lives on its own one-shot class. Leaving it on .jr-cab meant any
   later class change (the jackpot jolt) restarted it from opacity 0, so the
   cabinet blinked out for a moment right after the win. */
.jr-cab {
  position: relative; width: ${CAB_W}px; height: ${CAB_H}px; scale: 1.55;
}
.jr-cab.is-entering { animation: jr-cab-in .34s cubic-bezier(.2,.9,.3,1.2) }
@media (max-height: 820px) { .jr-cab { scale: 1.25 } }
@media (max-height: 660px) { .jr-cab { scale: 1 } }
/* Leaving: the backdrop fades while the cabinet drops away under it. */
.jr-machine.is-closing { animation: jr-fade-out ${EXIT_MS}ms ease forwards; pointer-events: none }
.jr-machine.is-closing .jr-cab { animation: jr-cab-out ${EXIT_MS}ms cubic-bezier(.4,0,.85,.4) forwards }
.jr-cab.is-hit { animation: jr-cab-hit .22s ease-in-out }
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
/* LED credit strip. Single line, clipped to the glass: the longest message must
   never wrap out over the chrome. */
.jr-led {
  position: absolute; left: ${LED_X}px; top: ${LED_Y}px; width: ${LED_W}px; height: ${LED_H}px;
  box-sizing: border-box; padding: 0 10px; overflow: hidden; white-space: nowrap;
  display: flex; align-items: center; justify-content: center;
  font: 700 10px/1 "Courier New", monospace; letter-spacing: .16em;
  color: #ff6b5e; text-shadow: 0 0 8px #ff2d1a;
}
/* The arm is bolted to the cabinet's right flank and SWINGS on its pivot, the
   way a bandit's handle actually moves: the ball travels an arc, not a slot. */
/* Mounted on the cabinet's right flank at reel-deck height, so the boss sits on
   the body and the ball rides beside the reels - not dangling past the base. */
.jr-lever {
  position: absolute; top: 168px; right: -14px; width: 30px; height: ${ARM_LEN}px;
}
/* Mounting plate + pivot boss, fixed to the cabinet. */
.jr-lever::before {
  content: ""; position: absolute; bottom: -14px; left: 50%; translate: -50% 0;
  width: 30px; height: 30px; border-radius: 50%;
  background: radial-gradient(circle at 36% 28%, #fbfcfd, #a7aeb9 55%, #434a54);
  box-shadow: 0 3px 9px rgba(0,0,0,.6), inset 0 -2px 4px rgba(0,0,0,.35);
}
.jr-lever::after {
  content: ""; position: absolute; bottom: -5px; left: 50%; translate: -50% 0;
  width: 12px; height: 12px; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #fff, #6d757f);
  z-index: 2;
}
/* The handle swings about the boss at its foot, carrying the ball down through
   an arc. Only the arm turns: the mount plate and pivot boss stay bolted on. */
.jr-arm {
  position: absolute; inset: 0;
  transform-origin: 50% 100%;
  rotate: var(--swing, 0deg);
}
/* Tapered chrome shaft: narrow at the ball, thicker at the boss. */
.jr-shaft {
  position: absolute; bottom: 0; left: 50%; translate: -50% 0;
  width: 11px; height: 100%; border-radius: 6px 6px 3px 3px;
  background: linear-gradient(90deg, #3f464f 0 12%, #eef1f5 38%, #ffffff 48%, #b3bac4 62%, #3b424b 100%);
  box-shadow: 0 2px 7px rgba(0,0,0,.55);
  clip-path: polygon(22% 0, 78% 0, 100% 100%, 0 100%);
}
/* Knurled collar under the ball. */
.jr-shaft::after {
  content: ""; position: absolute; top: 12px; left: -3px; right: -3px; height: 9px;
  border-radius: 3px;
  background: repeating-linear-gradient(90deg, #f2f5f8 0 1.5px, #79818d 1.5px 3px);
  box-shadow: 0 1px 3px rgba(0,0,0,.5);
}
/* The ball rides the top of the arm; the arm's rotation carries it round. */
.jr-knob {
  position: absolute; top: -30px; left: 50%; width: 40px; height: 40px; padding: 0;
  border: none; border-radius: 50%; cursor: grab; touch-action: none;
  translate: -50% 0;
  background:
    radial-gradient(circle at 34% 26%, rgba(255,255,255,.95) 0 8%, rgba(255,255,255,0) 34%),
    radial-gradient(circle at 50% 120%, rgba(255,255,255,.35), rgba(255,255,255,0) 45%),
    radial-gradient(circle at 50% 40%, #ef3b3b 0 42%, #b3131b 74%, #6d0a10 100%);
  box-shadow: 0 8px 18px rgba(0,0,0,.6), inset 0 -5px 10px rgba(0,0,0,.45);
  transition: filter .15s ease;
}
/* Affordance without jewellery: the ball just brightens under the cursor. */
.jr-knob:hover:not(:disabled) { filter: brightness(1.15) }
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
/* Keyboard users still need a visible target. */
.jr-knob:focus-visible { outline: 3px solid #fff; outline-offset: 4px }
.jr-knob:disabled { cursor: default }
@media (prefers-reduced-motion: reduce) {
  .jr-machine { backdrop-filter: none }
  .jr-cab.is-entering, .jr-bulb, .jr-cab.is-hit { animation: none }

  .jr-machine.is-closing, .jr-machine.is-closing .jr-cab { animation-duration: 1ms }
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

  const cab = el("div", "jr-cab is-entering");
  cab.innerHTML = CABINET_SVG; // static artwork, no interpolation
  setTimeout(() => cab.classList.remove("is-entering"), 360);

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
  const arm = el("div", "jr-arm");
  arm.append(el("span", "jr-shaft"), knob);
  leverBox.append(arm);

  const glass = el("div", "");
  glass.innerHTML = GLASS_SVG;

  cab.append(reels, glass.firstElementChild!, plate, hint, leverBox);
  root.append(cab, closeButton); // screen corner, not bolted to the cabinet
  document.body.append(root);
  // Focus the dialog, not the ball: a programmatic focus on the ball paints a
  // focus ring around it on open. Keyboard users still Tab straight to it.
  root.tabIndex = -1;
  root.focus({ preventScroll: true });
  drumroll(); // anticipation while the lever sits there, untouched

  let winner: Assignee | null = null;
  let pulled = false;
  const closed = Promise.withResolvers<Assignee | null>();

  let closing = false;
  const close = () => {
    if (closing) return; // Esc plus a click on the button must not double-resolve
    closing = true;
    document.removeEventListener("keydown", onKey);
    root.classList.add("is-closing");
    setTimeout(
      () => {
        root.remove();
        closed.resolve(winner);
      },
      calm ? 0 : EXIT_MS,
    );
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

  /** One target avatar per reel: equal targets are a win, mixed ones a miss. */
  async function spin(targets: string[]) {
    const faces = strips.map((_, i) => reelStrip(pool, targets[i]!));
    strips.forEach((strip, i) => {
      strip.replaceChildren(...faces[i]!.map(frame));
    });
    const distance = (faces[0]!.length - 1) * REEL_ITEM;

    if (calm) {
      strips.forEach((strip) => (strip.style.transform = `translateY(-${distance}px)`));
      return;
    }

    // Only a winning spin teases, and only sometimes: hanging a frame short of a
    // face that was never going to match is just noise.
    const winning = targets.every((t) => t === targets[0]);
    const teaseIndex = winning && Math.random() < NEAR_MISS_CHANCE ? REELS - 1 : -1;
    const runs = strips.map((strip, i) => {
      const nearMiss = i === teaseIndex;
      const duration = spinMs(i, nearMiss);
      strip.getAnimations().forEach((old) => old.cancel()); // drop the last pull's fill
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
    line.classList.remove("is-hit");
    plate.textContent = "— READY —";
    lever();

    // A miss is decided BEFORE the draw, so a losing pull costs nobody a turn.
    if (pool.length > 1 && Math.random() < MISS_CHANCE) {
      await spin(missTargets());
      if (!root.isConnected) return;
      hint.textContent = "NO MATCH \u2014 PULL AGAIN";
      dud();
      rearm();
      return;
    }

    const pick = await draw();
    if (!pick) {
      close();
      return;
    }
    await spin([pick.avatar, pick.avatar, pick.avatar]);
    if (!root.isConnected) {
      winner = pick; // dismissed mid-spin: the pick still stands
      return;
    }

    winner = pick;
    line.classList.add("is-hit");
    plate.textContent = pick.name || "Someone";
    hint.textContent = "PULL AGAIN OR CLOSE";
    payline();
    chime();
    if (!calm) {
      confetti(innerWidth / 2, innerHeight / 2);
      shockwave(innerWidth / 2, innerHeight / 2);
      cab.classList.add("is-hit");
      setTimeout(() => cab.classList.remove("is-hit"), 260);
    }

    rearm();
  }

  /** Three faces that are not all the same, so the payline visibly misses. */
  function missTargets() {
    const first = pool[Math.floor(Math.random() * pool.length)]!;
    const others = pool.filter((a) => a !== first);
    const odd = others[Math.floor(Math.random() * others.length)]!;
    // Shuffle which reel breaks the run, so the miss is not always the last one.
    const targets = [first, first, odd];
    const swap = Math.floor(Math.random() * REELS);
    [targets[REELS - 1], targets[swap]] = [targets[swap]!, targets[REELS - 1]!];
    return targets;
  }

  /** The handle rises again and the next pull is live. */
  function rearm() {
    pulled = false;
    knob.disabled = false;
    arm.style.transition = "rotate .5s cubic-bezier(.2,1.5,.35,1)";
    setTravel(0);
    setTimeout(() => (arm.style.transition = ""), 520);
  }

  // Drag physics: grab the ball, haul it down, release past the latch point.
  // Travel is measured in px of drag but applied as swing, so the ball follows
  // the arm's arc instead of sliding down a rail.
  let startY: number | null = null;
  const setTravel = (px: number) => {
    leverBox.style.setProperty("--swing", `${(px / MAX_TRAVEL) * MAX_SWING_DEG}deg`);
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
    arm.style.transition = "rotate .34s cubic-bezier(.2,1.7,.3,1)";
    setTravel(0);
    setTimeout(() => (arm.style.transition = ""), 360);
  });
  // Click, Enter and Space land here too: one pull path, and `pulled` keeps a
  // drag that also fires a synthetic click from spinning twice.
  knob.addEventListener("click", () => {
    setTravel(MAX_TRAVEL);
    pull();
  });

  return closed.promise;
}
