import assert from "node:assert/strict";
import test from "node:test";
import { bank } from "./round.ts";
import { format } from "./timer.ts";

test("clock reads mm:ss and grows an hours field", () => {
  assert.equal(format(0), "00:00");
  assert.equal(format(59_000), "00:59");
  assert.equal(format(60_000), "01:00");
  assert.equal(format(3_599_000), "59:59");
  assert.equal(format(3_723_000), "1:02:03");
  assert.equal(format(-5), "00:00", "a clock never runs backwards");
});

test("a second turn adds to the first instead of replacing it", () => {
  const dana = { id: "1", name: "Dana", avatar: "d.png" };
  const once = bank({}, dana, 60_000);
  const twice = bank(once, dana, 30_000);

  assert.equal(twice["1"]?.ms, 90_000);
  assert.equal(twice["1"]?.name, "Dana");
  assert.equal(once["1"]?.ms, 60_000, "the input map is not mutated");
});
