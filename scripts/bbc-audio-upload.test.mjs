import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { createBbcSubtitleSentenceMatcher } from "../src/lib/articles/bbc-subtitle-alignment.ts";
import { getBbcArticleContentOverride } from "../src/lib/articles/bbc-content-overrides.ts";
import { mergeBbcVocabularyItems, normalizeBbcVocabularyTerm } from "../src/lib/articles/bbc-vocabulary-merge.ts";

function loadFunctions(path, names, globals, prefix = "") {
  const source = ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const functions = source.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
  assert.equal(functions.length, names.length);
  const code = ts.transpileModule(prefix + functions.map((node) => node.getText(source).replace(/^export\s+/, "")).join("\n"), {
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

test("inline vocabulary edits persist, preserve page metadata and reject stale edits", async () => {
  let row = null;
  const table = {
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }),
    insert: (value) => ({
      select: () => ({ maybeSingle: async () => {
        row = value;
        return { data: { slug: row.slug } };
      } }),
    }),
    update: (value) => {
      const query = {
        eq: () => query,
        is: () => query,
        select: () => ({ maybeSingle: async () => {
          row = { ...row, ...value };
          return { data: { slug: row.slug } };
        } }),
      };
      return query;
    },
  };
  const edit = loadFunctions("../src/app/api/admin/bbc-articles/route.ts", ["editPublishedVocabulary"], {
    getBbcArticleById: () => ({ title: "Test", vocabulary: [] }),
    getBbcEffectiveVocabularyById: () => [],
    getBbcArticleContentOverride,
    mergeBbcVocabularyItems,
    normalizeBbcVocabularyTerm,
    readText: (value) => ({ value }),
    revalidatePath: () => {},
    NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) },
  });
  const save = (fields) => edit({ from: () => table }, { articleId: "260831", ...fields });
  const added = await save({
    operation: "save", index: -1, term: "ride", definition: "乘坐", selectedText: "rides",
  });
  assert.equal(added.status, 200);
  assert.equal(row.status, "published");
  const initial = getBbcArticleContentOverride(row.meta_json).vocabulary[0];
  assert.equal(initial.highlightTerm, "rides");
  row.meta_json.titleChinese = "保留的标题";
  const changed = await save({
    operation: "save", index: 0, previous: initial, term: "ride", definition: "游乐设施",
  });
  assert.equal(changed.status, 200);
  assert.equal(row.meta_json.vocabulary[0].definition, "游乐设施");
  assert.equal(row.meta_json.titleChinese, "保留的标题");
  assert.equal((await save({ operation: "delete", index: 0, previous: initial })).status, 409);
  const deleted = await save({ operation: "delete", index: 0, previous: changed.data.vocabulary[0] });
  assert.equal(deleted.status, 200);
  assert.equal(getBbcArticleContentOverride(row.meta_json).vocabulary.length, 0);
});

test("prepare accepts a publishable preview with incomplete annotations", async () => {
  const article = {
    id: "test-paste", title: "Test", body: ["One.", "Two.", "Three."],
    syntaxSentences: [{ status: "reviewed" }, { status: "draft" }, { status: "reviewed" }],
  };
  const post = loadFunctions("../src/app/api/admin/bbc-articles/route.ts", ["POST"], {
    createServiceClient: () => ({}),
    requireAdmin: async () => ({ user: { id: "test-admin" } }),
    parseBbcArticlePaste: () => ({ syntaxRequested: true, syntaxAnnotations: [1, 2, 1, 3].map(sentenceNo => ({ sentenceNo })) }),
    buildArticle: (_parsed, _audio, allowIncomplete) => { assert.equal(allowIncomplete, true); return article; },
    getBbcArticleById: () => null,
    NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) },
  });
  const result = await post({ json: async () => ({ action: "prepare", text: "Test paste", allowIncomplete: true }) });
  assert.equal(result.status, 200);
  assert.equal(result.data.article, article);
});

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

