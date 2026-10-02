import assert from "node:assert/strict";
import test from "node:test";
import { filterProgressWordIds } from "../src/lib/vocabulary/progress-filters.ts";

const words = [{ id: "one" }, { id: "two" }, { id: "three" }, { id: "four" }];
const progress = {
  one: { modeOutcomes: { reading: "familiar", writing: "unfamiliar" } },
  two: { modeOutcomes: { reading: "vague" } },
  three: { lastCategory: "listening", familiarity: "unfamiliar" },
};

test("selecting only a mode returns all words studied in that mode", () => {
  assert.deepEqual(filterProgressWordIds(words, progress, ["reading"]), ["one", "two"]);
});

test("outcome filters require a mode and intersect with that mode's outcome", () => {
  assert.deepEqual(filterProgressWordIds(words, progress, ["reading"], ["vague"]), ["two"]);
  assert.deepEqual(filterProgressWordIds(words, progress, [], ["unfamiliar"]), []);
  assert.deepEqual(filterProgressWordIds(words, progress, ["reading", "listening"], ["unfamiliar"]), ["three"]);
});
