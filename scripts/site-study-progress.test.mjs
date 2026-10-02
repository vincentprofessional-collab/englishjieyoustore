import assert from "node:assert/strict";
import test from "node:test";
import { recordDailyLearningSeconds, recordStudyPage, recordVocabularyLookup, readSiteStudyHistory, SITE_DAILY_PROGRESS_KEY } from "../src/lib/learning/site-progress.ts";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("site study tracking records active time and unique articles per local day", () => {
  const storage = memoryStorage();
  const today = new Date(2026, 9, 2, 12);
  recordStudyPage("/articles/word-building", storage, today);
  recordStudyPage("/articles/word-building", storage, today);
  recordStudyPage("/new-concept/lesson-001", storage, today);
  recordVocabularyLookup("Disappointment", storage, today);
  recordVocabularyLookup(" disappointment ", storage, today);
  recordVocabularyLookup("gap", storage, today);
  recordDailyLearningSeconds(125, storage, today);

  const days = readSiteStudyHistory(storage);
  assert.deepEqual(days["2026-10-02"], {
    lookedUpWords: ["disappointment", "gap"],
    seconds: 120,
    studyItems: ["bbc:word-building", "new-concept:lesson-001"],
  });
  assert.equal(storage.getItem(SITE_DAILY_PROGRESS_KEY) !== null, true);
});

test("daily progress keeps five years of history and reads older entries without lookup data", () => {
  const storage = memoryStorage();
  const seeded = Object.fromEntries(Array.from({ length: 1830 }, (_, index) => {
    const date = new Date(Date.UTC(2000, 0, index + 1)).toISOString().slice(0, 10);
    return [date, { seconds: 60, studyItems: [] }];
  }));
  storage.setItem(SITE_DAILY_PROGRESS_KEY, JSON.stringify(seeded));
  recordDailyLearningSeconds(60, storage, new Date(2026, 9, 2, 12));

  const days = readSiteStudyHistory(storage);
  assert.equal(Object.keys(days).length, 1826);
  assert.deepEqual(days["2000-01-01"], undefined);
  assert.deepEqual(days["2000-01-06"].lookedUpWords, []);
  assert.equal(days["2026-10-02"].seconds, 60);
});
