import assert from "node:assert/strict";
import test from "node:test";
import { nextClassifiedModeIndex, scheduleReview, selectEnabledMode } from "../src/lib/vocabulary/review-scheduler.ts";

const minute = 60_000;
const day = 24 * 60 * minute;

function advance(previous, outcome, now, hadInputError = false) {
  const next = scheduleReview(previous, outcome, now, hadInputError);
  return { ...previous, ...next, lastOutcome: outcome, lastReviewedAt: now };
}

test("熟悉一次切换模式；模糊或生僻后当前模式连续熟悉三次才恢复", () => {
  let previous = { lastReviewedAt: null, modeIndex: 1, plan: "short-term" };
  previous = advance(previous, "familiar", 0);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.nextReviewAt, minute);

  previous = advance(previous, "vague", minute);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.recoveryRequired, true);

  previous = advance(previous, "familiar", 2 * minute);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.recoveryFamiliarStreak, 1);
  previous = advance(previous, "familiar", 3 * minute);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.recoveryFamiliarStreak, 2);

  previous = advance(previous, "unfamiliar", 4 * minute);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.recoveryFamiliarStreak, 0);
  previous = advance(previous, "familiar", 5 * minute);
  previous = advance(previous, "familiar", 6 * minute);
  previous = advance(previous, "familiar", 7 * minute);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.recoveryRequired, false);
});

test("拼写错误也会留在写作模式，之后连续三次熟悉才切换", () => {
  let previous = { lastReviewedAt: null, modeIndex: 3, plan: "short-term" };
  previous = advance(previous, "familiar", 0, true);
  assert.equal(previous.modeIndex, 3);
  assert.equal(previous.recoveryRequired, true);

  previous = advance(previous, "familiar", minute);
  previous = advance(previous, "familiar", 2 * minute);
  assert.equal(previous.modeIndex, 3);
  previous = advance(previous, "familiar", 3 * minute);
  assert.equal(previous.modeIndex, 1);
});

test("旧进度的熟悉次数不会阻止答熟悉后立即切换", () => {
  const next = scheduleReview({
    consecutiveFamiliar: 2,
    lastReviewedAt: 0,
    modeIndex: 0,
    plan: "short-term",
  }, "familiar", minute);
  assert.equal(next.modeIndex, 2);
  assert.equal(next.nextReviewAt, 2 * minute);
});

test("口语模式选择熟悉后直接进入已启用的写作模式，即使之前有错题记录", () => {
  const next = scheduleReview({
    lastOutcome: "unfamiliar",
    lastReviewedAt: 0,
    modeIndex: 2,
    plan: "short-term",
    recoveryFamiliarStreak: 2,
    recoveryRequired: true,
  }, "familiar", minute, false, [1, 0, 2, 3], 3);

  assert.equal(next.modeIndex, 3);
  assert.equal(next.recoveryRequired, false);
  assert.equal(next.recoveryFamiliarStreak, 0);
});

test("口语模式选择模糊或生僻后仍留在口语模式", () => {
  for (const outcome of ["vague", "unfamiliar"]) {
    const next = scheduleReview({ lastOutcome: "familiar", lastReviewedAt: 0, modeIndex: 2, plan: "short-term" }, outcome, minute);
    assert.equal(next.modeIndex, 2);
  }
});

test("阅读、听力、口语、写作各答熟悉一次后进入三天后的长期复习", () => {
  let previous = { lastReviewedAt: null, modeIndex: 1, plan: "short-term" };
  let now = 0;
  for (const mode of [1, 0, 2, 3]) {
    assert.equal(previous.modeIndex, mode);
    previous = advance(previous, "familiar", now);
    now += minute;
  }
  assert.equal(previous.plan, "long-term");
  assert.equal(previous.reviewStep, 1);
  assert.equal(previous.modeIndex, 1);
  assert.equal(previous.nextReviewAt, now - minute + 3 * day);
});

test("长期复习仍按三、七、十四、三十天推进；出错后同模式连续熟悉三次", () => {
  let previous = { lastReviewedAt: 0, modeIndex: 1, plan: "long-term", reviewStep: 1 };
  previous = advance(previous, "familiar", 3 * day);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.reviewStep, 2);
  assert.equal(previous.nextReviewAt, 10 * day);

  previous = advance(previous, "vague", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 0);
  previous = advance(previous, "familiar", previous.nextReviewAt);
  previous = advance(previous, "familiar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 0);
  previous = advance(previous, "familiar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.reviewStep, 3);
  assert.equal(previous.nextReviewAt, 24 * day + 6 * minute);
});

test("关闭的考察方式会跳过，单一方式答熟悉后进入长期复习", () => {
  assert.equal(selectEnabledMode(2, [0, 1, 3]), 3);
  const first = scheduleReview({ lastReviewedAt: null, modeIndex: 1, plan: "short-term" }, "familiar", 0, false, [1]);
  assert.equal(first.modeIndex, 1);
  assert.equal(first.nextReviewAt, 3 * day);
  assert.equal(first.plan, "long-term");
});

test("分类记忆按阅读、听力、口语、写作循环", () => {
  assert.deepEqual([1, 0, 2, 3].map(nextClassifiedModeIndex), [0, 2, 3, 1]);
});
