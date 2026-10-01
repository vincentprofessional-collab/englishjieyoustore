import assert from "node:assert/strict";
import test from "node:test";
import { getAdjectiveBaseFormCandidates } from "../src/lib/vocabulary/adjective-base-forms.ts";

test("比较级和最高级词形回退到 -y 原级", () => {
  assert.deepEqual(getAdjectiveBaseFormCandidates("healthier"), ["healthy"]);
  assert.deepEqual(getAdjectiveBaseFormCandidates("healthiest"), ["healthy"]);
  assert.deepEqual(getAdjectiveBaseFormCandidates("happier"), ["happy"]);
  assert.deepEqual(getAdjectiveBaseFormCandidates("tier"), []);
});
