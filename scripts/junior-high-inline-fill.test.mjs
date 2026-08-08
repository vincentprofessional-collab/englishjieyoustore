import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/components/junior-high/beijing-paper-workbench.tsx", import.meta.url), "utf8");

test("fill questions expose inline answer controls", () => {
  assert.match(source, /question\.inputKind === "blank"/);
  assert.match(source, /<input/);
  assert.match(source, /junior-high-inline-answer/);
  assert.match(source, /onAnswer\(event\.target\.value\)/);
});
