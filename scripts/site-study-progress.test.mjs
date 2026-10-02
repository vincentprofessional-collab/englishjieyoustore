import assert from "node:assert/strict";
import test from "node:test";
import { recordDailyLearningSeconds, recordStudyPage, readSiteStudyHistory, SITE_DAILY_PROGRESS_KEY } from "../src/lib/learning/site-progress.ts";

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
  recordDailyLearningSeconds(125, storage, today);

  const days = readSiteStudyHistory(storage);
  assert.deepEqual(days["2026-10-02"], {
    seconds: 120,
    studyItems: ["bbc:word-building", "new-concept:lesson-001"],
  });
  assert.equal(storage.getItem(SITE_DAILY_PROGRESS_KEY) !== null, true);
});
