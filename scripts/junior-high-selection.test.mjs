import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/components/junior-high/junior-high-demo.tsx", import.meta.url), "utf8");
const workbench = fs.readFileSync(new URL("../src/components/junior-high/beijing-paper-workbench.tsx", import.meta.url), "utf8");
const inventory = JSON.parse(fs.readFileSync(new URL("../src/lib/junior-high/paper-inventory.json", import.meta.url), "utf8"));

test("practice selection resolves a real catalog paper instead of a sample fallback", () => {
  assert.match(source, /getJuniorHighPaper\(year, region\)/);
  assert.match(source, /createPracticePaper/);
  assert.doesNotMatch(source, /const catalogPaper = mode === "mock"/);
  assert.doesNotMatch(source, /const sample = mode === "mock"/);
});

test("selection only exposes years and regions that have imported papers", () => {
  assert.match(source, /JUNIOR_HIGH_PAPER_CATALOG/);
  assert.match(source, /AVAILABLE_JUNIOR_HIGH_YEARS/);
  assert.match(source, /regionsForYear\(year\)/);
  assert.doesNotMatch(source, /\{JUNIOR_HIGH_YEARS\.map/);
  assert.doesNotMatch(source, /\{JUNIOR_HIGH_REGIONS\.map/);

  assert.equal(inventory.length, 30);
  assert.equal(inventory.some((paper) => paper.year === 2024 && paper.region === "新疆"), false);
  assert.equal(inventory.some((paper) => paper.year === 2022 && paper.region === "新疆"), true);
});

test("practice workbench starts with a manual stopwatch", () => {
  assert.match(source, /autoStart=\{mode === "mock"\}/);
  assert.match(source, /timerMode=\{mode === "mock" \? "countdown" : "stopwatch"\}/);
  assert.match(workbench, /autoStart = true/);
  assert.match(workbench, /timerMode = "countdown"/);
});
