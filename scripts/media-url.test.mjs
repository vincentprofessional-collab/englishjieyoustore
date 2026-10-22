import assert from "node:assert/strict";
import test from "node:test";
import { getStaticMediaAddress, isLegacyCosOnlyMediaPath, isPublishedExamStaticAsset, toSupabaseSafeStoragePath } from "../src/lib/media/url.ts";

test("legacy oversized CET4 audio retains its existing Tencent COS fallback mapping", () => {
  const address = getStaticMediaAddress("/cet4/audio/cet4-paper-2023121.mp3");
  assert.deepEqual(address, { bucket: "audio", path: "static/cet4/audio/cet4-paper-2023121.mp3" });
  assert.equal(isLegacyCosOnlyMediaPath(address.bucket, address.path), true);
});

test("other audio assets continue to use the Supabase media route", () => {
  const address = getStaticMediaAddress("/audio/new-concept/book1-us/lesson1.mp3");
  assert.ok(address);
  assert.equal(isLegacyCosOnlyMediaPath(address.bucket, address.path), false);
});

test("reviewed exam media ships with its exact release instead of rewriting to a missing object", () => {
  for (const path of ["/reading/source-pages/ci1-p026.webp", "/reading/explanations/cambridge-1-test-1-part1-exp-p001.webp", "/cet4/evidence/167c35f2e91e9431a198c9d3.webp", "/cet4/audio/cet4-paper-2020091.mp3"]) assert.equal(isPublishedExamStaticAsset(path), true, path);
  for (const path of ["/audio/bbc/260817.mp3", "/subtitles/bbc/260817.vtt", "/audio/new-concept/lesson1.mp3", "/cet4/original.pdf", "/reading/source-pages/private.png", "/cet4/audio/../private.mp3", "/cet4/audio/%2fprivate.mp3"]) assert.equal(isPublishedExamStaticAsset(path), false, path);
});

test("Supabase aliases non-ASCII and percent-encoded object paths consistently", () => {
  assert.equal(toSupabaseSafeStoragePath("videos/vocabulary/50% años.mp4"), "u-dmlkZW9zL3ZvY2FidWxhcnkvNTAlIGHDsW9zLm1wNA");
  assert.equal(toSupabaseSafeStoragePath("audio/cambridge/test-1.mp3"), "audio/cambridge/test-1.mp3");
});
