/**
 * The standup clock: after a win the cabinet steps aside and a bar counts how
 * long the drawn assignee talks.
 *
 * Plain DOM on document.body for the same reason as the cabinet: Jira rebuilds
 * the filter row (and our mount container with it) constantly, which would tear
 * a component-owned bar off the page mid-count.
 *
 * Elapsed time is a Date.now() difference, never an incremented counter: a
 * background tab throttles intervals and would under-report the talker.
 */
import { bank, elapsedOf, readRound, saveRound, type Person, type Round, type Turn   // Extensioned so `node --test` can load this module directly; Vite is fine with it.
} from "./round.ts";

const TICK_MS = 1000;

/** "07:24", and "1:02:03" once someone has gone past an hour. */
export function format(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = Math.floor(seconds / 3600);
  const rest = `${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  return hours ? `${hours}:${rest}` : rest;
}

const CSS = `
.jr-timer {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  z-index: 2147483645;
  display: flex; align-items: center; gap: 10px;
  min-width: 260px; max-width: 440px; padding: 8px 10px;
  border-radius: 6px; border: 1px solid #dfe1e6; background: #fff;
  box-shadow: 0 8px 24px rgba(9,30,66,.24);
  font: 500 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #172b4d;
}
.jr-timer img { width: 24px; height: 24px; border-radius: 50%; flex: none }
.jr-timer__name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.jr-timer__clock { font-variant-numeric: tabular-nums; font-size: 15px; font-weight: 600 }
.jr-timer__clock.is-paused { opacity: .5 }
.jr-timer button {
  font: inherit; cursor: pointer; color: #44546f; flex: none;
  border: 1px solid #dfe1e6; border-radius: 3px; background: #fff;
  padding: 2px 8px; line-height: 1.4;
}
.jr-timer button:hover { background: #f1f2f4 }
.jr-timer button:focus-visible { outline: 2px solid #0c66e4; outline-offset: 1px }
.jr-recap { flex-direction: column; align-items: stretch; gap: 6px; padding: 12px }
.jr-recap__head { display: flex; align-items: baseline; gap: 8px; font-size: 11px;
  letter-spacing: .08em; text-transform: uppercase; color: #626f86 }
.jr-recap__total { margin-left: auto; font-variant-numeric: tabular-nums; color: #172b4d }
.jr-recap__row { display: flex; align-items: center; gap: 8px }
.jr-recap__row span:first-of-type { flex: 1; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap }
.jr-recap__row b { font-variant-numeric: tabular-nums; font-weight: 600 }
`;

let styles: HTMLStyleElement | null = null;
const ensureStyles = () => {
  if (styles?.isConnected) return;
  styles = document.createElement("style");
  styles.textContent = CSS;
  document.head.append(styles);
};

let bar: HTMLElement | null = null;
let ticker: ReturnType<typeof setInterval> | undefined;

function teardown() {
  clearInterval(ticker);
  bar?.remove();
  bar = null;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = "") => {
  const node = document.createElement(tag);
  node.className = className;
  return node;
};

/** Everyone drawn and nobody still talking: show the round instead of a clock. */
function renderRecap(times: Record<string, Turn>) {
  teardown();
  ensureStyles();
  const entries = Object.values(times).sort((a, b) => b.ms - a.ms);
  if (!entries.length) return;

  bar = el("div", "jr-timer jr-recap");
  bar.setAttribute("role", "status");

  const head = el("div", "jr-recap__head");
  head.append("Round done");
  const total = el("span", "jr-recap__total");
  total.textContent = `total ${format(entries.reduce((sum, t) => sum + t.ms, 0))}`;
  const dismiss = el("button");
  dismiss.type = "button";
  dismiss.textContent = "✕";
  dismiss.setAttribute("aria-label", "Dismiss the round summary");
  dismiss.addEventListener("click", teardown);
  head.append(total, dismiss);
  bar.append(head);

  for (const turn of entries) {
    const row = el("div", "jr-recap__row");
    if (turn.avatar) {
      const img = el("img");
      img.src = turn.avatar;
      img.alt = "";
      row.append(img);
    }
    const name = el("span");
    name.textContent = turn.name || "Someone";
    const time = el("b");
    time.textContent = format(turn.ms);
    row.append(name, time);
    bar.append(row);
  }
  document.body.append(bar);
}

/** Draw the bar for whoever the stored round says is on the clock. */
function render(board: string, round: Round) {
  teardown();
  const running = round.running;
  if (!running) return;
  ensureStyles();

  bar = el("div", "jr-timer");
  bar.setAttribute("role", "status");

  if (running.avatar) {
    const img = el("img");
    img.src = running.avatar;
    img.alt = "";
    bar.append(img);
  }

  const name = el("span", "jr-timer__name");
  name.textContent = running.name || "Someone";

  const clock = el("span", "jr-timer__clock");
  const paint = () => {
    const current = round.running;
    if (!current) return;
    clock.textContent = format(elapsedOf(current));
    clock.classList.toggle("is-paused", !current.startedAt);
  };
  paint();

  const hold = el("button");
  hold.type = "button";
  const labelHold = () => {
    const paused = !round.running?.startedAt;
    hold.textContent = paused ? "▶" : "⏸";
    hold.setAttribute("aria-label", paused ? "Resume the timer" : "Pause the timer");
  };
  labelHold();
  hold.addEventListener("click", async () => {
    const current = round.running;
    if (!current) return;
    if (current.startedAt) {
      current.elapsed = elapsedOf(current);
      current.startedAt = null;
    } else {
      current.startedAt = Date.now();
    }
    labelHold();
    paint();
    await saveRound(board, round);
  });

  const stop = el("button");
  stop.type = "button";
  stop.textContent = "✕";
  stop.setAttribute("aria-label", "Stop the timer");
  stop.addEventListener("click", async () => {
    const banked = await stopTimer(board);
    // The last person has no next draw to bank them, so the round can only be
    // complete here: this is where the recap belongs.
    if (banked.total && banked.seen.length >= banked.total) renderRecap(banked.times);
  });

  bar.append(name, clock, hold, stop);
  document.body.append(bar);
  ticker = setInterval(paint, TICK_MS);
}

/** Bank the running turn and clear the clock. Returns the saved round. */
export async function stopTimer(board: string): Promise<Round> {
  const round = await readRound(board);
  if (round.running) {
    round.times = bank(round.times, round.running, elapsedOf(round.running));
    delete round.running;
    await saveRound(board, round);
  }
  teardown();
  return round;
}

/** Put `person` on the clock, banking whoever was on it before. */
export async function startTimer(board: string, person: Person) {
  const round = await stopTimer(board);
  round.running = { ...person, startedAt: Date.now(), elapsed: 0 };
  await saveRound(board, round);
  render(board, round);
}

/** Re-draw a clock that was already running, e.g. after a page reload. */
export async function resumeTimer(board: string) {
  const round = await readRound(board);
  if (round.running) render(board, round);
}