test("BBC 260817 supplied paste keeps grammar out of vocabulary and aligns its original MP3 transcript", () => {
  const parsed = loadPasteParser()(readFileSync(new URL("./fixtures/bbc-paste-260817.txt", import.meta.url), "utf8"));
  assert.equal(typeof parsed, "object");
  assert.equal(parsed.english.split("\n\n").length, 4);
  assert.equal(parsed.chinese.split("\n\n").length, 4);
  assert.equal(parsed.vocabulary.length, 28);
  assert.equal(parsed.vocabulary.at(-1).translation, "标准发音通常与英国上层阶级联系在一起。");
  assert.equal(parsed.syntaxAnnotations.length, 23);
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/bbc-audio-260817.json", import.meta.url), "utf8"));
  const sentences = parsed.syntaxAnnotations.map(({ sentenceNo, text }) => ({ sentenceNo, english: text }));
  const result = loadAudioAlignment()(sentences, fixture.recognized, fixture.duration, fixture.pauses);
  assert.equal(result.timings.length, 23);
  assert.deepEqual(Array.from(result.reviewSentenceNos), []);
  assert.equal(result.timings[0].startMs, 5300);
  assert.equal(result.timings.at(-1).endMs, 168468);
});

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

test("BBC uploaded phrases store normalized lemmas while retaining the written headword", () => {
  const result = loadPasteParser()(`260803-Example title 示例标题
Zoning out can happen during a long meeting.
长时间开会时可能会走神。

1. zoning out /ˈzəʊnɪŋ aʊt/ phr. 走神
2. aerobatic activities /ˌeərəˈbætɪk ækˈtɪvətiz/ n. 特技飞行活动`);
  assert.equal(typeof result, "object");
  assert.equal(result.vocabulary[0].term, "zoning out");
  assert.equal(result.vocabulary[0].lemma, "zone out");
  assert.equal(result.vocabulary[1].term, "aerobatic activities");
  assert.equal(result.vocabulary[1].lemma, "aerobatic activity");
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
it：代词
means：动词
to：不定式符号
be：助动词
cool：形容词
>主干：Today's youth【主】 are reinventing【谓】 what it means to be cool【宾语从句】

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
  assert.deepEqual(Array.from(applied.level2, (span) => span.label), ["定语"]);
  assert.ok(applied.level2[0].start >= applied.level1[0].start && applied.level2[0].end <= applied.level1[0].end);
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
      { term: "learn", description: "动词" },
      { term: "English", description: "专有名词" },
    ],
  }], 1);
  assert.equal(authored.status, "reviewed");
  assert.equal(authored.level1.length, 0);
  assert.equal(authored.level2.length, 0);
  assert.equal(authored.tokens[1].pos, "VERB");
  assert.throws(() => apply(automatic, [{
    sentenceNo: 1, text, main: "", items: [
      { term: "We", description: "代词" },
      { term: "learn", description: "动词（谓语）" },
      { term: "English", description: "专有名词" },
    ],
  }], 1), /没有对应的一级主干范围/);
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
  const reuse = loadFunctions("../src/app/api/admin/bbc-articles/route.ts", ["getStoredAudioPath", "reuseExistingBbcAudioTimings"], {});
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

test("BBC audio alignment refuses to guess an unrecognized opening sentence", () => {
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
  assert.throws(() => align(sentences, recognized, 8), /匹配度|未与原声完整对齐/);
});

test("BBC audio alignment rejects source coverage below the strict 88 percent threshold", () => {
  const align = loadAudioAlignment();
  const words = Array.from({ length: 25 }, (_, index) => `word${index + 1}`);
  const kept = [...words.slice(0, 4), ...words.slice(10)];
  assert.throws(() => align(
    [{ sentenceNo: 1, english: words.join(" ") }],
    kept.map((text, index) => ({ text, timestamp: [index * 0.2, index * 0.2 + 0.15] })),
    6,
  ), /匹配度不足/);
});

