import assert from "node:assert/strict";
import test from "node:test";
import { scheduleReview, selectEnabledMode } from "../src/lib/vocabulary/review-scheduler.ts";

const minute = 60_000;

function advance(previous, outcome, now, hadInputError = false) {
  const next = scheduleReview(previous, outcome, now, hadInputError);
  return { ...previous, ...next, lastOutcome: outcome, lastReviewedAt: now };
}

test("生僻留在当前档，连续三次熟悉后才进下一档", () => {
  let previous = { lastReviewedAt: null, modeIndex: 2, plan: "short-term" };
  previous = advance(previous, "unfamiliar", 0);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.nextReviewAt, minute);
  assert.equal(previous.recoveryRequired, true);

  previous = advance(previous, "familiar", minute);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.nextReviewAt, 6 * minute);
  assert.equal(previous.recoveryFamiliarStreak, 1);

  previous = advance(previous, "familiar", 6 * minute);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.nextReviewAt, 16 * minute);
  assert.equal(previous.recoveryFamiliarStreak, 2);

  previous = advance(previous, "familiar", 16 * minute);
  assert.equal(previous.modeIndex, 3);
  assert.equal(previous.nextReviewAt, 76 * minute);
  assert.equal(previous.recoveryRequired, false);
});

test("恢复期间模糊、再次生僻或拼写错误会重新累计三次熟悉", () => {
  let previous = { lastReviewedAt: null, modeIndex: 1, plan: "short-term" };
  previous = advance(previous, "unfamiliar", 0);
  previous = advance(previous, "familiar", minute);
  previous = advance(previous, "vague", 6 * minute);
  assert.equal(previous.recoveryFamiliarStreak, 0);
  assert.equal(previous.modeIndex, 1);

  previous = advance(previous, "familiar", 9 * minute);
  assert.equal(previous.recoveryFamiliarStreak, 1);
  previous = advance(previous, "familiar", 14 * minute, true);
  assert.equal(previous.recoveryFamiliarStreak, 0);
  assert.equal(previous.modeIndex, 1);

  previous = advance(previous, "unfamiliar", 19 * minute);
  assert.equal(previous.nextReviewAt, 20 * minute);
  assert.equal(previous.recoveryFamiliarStreak, 0);
  assert.equal(previous.modeIndex, 1);
});

test("长期复习选生僻后留在当前档并进入短期恢复", () => {
  const previous = { lastReviewedAt: 0, modeIndex: 3, plan: "long-term", reviewStep: 3 };
  const next = advance(previous, "unfamiliar", minute);
  assert.equal(next.modeIndex, 3);
  assert.equal(next.reviewStep, 0);
  assert.equal(next.nextReviewAt, 2 * minute);
});

test("关闭的考察方式会跳过，单一方式也能进入长期复习", () => {
  assert.equal(selectEnabledMode(2, [0, 1, 3]), 3);
  const previous = { lastReviewedAt: null, modeIndex: 0, plan: "short-term" };
  const readingOnly = scheduleReview(previous, "familiar", 0, false, [1]);
  assert.equal(readingOnly.modeIndex, 1);
  assert.equal(readingOnly.nextReviewAt, 30 * minute);
  assert.equal(readingOnly.plan, "long-term");

  const next = scheduleReview({ ...previous, ...readingOnly, lastReviewedAt: 0 }, "familiar", 30 * minute, false, [1]);
  assert.equal(next.modeIndex, 1);
  assert.equal(next.nextReviewAt, 30 * minute + 3 * 24 * 60 * minute);
});
