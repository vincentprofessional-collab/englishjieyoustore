import assert from "node:assert/strict";
import test from "node:test";
import { nextClassifiedModeIndex, scheduleReview, selectEnabledMode } from "../src/lib/vocabulary/review-scheduler.ts";

const minute = 60_000;
const day = 24 * 60 * minute;

function advance(previous, outcome, now, hadInputError = false) {
  const next = scheduleReview(previous, outcome, now, hadInputError);
  return { ...previous, ...next, lastOutcome: outcome, lastReviewedAt: now };
}

test("熟悉后跨天换模式；模糊五分钟、生僻两分钟后仍考当前模式", () => {
  let previous = { lastReviewedAt: null, modeIndex: 1, plan: "short-term" };
  previous = advance(previous, "familiar", 0);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.reviewStep, 1);
  assert.equal(previous.nextReviewAt, day);

  previous = advance(previous, "vague", day);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.recoveryRequired, true);
  assert.equal(previous.reviewStep, 1);
  assert.equal(previous.nextReviewAt, day + 5 * minute);

  previous = advance(previous, "familiar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.reviewStep, 2);
  assert.equal(previous.nextReviewAt, day + 5 * minute + 3 * day);

  previous = advance(previous, "unfamiliar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.nextReviewAt, previous.lastReviewedAt + 2 * minute);
  previous = advance(previous, "familiar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 3);
  assert.equal(previous.reviewStep, 3);
  assert.equal(previous.recoveryRequired, false);
});

test("拼写有误时留在写作模式五分钟；熟悉后按一天间隔切换", () => {
  let previous = { lastReviewedAt: null, modeIndex: 3, plan: "short-term" };
  previous = advance(previous, "familiar", 0, true);
  assert.equal(previous.modeIndex, 3);
  assert.equal(previous.recoveryRequired, true);
  assert.equal(previous.nextReviewAt, 5 * minute);

  previous = advance(previous, "familiar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 1);
  assert.equal(previous.nextReviewAt, 5 * minute + day);
});

test("旧进度的熟悉次数不会阻止答熟悉后立即切换", () => {
  const next = scheduleReview({
    consecutiveFamiliar: 2,
    lastReviewedAt: 0,
    modeIndex: 0,
    plan: "short-term",
  }, "familiar", minute);
  assert.equal(next.modeIndex, 2);
  assert.equal(next.nextReviewAt, minute + day);
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

test("熟悉后按阅读、听力、口语、写作轮换，并按1、3、7、15、30天递进", () => {
  let previous = { lastReviewedAt: null, modeIndex: 1, plan: "short-term" };
  let now = 0;
  const intervals = [1, 3, 7, 15, 30];
  for (const [index, mode] of [1, 0, 2, 3, 1].entries()) {
    assert.equal(previous.modeIndex, mode);
    previous = advance(previous, "familiar", now);
    assert.equal(previous.nextReviewAt, now + intervals[index] * day);
    now = previous.nextReviewAt;
  }
  assert.equal(previous.plan, "long-term");
  assert.equal(previous.reviewStep, 5);
  assert.equal(previous.modeIndex, 0);
});

test("长期复习出错后短间隔仍考当前模式；熟悉时继续推进并封顶三十天", () => {
  let previous = { lastReviewedAt: 0, modeIndex: 1, plan: "long-term", reviewStep: 1 };
  previous = advance(previous, "familiar", day);
  assert.equal(previous.modeIndex, 0);
  assert.equal(previous.reviewStep, 2);
  assert.equal(previous.nextReviewAt, 4 * day);

  previous = advance(previous, "vague", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 0);
  previous = advance(previous, "familiar", previous.nextReviewAt);
  assert.equal(previous.modeIndex, 2);
  assert.equal(previous.reviewStep, 3);
  assert.equal(previous.nextReviewAt, 11 * day + 5 * minute);

  const capped = scheduleReview({ ...previous, reviewStep: 5 }, "familiar", previous.nextReviewAt);
  assert.equal(capped.reviewStep, 5);
  assert.equal(capped.nextReviewAt, 41 * day + 5 * minute);
});

test("关闭的考察方式会跳过，单一方式答熟悉后进入长期复习", () => {
  assert.equal(selectEnabledMode(2, [0, 1, 3]), 3);
  const first = scheduleReview({ lastReviewedAt: null, modeIndex: 1, plan: "short-term" }, "familiar", 0, false, [1]);
  assert.equal(first.modeIndex, 1);
  assert.equal(first.nextReviewAt, day);
  assert.equal(first.plan, "long-term");
});

test("分类记忆按阅读、听力、口语、写作循环", () => {
  assert.deepEqual([1, 0, 2, 3].map(nextClassifiedModeIndex), [0, 2, 3, 1]);
});
