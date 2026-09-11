import assert from "node:assert/strict";
import test from "node:test";
import { pickNext } from "./raffle.ts";

test("draws everyone exactly once before repeating", () => {
  const ids = ["a", "b", "c", "d"];
  let seen: string[] = [];
  const drawn: string[] = [];

  for (let i = 0; i < ids.length; i++) {
    const result = pickNext(ids, seen);
    assert.ok(result.id, "expected a pick");
    drawn.push(result.id!);
    seen = result.seen;
  }

  assert.deepEqual([...drawn].sort(), ids, "each id drawn exactly once per round");

  // Round is full -> next pick starts a fresh round of one.
  const next = pickNext(ids, seen);
  assert.ok(ids.includes(next.id!));
  assert.deepEqual(next.seen, [next.id], "seen resets to just the new pick");
});

test("forgets ids that left the board", () => {
  const { seen } = pickNext(["a", "b"], ["a", "gone"]);
  assert.ok(!seen.includes("gone"));
  assert.deepEqual(seen, ["a", "b"]);
});

test("empty roster yields no pick", () => {
  assert.deepEqual(pickNext([], ["a"]), { id: null, seen: [] });
});
