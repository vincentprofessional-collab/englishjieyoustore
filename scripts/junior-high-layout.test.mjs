import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const css = fs.readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

test("junior high exam layout contains long content without page-wide overflow", () => {
  const pageRule = rule(".junior-high-exam-page");
  const toolbarTitleRule = rule(".junior-high-exam-toolbar-title strong");
  const contentRule = rule(".junior-high-paper-content, .junior-high-paper-section, .junior-high-question-card");
  const sourceTextRule = rule(".junior-high-source-paragraph");
  const questionTextRule = rule(".junior-high-question-prompt");
  const writingTextRule = rule(".junior-high-writing-prompt");

  assert.match(pageRule, /max-width:\s*100%/);
  assert.match(pageRule, /overflow-x:\s*clip/);
  assert.match(toolbarTitleRule, /white-space:\s*normal/);
  assert.match(toolbarTitleRule, /overflow-wrap:\s*anywhere/);
  assert.match(contentRule, /min-width:\s*0/);
  assert.match(sourceTextRule, /overflow-wrap:\s*anywhere/);
  assert.match(questionTextRule, /overflow-wrap:\s*anywhere/);
  assert.match(writingTextRule, /overflow-wrap:\s*anywhere/);
  assert.match(rule(".junior-high-source-image"), /max-height:\s*300px/);
  assert.match(rule(".junior-high-context-image"), /max-height:\s*180px/);
  assert.match(rule(".junior-high-writing-diagram"), /max-height:\s*300px/);
  assert.match(rule(".junior-high-inline-blank-wide"), /min-width:\s*180px/);
});

test("source tables keep their own narrow overflow boundary", () => {
  const tableWrapRule = rule(".junior-high-source-table-wrap");
  const tableCellRule = rule(".junior-high-source-table td");

  assert.match(tableWrapRule, /overflow-x:\s*auto/);
  assert.match(rule(".junior-high-source-table"), /min-width:\s*0/);
  assert.match(rule(".junior-high-source-table"), /table-layout:\s*fixed/);
  assert.match(tableCellRule, /overflow-wrap:\s*anywhere/);
});
