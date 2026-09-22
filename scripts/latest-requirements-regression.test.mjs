import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [siteNav, articlesPage, articlesHome, newConceptLesson, vocabularyLearning, vocabularyLearningLib, globalCss] = await Promise.all([
  readFile(new URL("../src/components/site-nav.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/articles/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/articles-home.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/new-concept-lesson-page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/vocabulary-learning.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/vocabulary/learning.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
]);

test("top navigation opens section pages instead of hover dropdowns", () => {
  assert.match(siteNav, /href=\{firstEnabledHref\(item\)\}/);
  assert.doesNotMatch(siteNav, /onMouseEnter|onMouseLeave|nav-dropdown/);
});

test("BBC archive defaults to 2026 and renders the selected year article list", () => {
  assert.match(articlesPage, /BBC_DEFAULT_YEAR/);
  assert.match(articlesPage, /right\.id\.localeCompare\(left\.id\)/);
  assert.match(articlesHome, /className="bbc-selected-year"/);
  assert.match(articlesHome, /href=\{`\/articles\?year=\$\{group\.year\}`\}/);
});

test("New Concept original copy remains plain and the mobile navigation stays on one row", () => {
  assert.match(newConceptLesson, /function renderNewConceptArticleEnglish\(text: string\)/);
  assert.doesNotMatch(
    newConceptLesson.match(/function renderNewConceptArticleEnglish[\s\S]*?\n\}/)?.[0] ?? "",
    /bbc-vocabulary-highlight/,
  );
  assert.match(globalCss, /\.nav-main\s*\{[\s\S]*?flex-wrap:\s*nowrap;[\s\S]*?overflow-x:\s*auto;/);
  assert.match(globalCss, /\.nav-actions\s*\{[\s\S]*?flex-wrap:\s*nowrap;/);
});

test("vocabulary books accumulate lower levels without auto-classifying scored rounds", () => {
  assert.match(vocabularyLearningLib, /entryRank > 0 && entryRank <= selectedRank/);
  assert.match(vocabularyLearning, /commitOutcome\(requestedOutcome, \{/);
  assert.doesNotMatch(vocabularyLearning, /if \(!currentWord \|\| modeIndex !== 3[\s\S]*?commitOutcome\("familiar"/);
  assert.match(vocabularyLearning, /setOralScoreFeedback\(score\);[\s\S]*?setPhase\("awaiting"\);/);
});
