<script setup lang="ts">
import { onMounted, ref } from "vue";
import { AUTO_CLOSES, MOTIONS, settings, settingsReady, WIN_CHANCES } from "../../utils/settings";

const ROUND_PREFIX = "raffle:";

const current = ref({ ...settings });
const cleared = ref(false);

onMounted(async () => {
  await settingsReady;
  current.value = { ...settings };
});

const set = async (patch: Partial<typeof settings>) => {
  current.value = { ...current.value, ...patch };
  await browser.storage.local.set(patch);
};

/** Rounds and their banked talk times, every board at once. */
const resetRounds = async () => {
  const keys = Object.keys(await browser.storage.local.get(null)).filter((k) =>
    k.startsWith(ROUND_PREFIX),
  );
  await browser.storage.local.remove(keys);
  cleared.value = true;
  setTimeout(() => (cleared.value = false), 1800);
};
</script>

<template>
  <main class="card">
    <header class="hero"><span>🎲</span><h1>Assignee Raffle</h1></header>

    <section>
      <h2>Win chance</h2>
      <div class="seg">
        <button
          v-for="option in WIN_CHANCES"
          :key="option.value"
          type="button"
          :class="{ 'is-on': current.winChance === option.value }"
          @click="set({ winChance: option.value })"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <section>
      <h2>Auto-close after a win</h2>
      <div class="seg">
        <button
          v-for="option in AUTO_CLOSES"
          :key="option.value"
          type="button"
          :class="{ 'is-on': current.autoClose === option.value }"
          @click="set({ autoClose: option.value })"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <section>
      <h2>Animations</h2>
      <div class="seg">
        <button
          v-for="option in MOTIONS"
          :key="option.value"
          type="button"
          :class="{ 'is-on': current.motion === option.value }"
          @click="set({ motion: option.value as typeof current.motion })"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <button
      class="toggle"
      type="button"
      role="switch"
      :aria-checked="current.sound"
      @click="set({ sound: !current.sound })"
    >
      <span>Sound effects</span>
      <span class="switch" :class="{ 'switch--on': current.sound }"><i /></span>
    </button>

    <button class="action" type="button" @click="resetRounds">
      {{ cleared ? "✓ Rounds reset" : "Reset all rounds" }}
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
  gap: 14px;
  background: #fff;
  color: #172b4d;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.hero {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hero h1 {
  margin: 0;
  font-size: 15px;
}
h2 {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #626f86;
  font-weight: 600;
}
.seg {
  display: flex;
  gap: 4px;
}
.seg button {
  flex: 1;
  padding: 6px 0;
  font: 500 12px/1.2 inherit;
  color: #44546f;
  background: rgba(9, 30, 66, 0.06);
  border: 0;
  border-radius: 3px;
  cursor: pointer;
}
.seg button:hover {
  background: rgba(9, 30, 66, 0.1);
}
.seg button.is-on {
  background: #0c66e4;
  color: #fff;
}
.toggle,
.action {
  font: 500 13px/1.2 inherit;
  cursor: pointer;
  border-radius: 3px;
  padding: 9px 12px;
}
.toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #172b4d;
  border: 1px solid #dfe1e6;
  background: #fff;
}
.action {
  border: 0;
  color: #fff;
  background: #0c66e4;
}
.action:hover {
  background: #0055cc;
}
.seg button:focus-visible,
.toggle:focus-visible,
.action:focus-visible {
  outline: 2px solid #0c66e4;
  outline-offset: 2px;
}
.switch {
  width: 34px;
  height: 18px;
  border-radius: 999px;
  background: rgba(9, 30, 66, 0.24);
  padding: 2px;
  transition: background 0.2s ease;
}
.switch i {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
}
.switch--on {
  background: #22a06b;
}
.switch--on i {
  transform: translateX(16px);
}
@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch i {
    transition: none;
  }
}
</style>
