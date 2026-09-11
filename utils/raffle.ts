/** Pure raffle logic: pick an unseen id, reset once everyone has been drawn. */
const sample = (ids: string[]) => ids[Math.floor(Math.random() * ids.length)]!;

export function pickNext(ids: string[], seen: string[]): { id: string | null; seen: string[] } {
  if (!ids.length) return { id: null, seen: [] };

  // Drop ids that left the board, so a shrinking roster still exhausts.
  const stillValid = seen.filter((id) => ids.includes(id));
  const pool = ids.filter((id) => !stillValid.includes(id));

  // Everyone drawn -> new round.
  if (!pool.length) {
    const id = sample(ids);
    return { id, seen: [id] };
  }

  const id = sample(pool);
  return { id, seen: [...stillValid, id] };
}
