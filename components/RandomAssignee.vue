<script setup lang="ts">
import { closeMenu, getAssignees, getBoardKey, selectAssignee, type Assignee } from "../utils/jira";
import { runMachine } from "../utils/machine";
import { pickNext } from "../utils/raffle";

// Module scope, so a remount mid-draw (Jira rebuilds the filter row on every
// toggle) can't open a second cabinet and burn two people on one click.
let drawing = false;

const IDLE_MS = 30_000;

const storageKey = `raffle:${getBoardKey()}`;
const picked = ref<Assignee | null>(null);
const loading = ref(false);
const landed = ref(false);
const impatient = ref(false);
const tilt = ref(0);
const seenCount = ref(0);
const total = ref(0);

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
  tilt.value = ((event.clientX - (box.left + box.width / 2)) / box.width) * 10;
};

const readSeen = async (): Promise<string[]> => {
  const stored = await browser.storage.local.get(storageKey);
  return (stored[storageKey] as string[] | undefined) ?? [];
};

const onClick = async () => {
  if (drawing) return;
  drawing = true;
  loading.value = true;
  resetIdle();
  try {
    const assignees = await getAssignees();
    if (!assignees.length) {
      console.warn("[jira-raffle] no assignees on this board");
      return;
    }

    /**
     * Runs on the lever pull and nowhere else: opening the cabinet and closing
     * it again must not consume anyone's turn.
     */
    const draw = async () => {
      const { id, seen } = pickNext(
        assignees.map((a) => a.id),
        await readSeen(),
      );
      if (!id) return null;
      await browser.storage.local.set({ [storageKey]: seen });
      total.value = assignees.length;
      seenCount.value = seen.length;

      // Filter the board under the spin, so the reels cover Jira's re-renders.
      void selectAssignee(id);
      return assignees.find((a) => a.id === id) ?? null;
    };

    const winner = await runMachine(
      assignees.map((a) => a.avatar).filter(Boolean),
      draw,
    );
    // Dismissed before the pull: only selectAssignee tidies up after itself, so
    // the overflow menu getAssignees opened is still hanging open.
    if (!winner) {
      await closeMenu();
      return;
    }

    picked.value = winner;
    landed.value = true;
    setTimeout(() => (landed.value = false), 900);
  } finally {
    drawing = false;
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="raffle-slot"
    :style="{ '--progress': `${progress}deg`, '--tilt': `${tilt}deg` }"
    :class="{ 'is-live': total > 0 }"
  >
    <button
      class="raffle"
      type="button"
      :disabled="loading"
      :class="{
        'is-spinning': loading,
        'is-landed': landed,
        'is-impatient': impatient,
        'has-pick': !!picked,
      }"
      :title="picked ? `Raffle picked ${picked.name}` : 'Pick a random assignee'"
      :aria-label="picked ? `Raffle picked ${picked.name}. Pick again` : 'Pick a random assignee'"
      @click="onClick"
      @mousemove="onMove"
      @mouseleave="tilt = 0"
    >
      <img v-if="picked?.avatar" class="raffle__avatar" :src="picked.avatar" alt="" />
      <!-- Inline SVG, not an emoji: emoji glyph metrics differ per platform and
           will not sit centred in a 24px circle. -->
      <svg v-else class="raffle__icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" stroke-width="2" />
        <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1.6" fill="currentColor" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      </svg>
      <span v-if="loading" class="raffle__spinner" aria-hidden="true" />
    </button>
    <!-- Marks the avatar as a raffle result, not a stray assignee chip. -->
    <svg v-if="picked" class="raffle__badge" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#172b4d" />
      <circle cx="8.5" cy="8.5" r="2" fill="#ffc400" />
      <circle cx="15.5" cy="15.5" r="2" fill="#ffc400" />
      <circle cx="12" cy="12" r="2" fill="#ffc400" />
    </svg>
  </div>
</template>

<style scoped>
.raffle-slot {
  position: relative;
  display: flex;
  align-items: center;
  /* Only place that owns spacing from the avatar row. */
  margin-left: 4px;
}
/* Round progress: how many people are already drawn. */
.raffle-slot.is-live::before {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: conic-gradient(#ffc400 var(--progress), transparent 0);
  -webkit-mask: radial-gradient(circle, transparent 68%, #000 70%);
  mask: radial-gradient(circle, transparent 68%, #000 70%);
  pointer-events: none;
}
.raffle {
  position: relative;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 2px dashed var(--ds-border, #8993a4);
  border-radius: 50%;
  background: var(--ds-surface, #fff);
  color: var(--ds-text-subtle, #626f86);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  animation: raffle-breathe 3.4s ease-in-out infinite;
  transform: rotate(var(--tilt));
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease,
    border-color 0.25s ease, color 0.25s ease;
}
.raffle:hover {
  color: var(--ds-text-brand, #0c66e4);
  border-color: var(--ds-border-brand, #0c66e4);
  box-shadow: 0 0 0 3px rgba(12, 102, 228, 0.25), 0 0 18px rgba(255, 196, 0, 0.6);
}
.raffle:focus-visible {
  outline: 2px solid var(--ds-border-focused, #0c66e4);
  outline-offset: 2px;
}
.raffle:disabled {
  cursor: progress;
}
/* A winner is a prize, not an empty slot: gold ring instead of the placeholder. */
.raffle.has-pick {
  border: none;
  background: conic-gradient(from 210deg, #ffc400, #ff8b00, #ffdf6e, #ffc400);
  padding: 2px;
  animation: none;
}
.raffle.is-spinning {
  border-style: solid;
  border-color: var(--ds-border-brand, #0c66e4);
  animation: none;
}
.raffle.is-landed {
  animation: raffle-land 0.9s cubic-bezier(0.2, 1.6, 0.3, 1);
}
.raffle.is-impatient {
  animation: raffle-wiggle 1.2s ease-in-out infinite;
}
.raffle__icon {
  width: 14px;
  height: 14px;
  display: block;
  flex: none;
}
.raffle__avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
.raffle__badge {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 10px;
  height: 10px;
  pointer-events: none;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
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
    transform: scale(1);
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
}
</style>