test("BBC audio alignment rejects a missing sentence opening instead of estimating its boundary", () => {
  const align = loadAudioAlignment();
  const sentences = [
    { sentenceNo: 1, english: "Opening sentence starts cleanly." },
    { sentenceNo: 2, english: "The second sentence matches the source completely." },
  ];
  const recognized = ["sentence", "starts", "cleanly", "The", "second", "sentence", "matches", "the", "source", "completely"]
    .map((text, index) => ({ text, timestamp: [0.2 + index * 0.25, 0.4 + index * 0.25] }));
  assert.throws(() => align(sentences, recognized, 5), /句首或句尾未与原声完整对齐/);
});

test("BBC audio alignment refuses to truncate or estimate unrecognized final words", () => {
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
  assert.throws(() => align(sentences, recognized, 6), /匹配度|未与原声完整对齐/);
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

test("BBC audio alignment blocks cutting when recognition misses the last word", () => {
  const align = loadAudioAlignment();
  assert.throws(() => align(
    [{ sentenceNo: 1, english: "The final sentence ends near the close." }],
    ["The", "final", "sentence", "ends", "near", "the"].map((text, index) => ({
      text,
      timestamp: [0.2 + index * 0.35, 0.4 + index * 0.35],
    })),
    5,
  ), /匹配度|未与原声完整对齐/);
});

test("BBC 260810 word alignment reproduces the original 21 standalone clip boundaries", () => {
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/bbc-audio-260810.json", import.meta.url), "utf8"));
  const result = loadAudioAlignment()(fixture.sentences, fixture.recognized, fixture.duration, fixture.pauses);
  assert.equal(result.timings.length, 21);
  for (let index = 0; index < result.timings.length; index++) {
    const actual = result.timings[index], expected = fixture.timings[index];
    assert.ok(Math.abs(actual.startMs - expected.startMs) <= 15, `sentence ${actual.sentenceNo} start ${actual.startMs} != ${expected.startMs}`);
    assert.ok(Math.abs(actual.endMs - expected.endMs) <= 15, `sentence ${actual.sentenceNo} end ${actual.endMs} != ${expected.endMs}`);
  }
  assert.equal(result.timings[0].endMs, 12_900);
  assert.equal(result.timings[1].endMs, 20_100);
  assert.equal(result.timings.at(-1).endMs, 167_082);
});

test("standalone clip paths belong to the same original recording revision", () => {
  const path = "bbc/2026/260810/full-0123456789abcdef.mp3";
  const validate = loadFunctions("../src/app/api/admin/bbc-articles/route.ts", ["sentenceAudioPath", "validateSentenceAudioFiles"], {});
  const files = [{ sentenceNo: 1, objectPath: "bbc/2026/260810/sentences/0123456789abcdef/260810-001.mp3" }];
  assert.equal(validate(files, path, 1).length, 1);
  assert.equal(validate(files, "bbc/2026/260810/full-fedcba9876543210.mp3", 1), null);
  assert.equal(validate(files, "bbc/2026/260803/full-0123456789abcdef.mp3", 1), null);
  assert.equal(validate([], path, 1), null);
  assert.equal(validate([{ ...files[0], sentenceNo: 2 }], path, 1), null);
  assert.equal(validate([{ sentenceNo: 1, objectPath: null }], "bbc/2026/260810/full.mp3", 1), null);
});

test("editing vocabulary or syntax retains the original standalone sentence audio", () => {
  const reuse = loadFunctions("../src/app/api/admin/bbc-articles/route.ts", ["getStoredAudioPath", "reuseExistingBbcAudioTimings"], {});
  const sentence = { sentenceNo: 1, english: "A sentence.", startMs: 400, endMs: 2200,
    audioUrl: "/api/bbc-audio/2026/260810/sentences/0123456789abcdef/260810-001.mp3" };
  const existing = { id: "260810", year: 2026, fullAudioUrl: "/api/bbc-audio/2026/260810/full-0123456789abcdef.mp3", audioDurationMs: 5000, sentences: [sentence] };
  assert.equal(reuse({ sentences: [sentence] }, existing, "bbc/2026/260810/full-0123456789abcdef.mp3").timings[0].audioUrl, sentence.audioUrl);
});

test("a clip failure saves the article and full MP3, and retrying reuses completed work", async () => {
  const exports = {};
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/bbc-audio-260810.json", import.meta.url), "utf8"));
  const original = new File([new Uint8Array(500)], "260810.mp3", { type: "audio/mpeg" });
  const subtitles = new File(["[00:01.000]Example."], "260810.lrc");
  const clips = fixture.sentences.map((sentence) => ({ sentenceNo: sentence.sentenceNo,
    file: new File([new Uint8Array(200)], `sentence-${sentence.sentenceNo}.mp3`, { type: "audio/mpeg" }) }));
  const objectPath = "bbc/2026/260810/full-0123456789abcdef.mp3";
  const puts = [], requests = [];
  let hook = 0, analyses = 0, failSecondClip = true;
  const react = { useEffect() {}, useMemo: (calculate) => calculate(), useRef: () => ({ current: null }), useState(initial) {
    const value = hook === 0 ? "260810-The art of farts 关于肠道排气的科学\nEnglish\n中文" : hook === 1 ? original : hook === 2 ? subtitles : initial;
    hook++; return [value, () => {}];
  } };
  class Request {
    upload = {};
    open(_method, url) { this.url = url; }
    setRequestHeader() {}
    send(file) {
      puts.push(file.name);
      this.upload.onprogress?.({ lengthComputable: true, loaded: file.size, total: file.size });
      this.status = file.name === "sentence-2.mp3" && failSecondClip ? 403 : 200;
      if (this.status === 403) failSecondClip = false;
      this.onload();
    }
  }
  const adminRequest = async (_url, options) => {
    if (!options) return { articles: [] };
    const body = JSON.parse(options.body); requests.push({ method: options.method, body });
    if (body.action === "prepare") return { article: { id: "260810", sentences: fixture.sentences }, pastedSyntaxTotalCount: 21, pastedSyntaxCount: 21 };
    if (body.action === "presign") return { objectPath, headers: {}, uploadUrl: "/original" };
    if (body.action === "presign-sentences") return { tickets: body.files.map((clip) => ({ sentenceNo: clip.sentenceNo, headers: {},
      uploadUrl: `/clip/${clip.sentenceNo}`, objectPath: `${objectPath.slice(0, objectPath.lastIndexOf("/"))}/sentences/0123456789abcdef/260810-${String(clip.sentenceNo).padStart(3, "0")}.mp3` })) };
    return { articleId: "260810", article: { id: "260810", sentences: fixture.sentences }, href: "/articles/260810", objectPath, audioIncluded: true, published: false, year: 2026, month: 8, sentenceCount: 21, paragraphCount: 5, vocabularyCount: 32, sentenceAudioCount: 21 };
  };
  const code = ts.transpileModule(readFileSync(new URL("../src/components/admin-bbc-article-upload.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const jsx = (type, props) => ({ type, props });
  runInNewContext(code, { exports, XMLHttpRequest: Request, File, AbortSignal, require: (specifier) => {
    if (specifier === "react") return react;
    if (specifier === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (specifier.includes("admin/request")) return { adminRequest };
    if (specifier === "@/lib/articles/bbc-article-upload") return {
      parseBbcArticlePaste: loadPasteParser(),
      parseBbcArticleDateFromTitle: () => ({ id: "260810", year: 2026, month: 8 }),
      splitBbcArticleParagraphs: loadFunctions("../src/lib/articles/bbc-article-upload.ts", ["splitBbcArticleParagraphs"], {}),
    };
    if (specifier.includes("bbc-audio-alignment")) return { analyzeBbcAudio: async (_file, _sentences, _progress, subtitle) => { assert.equal(subtitle, subtitles); analyses++; return { durationMs: 173418, timings: fixture.timings, reviewSentenceNos: [], clips }; } };
    return {};
  } });
  const tree = exports.AdminBbcArticleUpload();
  const form = tree.props.children.find((child) => child?.type === "form");
  await form.props.onSubmit({ preventDefault() {}, nativeEvent: { submitter: { getAttribute: () => "align" } } });
  const fallback = requests.filter((request) => request.method === "PUT");
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].body.allowIncomplete, true);
  assert.equal(fallback[0].body.objectPath, objectPath);
  assert.equal(fallback[0].body.timings.length, 21);
  assert.equal(fallback[0].body.sentenceAudioFiles.length, 20);
  assert.ok(!fallback[0].body.sentenceAudioFiles.some(({ sentenceNo }) => sentenceNo === 2));
  await form.props.onSubmit({ preventDefault() {}, nativeEvent: { submitter: { getAttribute: () => "align" } } });
  assert.equal(analyses, 1);
  assert.equal(puts.filter((name) => name === "260810.mp3").length, 1);
  assert.equal(puts.filter((name) => name === "sentence-1.mp3").length, 1);
  assert.equal(puts.filter((name) => name === "sentence-2.mp3").length, 2);
  const saved = requests.filter((request) => request.method === "PUT" && request.body.sentenceAudioFiles);
  assert.equal(saved.length, 2);
  assert.equal(saved[1].body.sentenceAudioFiles.length, 21);
  assert.equal(new Set(saved[1].body.sentenceAudioFiles.map((file) => file.objectPath)).size, 21);
  assert.equal(saved[1].body.clips, undefined);
});

test("article save retains valid ranges even when a standalone clip is missing", async () => {
  for (const missingClip of [2, null]) {
    const saved = [];
    const objectPath = "bbc/2026/260810/full-0123456789abcdef.mp3";
    const files = [1, 2, 3].map((sentenceNo) => ({ sentenceNo, objectPath: `bbc/2026/260810/sentences/0123456789abcdef/260810-${String(sentenceNo).padStart(3, "0")}-${(sentenceNo - 1) * 1500}-${sentenceNo * 1500}.mp3` }));
    const article = { id: "260810", year: 2026, title: "Test", body: ["Test"], vocabulary: [], fullAudioUrl: "/api/bbc-audio/2026/260810/full-0123456789abcdef.mp3", syntaxSentences: [],
      sentences: [1, 2, 3].map((sentenceNo) => ({ sentenceNo, english: `Sentence ${sentenceNo}.` })) };
    const supabase = { from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null, error: null }),
      upsert: async (value) => { saved.push(value); return { error: null }; } }) };
    const put = loadFunctions("../src/app/api/admin/bbc-articles/route.ts", ["sentenceAudioPath", "readSentenceAudioRange", "getStoredAudioPath", "reuseExistingBbcAudioTimings", "PUT"], {
      AbortSignal,
      createServiceClient: () => supabase, requireAdmin: async () => ({ user: { id: "test-admin" } }),
      parseBbcArticleDateFromTitle: () => ({ year: 2026, month: 8, id: "260810" }), getBbcArticleById: () => null,
      buildArticle: () => structuredClone(article), retainReviewedBbcSyntax: (sentences) => sentences,
      hasR2Object: async (path) => path !== files.find((file) => file.sentenceNo === missingClip)?.objectPath,
      revalidatePath() {}, NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) },
    });
    const result = await put({ json: async () => ({ title: "260810-Test", objectPath, durationMs: 6000, allowIncomplete: true,
      sentenceAudioFiles: files, timings: [1, 2, 3].map((sentenceNo) => ({ sentenceNo, startMs: (sentenceNo - 1) * 1500, endMs: sentenceNo * 1500 })) }) });
    assert.equal(result.status, 200);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].published, false);
    assert.equal(result.data.timedSentenceCount, 3);
    assert.equal(result.data.sentenceAudioCount, missingClip ? 2 : 3);
    assert.equal(saved[0].article.sentences[1].audioUrl, missingClip ? article.fullAudioUrl : files[1].objectPath.replace(/^bbc\//, "/api/bbc-audio/"));
  }
});

