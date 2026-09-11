<script setup lang="ts">
import { getAssignees, getBoardKey, selectAssignee, type Assignee } from "../utils/jira";
import { pickNext } from "../utils/raffle";
import { REEL_ITEM, reelStrip } from "../utils/reel";
import { chime, drumroll, tick } from "../utils/sound";
import { confetti, shake, shockwave, winnerToast } from "../utils/effects";

// Module scope, so a remount mid-draw (Jira rebuilds the filter row on every
// toggle) can't start a second raffle and burn two people on one click.
let drawing = false;

const SPIN_MS = 1600;
const IDLE_MS = 30_000;

const storageKey = `raffle:${getBoardKey()}`;
const picked = ref<Assignee | null>(null);
const loading = ref(false);
const landed = ref(false);
const impatient = ref(false);
const tilt = ref(0);
const strip = ref<string[]>([]);
const seenCount = ref(0);
const total = ref(0);

const root = ref<HTMLElement>();
const reel = ref<HTMLElement>();

const calm = matchMedia("(prefers-reduced-motion: reduce)");
/** Conic ring showing how much of the round is used up. */
const progress = computed(() => (total.value ? (seenCount.value / total.value) * 360 : 0));

let idleTimer: ReturnType<typeof setTimeout>;
const resetIdle = () => {
  impatient.value = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => (impatient.value = true), IDLE_MS);
};
onMounted(resetIdle);
onUnmounted(() => clearTimeout(idleTimer));

/** Lean the button toward the cursor. */
const onMove = (event: MouseEvent) => {
  resetIdle();
  if (calm.matches) return;
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  tilt.value = ((event.clientX - (box.left + box.width / 2)) / box.width) * 20;
};

const readSeen = async (): Promise<string[]> => {
  const stored = await browser.storage.local.get(storageKey);
  return (stored[storageKey] as string[] | undefined) ?? [];
};

/** Spin the reel to a precomputed offset so it stops exactly on the winner. */
async function spin(assignees: Assignee[], winner: Assignee) {
  const avatars = assignees.map((a) => a.avatar).filter(Boolean);
  if (calm.matches || !winner.avatar || !avatars.length) return;

  strip.value = reelStrip(avatars, winner.avatar);
  await nextTick();
  const el = reel.value;
  if (!el) return;

  const distance = (strip.value.length - 1) * REEL_ITEM;
  const spinning = el.animate(
    [
      { transform: "translateY(0)", filter: "blur(5px)" },
      { transform: `translateY(-${distance * 0.85}px)`, filter: "blur(3px)", offset: 0.6 },
      { transform: `translateY(-${distance}px)`, filter: "blur(0)" },
    ],
    { duration: SPIN_MS, easing: "cubic-bezier(.15,.9,.25,1)", fill: "forwards" },
  );

  // Ticks slow down with the reel: the interval grows as the easing decays.
  let gap = 45;
  let elapsed = 0;
  const step = () => {
    if (elapsed > SPIN_MS - 100) return;
    tick();
    elapsed += gap;
    gap *= 1.07;
    setTimeout(step, gap);
  };
  step();

  await spinning.finished.catch(() => {}); // container removed mid-spin: no drama
}

function celebrate(winner: Assignee) {
  landed.value = true;
  setTimeout(() => (landed.value = false), 900);
  chime();
  winnerToast(winner.name || "Someone", winner.avatar);
  if (calm.matches) return;
  const box = root.value?.getBoundingClientRect();
  if (box) {
    confetti(box.left + box.width / 2, box.top + box.height / 2);
    shockwave(box.left + box.width / 2, box.top + box.height / 2);
  }
  shake();
}

const onClick = async () => {
  if (drawing) return;
  drawing = true;
  loading.value = true;
  resetIdle();
  drumroll();
  try {
    const assignees = await getAssignees();
    const { id, seen } = pickNext(
      assignees.map((a) => a.id),
      await readSeen(),
    );
    if (!id) {
      console.warn("[jira-raffle] no assignees on this board");
      return;
    }
    await browser.storage.local.set({ [storageKey]: seen });
    total.value = assignees.length;
    seenCount.value = seen.length;

    const winner = assignees.find((a) => a.id === id) ?? null;
    // Apply the filter and spin at the same time: the reel covers the wait
    // while Jira works through its re-renders.
    const applying = selectAssignee(id);
    if (winner) await spin(assignees, winner);
    await applying;

    picked.value = winner;
    strip.value = [];
    if (winner) celebrate(winner);
  } finally {
    drawing = false;
    loading.value = false;
  }
};
</script>

