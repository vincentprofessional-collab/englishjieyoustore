import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/components/junior-high/beijing-paper-workbench.tsx", import.meta.url), "utf8");

test("structured papers render ordered sections and source blocks", () => {
  assert.match(source, /function StructuredPaperContent/);
  assert.match(source, /section\.blocks/);
  assert.match(source, /block\.kind === "table"/);
  assert.match(source, /block\.kind === "image"/);
  assert.doesNotMatch(source, /<pre>\{paper\.sourceText\}<\/pre>/);
  assert.match(source, /junior-high-structured-reading-layout/);
  assert.match(source, /renderInlineBlanks/);
});

test("regional question navigation uses stable ids and display numbers", () => {
  assert.match(source, /key=\{question\.id\}/);
  assert.match(source, /question\.displayNumber \?\? question\.number/);
  assert.doesNotMatch(source, /const byRange =/);
});

test("question controls follow input metadata and analyses stay per question", () => {
  assert.match(source, /question\.inputKind/);
  assert.match(source, /question\.analysis/);
  assert.doesNotMatch(source, /question\.options\.length === 0/);
});