test("direct BBC publishing accepts missing translations and audio timings, which can be added on the article page", async () => {
  const parseBbcArticlePaste = loadPasteParser();
  const text = "260810-Test\nThe first sentence. The second sentence.";
  assert.equal(typeof parseBbcArticlePaste(text), "string");
  const objectPath = "bbc/2026/260810/full-0123456789abcdef.mp3";
  const route = "../src/app/api/admin/bbc-articles/route.ts";
  for (const audioAvailable of [true, false]) {
    let saved;
    const supabase = { from: () => ({
      select() { return this; }, eq() { return this; },
      maybeSingle: async () => ({ data: saved, error: null }),
      upsert: async (value) => { saved = structuredClone(value); return { error: null }; },
      update: (value) => ({ eq: async () => { Object.assign(saved, value); return { error: null }; } }),
    }) };
    const globals = {
      AbortSignal,
      createServiceClient: () => supabase, requireAdmin: async () => ({ user: { id: "test-admin" } }),
      parseBbcArticlePaste, parseBbcArticleDateFromTitle: () => ({ year: 2026, month: 8, id: "260810" }),
      getBbcArticleById: () => null,
      buildArticle: ({ english, title }) => ({
        id: "260810", year: 2026, title, body: [english], syntaxSentences: [],
        sentences: english.match(/[^.]+\./g).map((sentence, index) => ({ sentenceNo: index + 1, english: sentence.trim(), startMs: 0, endMs: 0 })),
      }),
      retainReviewedBbcSyntax: (sentences) => sentences,
      hasR2Object: async (path) => { assert.equal(path, objectPath); return audioAvailable; },
      syncPublishedPhraseVocabulary: async () => ({ added: 0, updated: 0, warning: "" }),
      revalidatePath() {}, NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) },
    };
    const put = loadFunctions(route, ["getStoredAudioPath", "reuseExistingBbcAudioTimings", "PUT"], globals);
    const result = await put({ json: async () => ({ text, objectPath, durationMs: 6000, timings: [], sentenceAudioFiles: [], publish: true }) });
    assert.equal(result.status, 200);
    assert.equal(saved.published, true);
    assert.equal(saved.article.body[0], "The first sentence. The second sentence.");
    assert.equal(result.data.audioIncluded, audioAvailable);
    assert.equal(result.data.timingsComplete, false);
    if (!audioAvailable) {
      assert.match(result.data.reviewWarnings.join("\n"), /MP3 暂未上传成功/);
      continue;
    }
    const patch = loadFunctions(route, ["PATCH"], globals);
    const saveTiming = (sentenceNo, startMs, endMs) => patch({ json: async () => ({ articleId: "260810", sentenceNo, startMs, endMs }) });
    assert.equal((await saveTiming(2, 2500, 4000)).status, 200);
    assert.equal(saved.article.subtitleUrl, undefined);
    assert.equal((await saveTiming(1, 100, 2300)).status, 200);
    assert.equal(saved.article.subtitleUrl, "/api/bbc-subtitles/260810");
    assert.equal(saved.published, true);
  }
});