<template>
  <div
    ref="root"
    class="raffle-slot"
    :style="{ '--progress': `${progress}deg`, '--tilt': `${tilt}deg` }"
    :class="{ 'is-live': total > 0 }"
  >
    <button
      class="raffle"
      type="button"
      :disabled="loading"
      :class="{ 'is-spinning': loading, 'is-landed': landed, 'is-impatient': impatient }"
      :title="picked ? `Raffle picked ${picked.name}` : 'Pick a random assignee'"
      :aria-label="picked ? `Raffle picked ${picked.name}. Pick again` : 'Pick a random assignee'"
      @click="onClick"
      @mousemove="onMove"
      @mouseleave="tilt = 0"
    >
      <span v-if="strip.length" class="raffle__window" aria-hidden="true">
        <span ref="reel" class="raffle__reel">
          <img v-for="(src, i) in strip" :key="i" class="raffle__frame" :src="src" alt="" />
        </span>
      </span>
      <img v-else-if="picked?.avatar" class="raffle__avatar" :src="picked.avatar" alt="" />
      <span v-else class="raffle__icon" aria-hidden="true">🎲</span>
      <span v-if="loading && !strip.length" class="raffle__spinner" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.raffle-slot {
  position: relative;
  display: flex;
  align-items: center;
}
/* Round progress: how many people are already drawn. */
.raffle-slot.is-live::before {
  content: "";
  position: absolute;
  inset: 6px -2px 6px 6px;
  border-radius: 50%;
  background: conic-gradient(#ffc400 var(--progress), transparent 0);
  -webkit-mask: radial-gradient(circle, transparent 62%, #000 64%);
  mask: radial-gradient(circle, transparent 62%, #000 64%);
  pointer-events: none;
}
.raffle {
  position: relative;
  width: 24px;
  height: 24px;
  margin-left: 8px;
  padding: 0;
  border: 2px dashed var(--ds-border, #8993a4);
  border-radius: 50%;
  background: var(--ds-surface, #fff);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 12px;
  line-height: 1;
  animation: raffle-breathe 3.4s ease-in-out infinite;
  transform: rotate(var(--tilt));
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease;
}
.raffle:hover {
  box-shadow: 0 0 0 3px rgba(12, 102, 228, 0.25), 0 0 18px rgba(255, 196, 0, 0.6);
}
.raffle:disabled {
  cursor: progress;
}
.raffle.is-spinning {
  transform: scale(1.7);
  border-style: solid;
  border-color: var(--ds-border-brand, #0c66e4);
  animation: none;
  z-index: 2;
}
.raffle.is-landed {
  border-color: #ffc400;
  animation: raffle-land 0.9s cubic-bezier(0.2, 1.6, 0.3, 1);
}
.raffle.is-impatient {
  animation: raffle-wiggle 1.2s ease-in-out infinite;
}
.raffle__avatar,
.raffle__frame {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
.raffle__window {
  width: 24px;
  height: 24px;
  overflow: hidden;
  border-radius: 50%;
}
.raffle__reel {
  display: block;
  will-change: transform, filter;
}
.raffle__spinner {
  position: absolute;
  inset: -2px;
  border: 2px solid transparent;
  border-top-color: var(--ds-border-brand, #0c66e4);
  border-radius: 50%;
  animation: raffle-spin 0.7s linear infinite;
}
@keyframes raffle-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes raffle-breathe {
  50% {
    box-shadow: 0 0 0 3px rgba(12, 102, 228, 0.12);
  }
}
@keyframes raffle-land {
  0% {
    transform: scale(1.7);
  }
  45% {
    transform: scale(1.35);
    box-shadow: 0 0 0 8px rgba(255, 196, 0, 0.45), 0 0 26px rgba(255, 196, 0, 0.9);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 196, 0, 0);
  }
}
@keyframes raffle-wiggle {
  0%,
  70%,
  100% {
    transform: rotate(0);
  }
  75% {
    transform: rotate(-14deg);
  }
  85% {
    transform: rotate(14deg);
  }
}
/* One brake for everything: motion-sensitive users get a plain, instant button. */
@media (prefers-reduced-motion: reduce) {
  .raffle,
  .raffle.is-landed,
  .raffle.is-impatient {
    animation: none;
    transition: opacity 0.15s ease;
  }
  .raffle.is-spinning {
    transform: none;
  }
}
</style>
