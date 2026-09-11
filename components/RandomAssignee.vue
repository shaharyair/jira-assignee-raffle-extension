<script setup lang="ts">
import { getAssignees, getBoardKey, selectAssignee, type Assignee } from "../utils/jira";
import { pickNext } from "../utils/raffle";

// Module scope, so a remount mid-draw (Jira rebuilds the filter row on every
// toggle) can't start a second raffle and burn two people on one click.
let drawing = false;

const storageKey = `raffle:${getBoardKey()}`;
const picked = ref<Assignee | null>(null);
const loading = ref(false);

const readSeen = async (): Promise<string[]> => {
  const stored = await browser.storage.local.get(storageKey);
  return (stored[storageKey] as string[] | undefined) ?? [];
};

const onClick = async () => {
  if (drawing) return;
  drawing = true;
  loading.value = true;
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
    await selectAssignee(id);
    picked.value = assignees.find((a) => a.id === id) ?? null;
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
    :title="picked ? `Raffle picked ${picked.name}` : 'Pick a random assignee'"
    :aria-label="picked ? `Raffle picked ${picked.name}. Pick again` : 'Pick a random assignee'"
    @click="onClick"
  >
    <img v-if="picked?.avatar" class="raffle__avatar" :src="picked.avatar" alt="" />
    <span v-else class="raffle__icon" aria-hidden="true">🎲</span>
    <span v-if="loading" class="raffle__spinner" aria-hidden="true" />
  </button>
</template>

<style scoped>
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
  font-size: 12px;
  line-height: 1;
}
.raffle:disabled {
  cursor: progress;
}
.raffle__avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
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
</style>
