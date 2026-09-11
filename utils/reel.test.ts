import assert from "node:assert/strict";
import test from "node:test";
import { REEL_ITEM, reelFrames, reelStrip, spinMs } from "./reel.ts";

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

test("every reel lands on the winner, teased or not", () => {
  for (const nearMiss of [false, true]) {
    const frames = reelFrames(1000, nearMiss, spinMs(2, nearMiss));
    assert.equal(frames.at(-1)!.transform, "translateY(-1000px)", "last frame is the winner");
    assert.ok(
      frames.every((f) => (f.offset ?? 1) <= 1),
      "offsets stay inside the animation",
    );
  }
});

test("the near-miss stops exactly one frame short before creeping in", () => {
  const frames = reelFrames(1000, true, spinMs(2, true));
  const short = `translateY(-${1000 - REEL_ITEM}px)`;
  assert.equal(frames.filter((f) => f.transform === short).length, 2, "stops short, then holds");
  assert.ok(spinMs(2, true) > spinMs(2), "the tease costs extra time, not a different landing");
});
