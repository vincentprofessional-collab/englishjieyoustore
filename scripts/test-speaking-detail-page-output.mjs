import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const namesPage = new URL(
  "../.next/server/app/speaking/part-1/speaking-part-1-007.html",
  import.meta.url,
);
const part1ArchivePage = new URL("../.next/server/app/speaking/part-1.html", import.meta.url);

test("speaking detail pages include the real question and common follow-ups below the title", () => {
  assert.ok(existsSync(namesPage), "Run `npm run build` before this test.");

  const output = readFileSync(namesPage, "utf8");
  assert.match(output, /常见追问/);
  assert.match(output, /Does your name have any meaning\? Do you like your name\?/);
});

test("speaking detail pages reserve side-by-side Band 7, Band 8, and Band 9 answer columns", () => {
  assert.ok(existsSync(namesPage), "Run `npm run build` before this test.");

  const output = readFileSync(namesPage, "utf8");
  assert.match(output, /7 分范文/);
  assert.match(output, /8 分范文/);
  assert.match(output, /9 分范文/);
  assert.match(output, /预留/);
});

test("speaking archive lists a Band 8 answer link beside the Band 7 answer link when available", () => {
  assert.ok(existsSync(part1ArchivePage), "Run `npm run build` before this test.");

  const output = readFileSync(part1ArchivePage, "utf8");
  assert.match(output, /查看 7 分范文/);
  assert.match(output, /查看 8 分范文/);
  assert.match(output, /\/speaking\/part-1\/speaking-part-1-001#band-8/);
});
