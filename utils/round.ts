/**
 * Per-board round state: who has been drawn, how long each of them talked, and
 * whose clock is running right now.
 *
 * Shared by the button (draws, progress) and the timer bar (times), so it lives
 * on its own rather than in either of them.
 */
export type Person = { id: string; name: string; avatar: string };

export type Turn = { ms: number; name: string; avatar: string };

/** A running clock. `startedAt` is null while paused; `elapsed` is this turn so far. */
export type Running = Person & { startedAt: number | null; elapsed: number };

export type Round = {
  seen: string[];
  times: Record<string, Turn>;
  /** Roster size when the round was last drawn on, so the recap knows when it is done. */
  total: number;
  running?: Running;
};

export const key = (board: string) => `raffle:${board}`;

const EMPTY: Round = { seen: [], times: {}, total: 0 };

/** Pre-timer versions stored a bare id array; read those without a migration pass. */
export async function readRound(board: string): Promise<Round> {
  const stored = (await browser.storage.local.get(key(board)))[key(board)];
  if (Array.isArray(stored)) return { ...EMPTY, seen: stored as string[] };
  return { ...EMPTY, ...(stored as Partial<Round> | undefined) };
}

export const saveRound = (board: string, round: Round) =>
  browser.storage.local.set({ [key(board)]: round });

/** Add a turn's milliseconds to whatever that person already banked this round. */
export function bank(times: Record<string, Turn>, person: Person, ms: number): Record<string, Turn> {
  const previous = times[person.id]?.ms ?? 0;
  return { ...times, [person.id]: { ms: previous + ms, name: person.name, avatar: person.avatar } };
}

/** Milliseconds on the clock, paused or not. */
export const elapsedOf = (running: Running) =>
  running.elapsed + (running.startedAt ? Date.now() - running.startedAt : 0);