test("deleting a repeated BBC sentence removes the selected occurrence and preserves surviving timing and annotations", () => {
  const splitArticleSentences = loadFunctions("../src/lib/article-inline-annotations.ts", ["splitArticleSentences"], {});
  const remove = loadFunctions("../src/app/api/admin/bbc-articles/route.ts",
    ["splitChineseSentences", "splitBbcPracticeParagraph", "removeBbcSentence"], { splitArticleSentences, createBbcSubtitleSentenceMatcher });
  const lastSentence = "Keep this... — even now.";
  const article = {
    id: "260810", fullAudioUrl: "/full.mp3",
    body: [`It works. It works. ${lastSentence}`], chineseParagraphs: ["成功了。再试一次。保留这句。"],
    paragraphUnderlines: [{ english: [{ start: 20, end: 24 }], chinese: [{ start: 9, end: 13 }] }],
    sentences: [["It works.", "成功了。"], ["It works.", "再试一次。"], [lastSentence, "保留这句。"]].map(([english, chinese], i) => ({ english, chinese, sentenceNo: i + 1, audioUrl: `/clip-${i + 1}.mp3`, startMs: i * 1000, endMs: (i + 1) * 1000 })),
    syntaxSentences: [{}, {}, { sourceAnnotation: `## 句 3\n${lastSentence}` }],
  };
  assert.equal(remove(article, 1).length, 0);
  const saved = structuredClone(article);
  assert.deepEqual(saved.body, [`It works. ${lastSentence}`]);
  assert.deepEqual(saved.chineseParagraphs, ["成功了。保留这句。"]);
  assert.deepEqual(saved.paragraphUnderlines, [{ english: [{ start: 10, end: 14 }], chinese: [{ start: 4, end: 8 }] }]);
  assert.deepEqual(saved.sentences.map(({ sentenceNo, audioUrl, startMs, endMs }) => [sentenceNo, audioUrl, startMs, endMs]), [[1, "/clip-1.mp3", 0, 1000], [2, "/clip-3.mp3", 2000, 3000]]);
  assert.equal(saved.syntaxSentences[1].sourceAnnotation, `## 句 2\n${lastSentence}`);
  assert.equal(saved.subtitleUrl, "/api/bbc-subtitles/260810");
});

