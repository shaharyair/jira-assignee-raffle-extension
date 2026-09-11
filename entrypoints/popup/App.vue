<script setup lang="ts">
import { onMounted, ref } from "vue";
import { SOUND_KEY } from "../../utils/sound";

const BOARD_PREFIX = "raffle:";

const sound = ref(false);
const rounds = ref<{ key: string; board: string; drawn: number }[]>([]);
const cleared = ref(false);

const load = async () => {
  const all = await browser.storage.local.get(null);
  sound.value = !!all[SOUND_KEY];
  rounds.value = Object.entries(all)
    .filter(([key, value]) => key.startsWith(BOARD_PREFIX) && Array.isArray(value))
    .map(([key, value]) => ({
      key,
      board: key.slice(BOARD_PREFIX.length).split("/").filter(Boolean).slice(-3).join(" / "),
      drawn: (value as string[]).length,
    }));
};

const toggleSound = async () => {
  sound.value = !sound.value;
  await browser.storage.local.set({ [SOUND_KEY]: sound.value });
};

const resetRounds = async () => {
  await browser.storage.local.remove(rounds.value.map((r) => r.key));
  cleared.value = true;
  setTimeout(() => (cleared.value = false), 1800);
  await load();
};

onMounted(load);
</script>

<template>
  <main class="card">
    <header class="hero">
      <span class="hero__dice">🎲</span>
      <div>
        <h1>Assignee Raffle</h1>
        <p>Everyone gets a turn before anyone repeats.</p>
      </div>
    </header>

    <section class="panel">
      <h2>Rounds in progress</h2>
      <ul v-if="rounds.length" class="rounds">
        <li v-for="round in rounds" :key="round.key">
          <span class="rounds__board">{{ round.board }}</span>
          <span class="rounds__count">{{ round.drawn }} drawn</span>
        </li>
      </ul>
      <p v-else class="empty">No draws yet. Open a Jira board and hit the dice.</p>
    </section>

    <button class="action" :class="{ 'action--done': cleared }" type="button" @click="resetRounds">
      <span v-if="cleared">✓ Rounds reset</span>
      <span v-else>Reset all rounds</span>
    </button>

    <button class="toggle" type="button" role="switch" :aria-checked="sound" @click="toggleSound">
      <span>Sound effects</span>
      <span class="switch" :class="{ 'switch--on': sound }"><i /></span>
    </button>
  </main>
</template>

<style>
body {
  margin: 0;
}
</style>

<style scoped>
.card {
  width: 288px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #e7ecf5;
  background: #12151c;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.hero {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(120deg, #0c66e4, #8777d9, #ffc400, #0c66e4);
  background-size: 300% 300%;
  animation: hero-flow 9s ease infinite;
}
.hero__dice {
  font-size: 26px;
  animation: hero-roll 4.5s cubic-bezier(0.6, -0.2, 0.3, 1.4) infinite;
}
.hero h1 {
  margin: 0;
  font-size: 15px;
}
.hero p {
  margin: 2px 0 0;
  font-size: 11px;
  opacity: 0.85;
}
.panel {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}
.panel h2 {
  margin: 0 0 8px;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.6;
}
.rounds {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.rounds li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.rounds__board {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rounds__count {
  color: #ffc400;
  flex: none;
}
.empty {
  margin: 0;
  font-size: 12px;
  opacity: 0.6;
}
.action,
.toggle {
  font: inherit;
  color: inherit;
  cursor: pointer;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  transition: background 0.2s ease, transform 0.15s ease;
}
.action {
  border: 0;
  background: linear-gradient(120deg, #0c66e4, #8777d9);
  font-weight: 600;
}
.action:hover {
  transform: translateY(-1px);
}
.action--done {
  background: #36b37e;
}
.toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.04);
}
.switch {
  width: 34px;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  padding: 2px;
  transition: background 0.2s ease;
}
.switch i {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s cubic-bezier(0.2, 1.4, 0.3, 1);
}
.switch--on {
  background: #36b37e;
}
.switch--on i {
  transform: translateX(16px);
}
@keyframes hero-flow {
  50% {
    background-position: 100% 50%;
  }
}
@keyframes hero-roll {
  0%,
  60%,
  100% {
    transform: none;
  }
  70% {
    transform: rotate(180deg) scale(1.2);
  }
  80% {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .hero,
  .hero__dice {
    animation: none;
  }
}
</style>
