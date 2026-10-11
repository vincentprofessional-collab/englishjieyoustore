import assert from "node:assert/strict";
import test from "node:test";
import {
  activityForLearningPath,
  readSiteStudyHistory,
  recordDailyLearningSeconds,
} from "../src/lib/learning/site-progress.ts";

test("study page paths map to the three progress categories", () => {
  assert.equal(activityForLearningPath("/articles/260803-gen-z"), "articles");
  assert.equal(activityForLearningPath("/vocabulary"), "vocabulary");
  assert.equal(activityForLearningPath("/vocabulary/aberrant"), "lookups");
  assert.equal(activityForLearningPath("/me/progress"), undefined);
});

test("category time adds to the existing daily total without changing old records", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const date = new Date("2026-10-10T12:00:00");

  recordDailyLearningSeconds(65, storage, date, "articles");
  recordDailyLearningSeconds(90, storage, date, "vocabulary");

  const day = readSiteStudyHistory(storage)["2026-10-10"];
  assert.equal(day.seconds, 155);
  assert.deepEqual(day.activitySeconds, { articles: 65, vocabulary: 90, lookups: 0 });
});
