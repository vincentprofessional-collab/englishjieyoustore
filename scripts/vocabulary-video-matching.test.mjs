import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getStaticMediaAddress } from "../src/lib/media/url.ts";

test("word details do not import or request the retired video catalog or player", () => {
  for (const path of ["vocabulary-lookup-entry.tsx", "vocabulary-detail-content.tsx"]) {
    const source = readFileSync(new URL(`../src/components/${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /getVocabularyVideos|VocabularyVideoPlayer|@\/lib\/vocabulary\/videos|vocabulary-video-media/);
  }
});

test("retired video extensions do not create managed-media requests; vocabulary audio remains supported", () => {
  for (const path of ["/videos/vocabulary/baby.mp4", "/vocabulary/example.webm"]) assert.equal(getStaticMediaAddress(path), null);
  assert.equal(getStaticMediaAddress("/audio/new-concept/book1-us/lesson1.mp3")?.bucket, "audio");
});
