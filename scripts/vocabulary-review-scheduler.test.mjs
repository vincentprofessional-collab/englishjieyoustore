import assert from "node:assert/strict";
import test from "node:test";
import { nextClassifiedModeIndex, scheduleReview, selectEnabledMode } from "../src/lib/vocabulary/review-scheduler.ts";

const minute = 60_000;
const day = 24 * 60 * minute;

function advance(previous, outcome, now, hadInputError = false) {
  const next = scheduleReview(previous, outcome, now, hadInputError);
  return { ...previous, ...next, lastOutcome: outcome, lastReviewedAt: now };
}

test("每种短期考察方式都要求连续三次熟悉，模糊或生僻后一分钟重考", () => {
  let previous = { lastReviewedAt: null, modeIndex: 1, plan: "short-term" };
  previous = advance(previous, "familiar", 0);
  assert.equal(previous.modeIndex, 1);
  assert.equal(previous.consecutiveFamiliar, 1);
  assert.equal(previous.nextReviewAt, minute);

  previous = advance(previous, "familiar", minute);
  assert.equal(previous.modeIndex, 1);
  assert.equal(previous.consecutiveFamiliar, 2);
  assert.equal(previous.nextReviewAt, 2 * minute);

  previous = advance(previous, "vague", 2 * minute);
  assert.equal(previous.modeIndex, 1);
  assert.equal(previous.consecutiveFamiliar, 0);
  assert.equal(previous.nextReviewAt, 3 * minute);

  previous = advance(previous, "familiar", 3 * minute);
  previous = advance(previous, "familiar", 4 * minute);
  previous = advance(previous, "familiar", 5 * minute);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.consecutiveFamiliar, 0);
  assert.equal(previous.nextReviewAt, 6 * minute);

  previous = advance(previous, "unfamiliar", 6 * minute);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.nextReviewAt, 7 * minute);
});

test("拼写错误打断连续熟悉次数", () => {
  let previous = { lastReviewedAt: null, modeIndex: 3, plan: "short-term", consecutiveFamiliar: 2 };
  previous = advance(previous, "familiar", 0, true);
  assert.equal(previous.modeIndex, 3);
  assert.equal(previous.consecutiveFamiliar, 0);
  assert.equal(previous.nextReviewAt, minute);
});

test("旧进度中的熟悉次数不会跨考察方式沿用", () => {
  const next = scheduleReview({
    consecutiveFamiliar: 2,
    lastReviewedAt: 0,
    modeIndex: 0,
    plan: "short-term",
  }, "familiar", minute);
  assert.equal(next.modeIndex, 0);
  assert.equal(next.consecutiveFamiliar, 1);
  assert.equal(next.nextReviewAt, 2 * minute);
});

test("四种方式各连续熟悉三次后进入三天后的长期复习", () => {
  let previous = { lastReviewedAt: null, modeIndex: 1, plan: "short-term" };
  let now = 0;
  for (const mode of [1, 0, 2, 3]) {
    assert.equal(previous.modeIndex, mode);
    for (let streak = 0; streak < 3; streak += 1) {
      previous = advance(previous, "familiar", now);
      now += minute;
    }
  }
  assert.equal(previous.plan, "long-term");
  assert.equal(previous.reviewStep, 1);
  assert.equal(previous.modeIndex, 1);
  assert.equal(previous.nextReviewAt, now - minute + 3 * day);
});

test("长期复习依次拉长到七天，未熟悉时同一方式每两分钟重试", () => {
  let previous = { lastReviewedAt: 0, modeIndex: 1, plan: "long-term", reviewStep: 1 };
  previous = advance(previous, "familiar", 3 * day);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.reviewStep, 2);
  assert.equal(previous.nextReviewAt, 3 * day + 7 * day);

  previous = advance(previous, "vague", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.recoveryRequired, true);
  assert.equal(previous.nextReviewAt, 10 * day + 2 * minute);

  previous = advance(previous, "unfamiliar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.nextReviewAt, 10 * day + 4 * minute);

  previous = advance(previous, "familiar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.recoveryRequired, false);
  assert.equal(previous.nextReviewAt, 24 * day + 4 * minute);
});

test("关闭的考察方式会跳过，单一方式也能进入长期复习", () => {
  assert.equal(selectEnabledMode(2, [0, 1, 3]), 3);
  const previous = { lastReviewedAt: null, modeIndex: 1, plan: "short-term" };
  const first = scheduleReview(previous, "familiar", 0, false, [1]);
  assert.equal(first.modeIndex, 1);
  assert.equal(first.nextReviewAt, minute);
  assert.equal(first.plan, "short-term");
  const second = scheduleReview({ ...previous, ...first, lastReviewedAt: 0 }, "familiar", minute, false, [1]);
  const third = scheduleReview({ ...previous, ...second, lastReviewedAt: minute }, "familiar", 2 * minute, false, [1]);
  assert.equal(third.modeIndex, 1);
  assert.equal(third.nextReviewAt, 2 * minute + 3 * day);
  assert.equal(third.plan, "long-term");
});

test("分类记忆按阅读、听力、口语、写作循环", () => {
  assert.deepEqual([1, 0, 2, 3].map(nextClassifiedModeIndex), [0, 2, 3, 1]);
});
