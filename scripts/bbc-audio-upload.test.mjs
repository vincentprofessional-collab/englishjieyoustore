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

function loadPastedSyntaxModule() {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../src/lib/articles/bbc-pasted-syntax.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { exports });
  return exports;
}

function loadAudioAlignment() {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../src/lib/articles/bbc-audio-alignment.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { exports });
  return exports.alignBbcAudioSentences;
}

function loadPasteParser() {
  const exports = {};
  const syntax = loadPastedSyntaxModule();
  const code = ts.transpileModule(readFileSync(new URL("../src/lib/articles/bbc-article-upload.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { exports, require: (specifier) => {
    if (specifier === "@/lib/articles/bbc-pasted-syntax") return syntax;
    throw new Error(`Unexpected test dependency: ${specifier}`);
  } });
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

test("BBC upload removes appended sentence syntax notes and maps authored POS/components back to the source sentence", () => {
  const input = `260803-Gen Z's love of the past 热衷怀旧的“Z世代”
Today's youth are reinventing what it means to be cool.
当今的年轻人正在重新定义“酷”的含义。

# 全文逐句词性+句子成分标注
## 句1
Today’s youth are reinventing what it means to be cool
Today's：形容词性物主代词（定语）
youth：名词（主语）
are：助动词（谓语一部分）
reinventing：现在分词（谓语一部分）
what：连接代词（宾语从句）
>主干：youth【主】 are reinventing【谓】 what it means to be cool【宾语从句】

词汇表
1. cool adj. 酷的
例句：That looks cool.`;
  const result = loadPasteParser()(input);
  assert.equal(typeof result, "object");
  assert.equal(result.english, "Today's youth are reinventing what it means to be cool.");
  assert.equal(result.vocabulary.length, 1);
  assert.equal(result.syntaxAnnotations.length, 1);
  assert.equal(result.syntaxAnnotations[0].items[0].term, "Today's");

  const sentence = result.syntaxAnnotations[0].text;
  const tokens = [...sentence.matchAll(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*|[^\s]/g)].map((match) => ({
    text: match[0], pos: /^[A-Za-z0-9]/.test(match[0]) ? "X" : "PUNCT", start: match.index, end: match.index + match[0].length,
  }));
  assert.equal(result.syntaxAnnotations[0].sentenceNo, 1);
  const applied = loadPastedSyntaxModule().applyPastedBbcSyntax({
    text: sentence, tokens, level1: [], level2: [], level3: [], level4: [], level5: [], status: "draft",
  }, result.syntaxAnnotations, 1);
  assert.equal(applied.status, "reviewed");
  assert.equal(applied.tokens[0].pos, "DET");
  assert.equal(applied.tokens[0].posLabel, "形容词性物主代词");
  assert.equal(applied.level1.length, 3);
  assert.deepEqual(Array.from(applied.level2, (span) => span.label), ["定语", "主语", "谓语", "宾语从句"]);
});

test("authored BBC grammar remains authoritative instead of falling back to automatic spans", () => {
  const apply = loadPastedSyntaxModule().applyPastedBbcSyntax;
  const text = "We learn English.";
  const tokens = [...text.matchAll(/[A-Za-z]+|[^\s]/g)].map((match) => ({
    text: match[0], pos: /^[A-Za-z]/.test(match[0]) ? "X" : "PUNCT", start: match.index, end: match.index + match[0].length,
  }));
  const automatic = {
    text, tokens, level1: [{ label: "自动主语", start: 0, end: 1 }],
    level2: [{ label: "自动谓语", start: 1, end: 2 }], level3: [], level4: [], level5: [], status: "draft",
  };
  const authored = apply(automatic, [{
    sentenceNo: 1, text, main: "", items: [
      { term: "We", description: "代词" },
      { term: "learn", description: "动词（谓语）" },
    ],
  }], 1);
  assert.equal(authored.status, "reviewed");
  assert.equal(authored.level1.length, 0);
  assert.deepEqual(Array.from(authored.level2, ({ label }) => label), ["谓语"]);
  assert.equal(authored.tokens[1].pos, "VERB");
  assert.throws(() => apply(automatic, [{
    sentenceNo: 1, text, main: "We【主语】 learn【谓语】 English【宾语】", items: [
      { term: "not-in-source", description: "名词（主语）" },
    ],
  }], 1), /无法匹配原句/);
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

test("editing unchanged BBC text reuses its saved audio timing without downloading MP3", () => {
  const reuse = loadFunctions("../src/app/api/admin/bbc-articles/route.ts", ["reuseExistingBbcAudioTimings"], {});
  const article = {
    id: "260803", year: 2026,
    sentences: [{ sentenceNo: 1, english: "Today's youth are here.", chinese: "年轻人来了。", startMs: 0, endMs: 1800 }],
  };
  const existing = {
    id: "260803", year: 2026, fullAudioUrl: "/api/bbc-audio/2026/260803/full.mp3", audioDurationMs: 5000,
    sentences: [{ sentenceNo: 1, english: "Today's youth are here.", chinese: "年轻人来了。", startMs: 400, endMs: 2200 }],
  };
  const reused = reuse(article, existing, "bbc/2026/260803/full.mp3");

  assert.equal(reused.durationMs, 5000);
  assert.deepEqual(Array.from(reused.timings, ({ sentenceNo, startMs, endMs }) => ({ sentenceNo, startMs, endMs })), [
    { sentenceNo: 1, startMs: 400, endMs: 2200 },
  ]);
  assert.equal(reuse({ ...article, sentences: [{ ...article.sentences[0], english: "Today's young people are here." }] }, existing, "bbc/2026/260803/full.mp3"), null);
  assert.equal(reuse(article, existing, "bbc/2026/260803/full-0123456789abcdef.mp3"), null);
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

test("uploaded BBC sentences reuse full audio when a valid timing range has no clip URL", () => {
  const normalize = loadFunctions("../src/lib/articles/bbc-uploaded-content.ts", ["normalizeRecord"], {});
  const fullAudioUrl = "/api/bbc-audio/2026/260803/full.mp3";
  const article = {
    id: "260803",
    year: 2026,
    date: "2026-08-03",
    title: "Example",
    body: ["A paragraph."],
    chineseParagraphs: ["中文段落。"],
    fullAudioUrl,
    sentences: [
      { sentenceNo: 1, english: "A sentence.", chinese: "一句话。", startMs: 100, endMs: 900 },
      { sentenceNo: 2, english: "Another sentence.", chinese: "另一句话。", startMs: 900, endMs: 1800, audioUrl: "/sentence.mp3" },
      { sentenceNo: 3, english: "No timing.", chinese: "没有时间轴。", startMs: 1800, endMs: 1800 },
    ],
    vocabulary: [],
  };
  const record = normalize(article, "2026-08-03T00:00:00Z");

  assert.equal(record.article.sentences[0].audioUrl, fullAudioUrl);
  assert.equal(record.article.sentences[1].audioUrl, "/sentence.mp3");
  assert.equal(record.article.sentences[2].audioUrl, undefined);

  const legacyRecord = normalize({ ...article, fullAudioUrl: undefined, audioUrl: fullAudioUrl }, "");
  assert.equal(legacyRecord.article.fullAudioUrl, fullAudioUrl);
  assert.equal(legacyRecord.article.sentences[0].audioUrl, fullAudioUrl);
});

test("BBC audio alignment estimates an unrecognized opening sentence when the rest of the article matches", () => {
  const align = loadAudioAlignment();
  const sentences = [
    { sentenceNo: 1, english: "The opening sentence is missing from recognition." },
    { sentenceNo: 2, english: "This second sentence contains enough matching words." },
    { sentenceNo: 3, english: "This final sentence also contains enough matching words." },
  ];
  const recognized = sentences.slice(1).flatMap((sentence, sentenceIndex) => {
    const start = sentenceIndex === 0 ? 2.4 : 4.2;
    return sentence.english.match(/[A-Za-z]+/g).map((word, wordIndex) => ({
      text: word,
      timestamp: [start + wordIndex * 0.25, start + wordIndex * 0.25 + 0.2],
    }));
  });
  const result = align(sentences, recognized, 8);
  assert.deepEqual(Array.from(result.reviewSentenceNos), [1]);
  assert.equal(result.timings.length, sentences.length);
  assert.equal(result.timings[0].sentenceNo, 1);
  assert.ok(result.timings[0].endMs > result.timings[0].startMs);
  assert.ok(result.timings[0].endMs <= result.timings[1].startMs);
  assert.ok(result.timings.at(-1).endMs <= 8000);
});

test("BBC audio alignment extends a sentence when recognition drops its final words", () => {
  const align = loadAudioAlignment();
  const sentences = [
    { sentenceNo: 1, english: "She promised to return the completed report tomorrow." },
    { sentenceNo: 2, english: "They will publish the final results next week." },
  ];
  const recognized = [
    ...["She", "promised", "to", "return", "the"].map((text, index) => ({
      text,
      timestamp: [0.25 + index * 0.3, 0.43 + index * 0.3],
    })),
    ...["They", "will", "publish", "the", "final", "results", "next", "week"].map((text, index) => ({
      text,
      timestamp: [3 + index * 0.28, 3.2 + index * 0.28],
    })),
  ];
  const result = align(sentences, recognized, 6);
  assert.ok(result.timings[0].endMs > 2_500, `sentence 1 ended at ${result.timings[0].endMs}ms`);
  assert.ok(result.timings[0].endMs <= result.timings[1].startMs);
  assert.ok(Array.from(result.reviewSentenceNos).includes(1));
});

test("BBC audio alignment retains the final recognized word when its end timestamp is missing", () => {
  const align = loadAudioAlignment();
  const result = align(
    [{ sentenceNo: 1, english: "The final sentence ends here." }],
    [
      { text: "The", timestamp: [0.2, 0.4] },
      { text: "final", timestamp: [0.45, 0.7] },
      { text: "sentence", timestamp: [0.75, 1.1] },
      { text: "ends", timestamp: [1.15, 1.4] },
      { text: "here", timestamp: [1.45, null] },
    ],
    2,
  );
  assert.equal(result.timings[0].endMs, 2000);
  assert.deepEqual(Array.from(result.reviewSentenceNos), []);
});

test("BBC audio alignment keeps the final clip through the audio tail when recognition misses its last word", () => {
  const align = loadAudioAlignment();
  const result = align(
    [{ sentenceNo: 1, english: "The final sentence ends near the close." }],
    ["The", "final", "sentence", "ends", "near", "the"].map((text, index) => ({
      text,
      timestamp: [0.2 + index * 0.35, 0.4 + index * 0.35],
    })),
    5,
  );
  assert.equal(result.timings[0].endMs, 5_000);
  assert.deepEqual(Array.from(result.reviewSentenceNos), [1]);
});
