import assert from "node:assert/strict";
import test from "node:test";
import { getStaticMediaAddress, isLegacyCosOnlyMediaPath, toSupabaseSafeStoragePath } from "../src/lib/media/url.ts";

test("oversized CET4 audio stays on its existing Tencent COS route", () => {
  const address = getStaticMediaAddress("/cet4/audio/cet4-paper-2023121.mp3");
  assert.deepEqual(address, { bucket: "audio", path: "static/cet4/audio/cet4-paper-2023121.mp3" });
  assert.equal(isLegacyCosOnlyMediaPath(address.bucket, address.path), true);
});

test("other audio assets continue to use the Supabase media route", () => {
  const address = getStaticMediaAddress("/cet4/audio/cet4-paper-2023122.mp3");
  assert.ok(address);
  assert.equal(isLegacyCosOnlyMediaPath(address.bucket, address.path), false);
});

test("Supabase aliases non-ASCII and percent-encoded object paths consistently", () => {
  assert.equal(toSupabaseSafeStoragePath("videos/vocabulary/50% años.mp4"), "u-dmlkZW9zL3ZvY2FidWxhcnkvNTAlIGHDsW9zLm1wNA");
  assert.equal(toSupabaseSafeStoragePath("audio/cambridge/test-1.mp3"), "audio/cambridge/test-1.mp3");
});
