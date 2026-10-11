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

function loadPasteParser() {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../src/lib/articles/bbc-article-upload.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { exports });
  return exports.parseBbcArticlePaste;
}

test("BBC pasted numbered vocabulary without a section heading stays out of bilingual body paragraphs", () => {
  const parse = loadPasteParser();
  const result = parse(`260803-Gen Z's love of the past 热衷怀旧的“Z世代”
Today's youth are reinventing what it means to be cool.
当今的年轻人正在重新定义“酷”的含义。

1. **reinvent** /ˌriːɪnˈvent/ v. 重新定义，彻底改造
例句：The company reinvented itself as a technology firm.
翻译：该公司将自己重新打造成一家科技公司。

2. romanticise /rəʊˈmæntɪsaɪz/ v. 浪漫化，理想化
例句：We tend to romanticise the past.
翻译：我们倾向于把过去浪漫化。`);
  assert.equal(typeof result, "object");
  assert.equal(result.title, "Gen Z's love of the past");
  assert.equal(result.titleChinese, "热衷怀旧的“Z世代”");
  assert.equal(result.english.split("\n\n").length, 1);
  assert.equal(result.chinese.split("\n\n").length, 1);
  assert.equal(result.vocabulary.length, 2);
  assert.equal(result.vocabulary[0].term, "reinvent");
  assert.equal(result.vocabulary[0].example, "The company reinvented itself as a technology firm.");
  assert.equal(result.vocabulary[1].translation, "我们倾向于把过去浪漫化。");
});

test("BBC five bilingual paragraphs and 29 phonetic vocabulary entries remain five aligned body pairs", () => {
  const body = Array.from({ length: 5 }, (_, i) => `English paragraph ${i + 1}.\n中文段落${i + 1}。`).join("\n\n");
  const vocabulary = Array.from({ length: 29 }, (_, i) => `${i + 1}. term${i + 1}/tɜːm/ n. 词条${i + 1}\n例句：An example sentence.\n翻译：例句翻译。`).join("\n\n");
  const result = loadPasteParser()(`260803-Example title 示例标题\n${body}\n\n${vocabulary}`);
  assert.equal(typeof result, "object");
  assert.equal(result.english.split("\n\n").length, 5);
  assert.equal(result.chinese.split("\n\n").length, 5);
  assert.equal(result.vocabulary.length, 29);
});

test("BBC explicit headings and vocabulary without IPA work; numbered prose remains prose", () => {
  const parse = loadPasteParser();
  const result = parse("260803-Test article 测试文章\n1. A numbered English paragraph.\n一个编号段落。\n\n**词汇与短语**\n1. mixed reactions n. 褒贬不一的反应\n例句：Mixed reactions followed.\n翻译：随后出现褒贬不一的反应。");
  assert.equal(typeof result, "object");
  assert.equal(result.english, "1. A numbered English paragraph.");
  assert.equal(result.vocabulary[0].term, "mixed reactions");
  assert.equal(result.vocabulary[0].partOfSpeech, "n.");
  assert.match(parse("260803-Test 测试\nOnly English prose."), /中文翻译/);
});

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
