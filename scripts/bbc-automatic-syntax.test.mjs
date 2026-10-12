import assert from "node:assert/strict";
import test from "node:test";
import referenceData from "../src/data/bbc/2026-syntax.json" with { type: "json" };
import { buildAutomaticBbcSyntax } from "../src/lib/articles/bbc-automatic-syntax.ts";

function spans(data, level) {
  return data[`level${level}`].map(({ label, start, end }) => ({
    label,
    text: data.tokens.slice(start, end).map((token) => token.text).join(" "),
  }));
}

test("keeps all reviewed annotations from the three July BBC articles unchanged", () => {
  let checked = 0;
  for (const id of ["260713", "260720", "260727"]) {
    for (const reference of referenceData[id]) {
      assert.deepEqual(buildAutomaticBbcSyntax(reference.text), reference, `${id}: ${reference.text}`);
      checked += 1;
    }
  }
  assert.equal(checked, 64);
});

test("labels inverted questions and embedded wh clauses", () => {
  const result = buildAutomaticBbcSyntax("Could you tell me where the station is?");
  assert.equal(result.status, "draft");
  assert.deepEqual(spans(result, 1), [
    { label: "谓语", text: "Could" },
    { label: "主语", text: "you" },
    { label: "谓语", text: "tell" },
    { label: "宾语", text: "me" },
    { label: "地点状语从句", text: "where the station is" },
  ]);
  assert.deepEqual(spans(result, 2), [
    { label: "主语", text: "the station" },
    { label: "谓语", text: "is" },
  ]);
});

test("handles restrictive and parenthetical relative clauses", () => {
  const restrictive = buildAutomaticBbcSyntax("The book that I bought yesterday is expensive.");
  assert.deepEqual(spans(restrictive, 1), [
    { label: "主语", text: "The book that I bought yesterday" },
    { label: "谓语", text: "is" },
    { label: "表语", text: "expensive" },
  ]);
  assert.deepEqual(spans(restrictive, 2), [{ label: "定语从句", text: "that I bought yesterday" }]);
  assert.deepEqual(spans(restrictive, 3), [
    { label: "主语", text: "I" },
    { label: "谓语", text: "bought" },
    { label: "状语", text: "yesterday" },
  ]);

  const parenthetical = buildAutomaticBbcSyntax("The museum, which opened last year, attracts many visitors.");
  assert.deepEqual(spans(parenthetical, 1), [
    { label: "主语", text: "The museum , which opened last year" },
    { label: "谓语", text: "attracts" },
    { label: "宾语", text: "many visitors" },
  ]);
  assert.deepEqual(spans(parenthetical, 2), [{ label: "定语从句", text: "which opened last year" }]);
  assert.deepEqual(spans(parenthetical, 3), [
    { label: "主语", text: "which" },
    { label: "谓语", text: "opened" },
    { label: "状语", text: "last year" },
  ]);

  const progressive = buildAutomaticBbcSyntax("I saw the man who was carrying a bag.");
  assert.deepEqual(spans(progressive, 3), [
    { label: "主语", text: "who" },
    { label: "谓语", text: "was carrying" },
    { label: "宾语", text: "a bag" },
  ]);
});

test("does not mistake a wh question for a subordinate clause", () => {
  const result = buildAutomaticBbcSyntax("Where does the tour start?");
  assert.deepEqual(spans(result, 1), [
    { label: "状语", text: "Where" },
    { label: "谓语", text: "does" },
    { label: "主语", text: "the tour" },
    { label: "谓语", text: "start" },
  ]);
});

test("keeps generated token offsets aligned to the original text", () => {
  const result = buildAutomaticBbcSyntax("There is a bus that leaves every hour.");
  for (const token of result.tokens) assert.equal(result.text.slice(token.start, token.end), token.text);
  assert.equal(result.status, "draft");
  assert.deepEqual(spans(result, 2), [{ label: "定语从句", text: "that leaves every hour" }]);
});
