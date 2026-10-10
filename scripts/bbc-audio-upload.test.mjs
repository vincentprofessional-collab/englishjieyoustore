import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function loadFunctions(path, names, globals, prefix = "") {
  const source = ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const functions = source.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
  assert.equal(functions.length, names.length);
  const code = ts.transpileModule(prefix + functions.map((node) => node.getText(source)).join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return runInNewContext(`${code}\n${names.at(-1)};`, globals);
}

test("PUT presigns require the upload credential pair and never use playback credentials", () => {
  const env = {
    R2_ACCOUNT_ID: "test-account",
    R2_BBC_AUDIO_ACCESS_KEY_ID: "playback-read-only",
    R2_BBC_AUDIO_SECRET_ACCESS_KEY: "playback-secret",
  };
  const sign = loadFunctions("../src/app/api/admin/bbc-articles/route.ts", ["hash", "hmac", "encode", "getPresignedPutUrl"], {
    createHash, createHmac, process: { env },
  }, 'const bucket = "test-bucket";\n');
  assert.equal(sign("bbc/2026/260803/full.mp3"), null);
  env.R2_BBC_AUDIO_UPLOAD_ACCESS_KEY_ID = "upload-read-write";
  assert.equal(sign("bbc/2026/260803/full.mp3"), null);
  env.R2_BBC_AUDIO_UPLOAD_SECRET_ACCESS_KEY = "upload-secret";
  const url = new URL(sign("bbc/2026/260803/full.mp3"));
  assert.ok(url.searchParams.get("X-Amz-Credential").startsWith("upload-read-write/"));
  assert.equal(url.searchParams.get("X-Amz-SignedHeaders"), "content-type;host");
});

test("uploaded bytes stay below 100% until R2 confirms success; rejection stays incomplete", async () => {
  for (const outcome of [200, 403, "network-error"]) {
    const progress = [];
    let sentFile;
    class Request {
      upload = {};
      status = outcome;
      open(method, url) { assert.equal(method, "PUT"); assert.equal(url, "https://upload.example.test"); }
      setRequestHeader(name, value) { assert.equal(name, "Content-Type"); assert.equal(value, "audio/mpeg"); }
      send(file) {
        sentFile = file;
        this.upload.onprogress({ lengthComputable: true, loaded: 1024, total: 1024 });
        if (outcome === "network-error") this.onerror();
        else this.onload();
      }
    }
    const upload = loadFunctions("../src/components/admin-bbc-article-upload.tsx", ["uploadToR2"], {
      XMLHttpRequest: Request,
    });
    const file = { size: 1024 };
    const result = upload({ uploadUrl: "https://upload.example.test", headers: { "Content-Type": "audio/mpeg" } }, file, (value) => progress.push(value));
    if (outcome === 200) {
      await result;
      assert.deepEqual(progress, [99, 100]);
    } else {
      await assert.rejects(result, outcome === 403 ? /HTTP 403/ : /音频上传未完成/);
      assert.deepEqual(progress, [99]);
    }
    assert.equal(sentFile, file);
  }
});
