import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("video switching calls play during the click and reuses the existing media element", () => {
  const source = ts.createSourceFile("player.tsx", fs.readFileSync(new URL("../src/components/vocabulary-video-player.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === "activateVideo") fn = node.getText(source); ts.forEachChild(node, visit); }
  visit(source);
  const calls = [], video = { src: "first.mp4", pause() { calls.push("pause"); }, load() { calls.push("load"); }, play() { calls.push(`play:${this.src}`); return Promise.resolve(); } };
  const context = vm.createContext({
    activePathRef: {}, previewMode: false, videoRef: { current: video },
    flushSync: callback => { callback(); video.src = "next.mp4"; },
    setVideos() {}, setActiveIndex() {}, setIsPlaying() {}, setCurrentTime() {}, setDuration() {}, setNotice() {},
  });
  vm.runInContext(ts.transpileModule(fn, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  context.activateVideo("next", [{ path: "first", src: "first.mp4" }, { path: "next", src: "next.mp4" }], true);
  assert.deepEqual(calls, ["pause", "load", "play:next.mp4"]);
  assert.equal(context.videoRef.current, video);
});

test("Safari video probes keep byte ranges and HEAD metadata without downloading a body", async () => {
  const exports = {}, requests = [];
  const source = ts.transpileModule(fs.readFileSync(new URL("../src/app/api/vocabulary-video-media/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, Headers, fetch: async (_url, options) => {
    requests.push(options);
    return new Response(options.method === "HEAD" ? null : new Uint8Array([0, 1]), { status: options.headers?.Range ? 206 : 200, headers: { "Content-Type": "video/mp4", "Content-Length": "2", ...(options.headers?.Range ? { "Content-Range": "bytes 0-1/2000" } : {}) } });
  }, require: name => ({
    "next/server": { NextResponse: Response },
    "@/lib/media/url": { getSupabaseStorageUrl: () => "https://fixture.invalid/video.mp4" },
    "@/lib/vocabulary/videos": { isPlayableVocabularyVideoFilename: name => name === "test.mp4" },
  })[name] });
  const request = (method, range) => ({ method, nextUrl: new URL("https://site.invalid/api/vocabulary-video-media?name=test.mp4"), headers: new Headers(range ? { Range: range } : {}) });
  const response = await exports.GET(request("GET", "bytes=0-1"));
  assert.equal(response.status, 206); assert.equal(response.headers.get("content-range"), "bytes 0-1/2000");
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [0, 1]);
  const head = await exports.HEAD(request("HEAD"));
  assert.equal(head.status, 200); assert.equal(await head.text(), "");
  assert.equal(requests[1].method, "HEAD"); assert.equal(head.headers.get("accept-ranges"), "bytes");
});
