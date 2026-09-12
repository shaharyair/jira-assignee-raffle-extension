<script setup lang="ts">
import { closeMenu, getAssignees, getBoardKey, selectAssignee } from "../utils/jira";
import { runMachine } from "../utils/machine";
import { pickNext } from "../utils/raffle";
import { readRound, saveRound } from "../utils/round";
import { resumeTimer, startTimer } from "../utils/timer";

// Module scope, so a remount mid-draw (Jira rebuilds the filter row on every
// toggle) can't open a second cabinet and burn two people on one click.
let drawing = false;

const board = getBoardKey();
const loading = ref(false);
const seenCount = ref(0);
const total = ref(0);

// Read from storage, not just tracked from this session's draws: a reload
// mid-round must not show an empty counter.
onMounted(async () => {
  const round = await readRound(board);
  seenCount.value = round.seen.length;
  total.value = round.total;
  await resumeTimer(board);
});

const onClick = async () => {
  if (drawing) return;
  drawing = true;
  loading.value = true;
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
      const round = await readRound(board);
      const { id, seen } = pickNext(
        assignees.map((a) => a.id),
        round.seen,
      );
      if (!id) return null;
      // A shorter `seen` means pickNext started a new round; the times go with it.
      const reset = seen.length < round.seen.length;
      await saveRound(board, {
        ...round,
        seen,
        total: assignees.length,
        times: reset ? {} : round.times,
      });
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

    await startTimer(board, { id: winner.id, name: winner.name, avatar: winner.avatar });
  } finally {
    drawing = false;
    loading.value = false;
  }
};
</script>

<template>
  <button
    class="raffle"
    type="button"
    :disabled="loading"
    :class="{ 'is-spinning': loading }"
    title="Pick a random assignee"
    @click="onClick"
  >
    <!-- Inline SVG, not an emoji: emoji glyph metrics differ per platform and
         will not sit centred next to the label. -->
    <svg class="raffle__icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" stroke-width="2" />
      <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
    <span>Raffle</span>
    <span v-if="total" class="raffle__count">{{ seenCount }}/{{ total }}</span>
  </button>
</template>

<style scoped>
/* Sized and coloured like Jira's own filter controls: this is a filter action,
   not an assignee. */
.raffle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  margin-left: 8px;
  padding: 0 10px;
  border: none;
  border-radius: 3px;
  background: var(--ds-background-neutral, rgba(9, 30, 66, 0.06));
  color: var(--ds-text, #172b4d);
  font: 500 14px/1 inherit;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.raffle:hover {
  background: var(--ds-background-neutral-hovered, rgba(9, 30, 66, 0.08));
}
.raffle:focus-visible {
  outline: 2px solid var(--ds-border-focused, #0c66e4);
  outline-offset: 2px;
}
.raffle:disabled {
  cursor: progress;
  color: var(--ds-text-disabled, #8993a4);
}
.raffle__icon {
  width: 16px;
  height: 16px;
  flex: none;
}
.raffle.is-spinning .raffle__icon {
  animation: raffle-spin 0.7s linear infinite;
}
.raffle__count {
  color: var(--ds-text-subtle, #626f86);
  font-variant-numeric: tabular-nums;
}
@keyframes raffle-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .raffle.is-spinning .raffle__icon {
    animation: none;
  }
}
</style>