test("BBC word highlighting covers both pieces of spoken contractions", () => {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../src/components/bbc-syntax-sentence.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, { exports, require: (specifier) => {
    if (specifier === "react") return React;
    if (specifier === "react/jsx-runtime") return jsxRuntime;
    if (specifier.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    throw new Error(`Unexpected dependency: ${specifier}`);
  } });
  const data = { text: "It's a topic.", tokens: [
    { text: "It", pos: "PRON", start: 0, end: 2 }, { text: "'s", pos: "AUX", start: 2, end: 4 },
    { text: "a", pos: "DET", start: 5, end: 6 }, { text: "topic", pos: "NOUN", start: 7, end: 12 },
    { text: ".", pos: "PUNCT", start: 12, end: 13 },
  ], level1: [], level2: [], status: "reviewed" };
  const render = (activeWordIndex) => renderToStaticMarkup(React.createElement(exports.BbcSyntaxSentence, { data, activeWordIndex, sentenceNo: 1, vocabularyWordIndexes: new Set(), waveTerms: [] }));
  assert.equal((render(0).match(/wordText activePlaybackWord/g) ?? []).length, 2);
  assert.equal((render(1).match(/wordText activePlaybackWord/g) ?? []).length, 1);
  assert.equal((render(-1).match(/wordText activePlaybackWord/g) ?? []).length, 0);
});

test("all study modes can play either a standalone BBC clip or a full recording range", () => {
  const playback = loadFunctions("../src/components/bbc-article-detail-page.tsx", ["getBbcSentenceAudio"], {});
  const full = "/original.mp3";
  const clip = playback({ audioUrl: "/clip.mp3", startMs: 0, endMs: 0 }, full);
  assert.equal(clip.audioUrl, "/clip.mp3");
  assert.equal(clip.range, null);
  const range = playback({ audioUrl: full, startMs: 1100, endMs: 2400 }, full);
  assert.equal(range.audioUrl, full);
  assert.equal(range.range.startSeconds, 1.1);
  assert.equal(range.range.endSeconds, 2.4);
  assert.equal(playback({ audioUrl: full, startMs: 0, endMs: 0 }, full), null);
});
