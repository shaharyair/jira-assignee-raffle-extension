import assert from "node:assert/strict";
import test from "node:test";
import { reelStrip } from "./reel.ts";

test("strip lands on the winner and is filled from the roster", () => {
  const avatars = ["a.png", "b.png", "c.png"];
  const strip = reelStrip(avatars, "b.png", 10);

  assert.equal(strip.length, 10);
  assert.equal(strip.at(-1), "b.png", "last frame is the winner");
  assert.ok(strip.every((s) => avatars.includes(s)), "no frames invented");
});

test("empty roster still shows the winner", () => {
  assert.deepEqual(reelStrip([], "w.png"), ["w.png"]);
});
