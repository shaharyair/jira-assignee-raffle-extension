/** Synthesized raffle sounds. No audio files, off unless enabled in the popup. */
export const SOUND_KEY = "sound";

let enabled = false;
let ctx: AudioContext | null = null;

browser.storage.local.get(SOUND_KEY).then((s) => (enabled = !!s[SOUND_KEY]));
browser.storage.onChanged.addListener((changes) => {
  if (changes[SOUND_KEY]) enabled = !!changes[SOUND_KEY].newValue;
});

/** Lazy: an AudioContext created before a user gesture starts suspended. */
const audio = () => (ctx ??= new AudioContext());

function beep(freq: number, seconds: number, type: OscillatorType, volume: number, delay = 0) {
  if (!enabled) return;
  const ac = audio();
  const at = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(gain).connect(ac.destination);
  osc.start(at);
  osc.stop(at + seconds);
}

/** One reel step. */
export const tick = () => beep(760 + Math.random() * 120, 0.03, "square", 0.04);

/** Anticipation swell while the roster is being read. */
export const drumroll = () => {
  for (let i = 0; i < 12; i++) beep(150, 0.04, "triangle", 0.02 + i * 0.002, i * 0.05);
};

/** Winner fanfare. */
export const chime = () =>
  [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.35, "sine", 0.07, i * 0.08));
