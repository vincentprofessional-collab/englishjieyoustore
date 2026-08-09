import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const namesPage = new URL(
  "../.next/server/app/speaking/part-1/speaking-part-1-007.html",
  import.meta.url,
);
const part1ArchivePage = new URL("../.next/server/app/speaking/part-1.html", import.meta.url);
const band8Page = new URL(
  "../.next/server/app/speaking/part-1/speaking-part-1-001/band-8.html",
  import.meta.url,
);

test("speaking detail pages include the real question and common follow-ups below the title", () => {
  assert.ok(existsSync(namesPage), "Run `npm run build` before this test.");

  const output = readFileSync(namesPage, "utf8");
  assert.match(output, /常见追问/);
  assert.match(output, /Does your name have any meaning\? Do you like your name\?/);
});

test("speaking detail pages keep Band 7 content separate from Band 8 and Band 9 pages", () => {
  assert.ok(existsSync(namesPage), "Run `npm run build` before this test.");

  const output = readFileSync(namesPage, "utf8");
  assert.match(output, /7 分范文/);
  assert.doesNotMatch(output, /8 分范文/);
  assert.doesNotMatch(output, /9 分范文/);
  assert.doesNotMatch(output, /id="band-8"/);
});

test("speaking archive links Band 8 answers to an independent detail page", () => {
  assert.ok(existsSync(part1ArchivePage), "Run `npm run build` before this test.");

  const output = readFileSync(part1ArchivePage, "utf8");
  assert.match(output, /查看 7 分范文/);
  assert.match(output, /查看 8 分范文/);
  assert.match(output, /\/speaking\/part-1\/speaking-part-1-001\/band-8/);
  assert.doesNotMatch(output, /\/speaking\/part-1\/speaking-part-1-001#band-8/);
});

test("Band 8 answer pages render independently from Band 7 detail pages", () => {
  assert.ok(existsSync(band8Page), "Run `npm run build` before this test.");

  const output = readFileSync(band8Page, "utf8");
  assert.match(output, /8 分范文/);
  assert.match(output, /everyday logistics/);
  assert.match(output, /中文翻译/);
  assert.doesNotMatch(output, /7 分范文/);
  assert.doesNotMatch(output, /9 分范文/);
});
