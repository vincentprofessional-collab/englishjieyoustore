import { createHash, createHmac, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { splitArticleSentences } from "@/lib/article-inline-annotations";
import { getBbcArticleById } from "@/lib/articles/bbc";
import { parseBbcArticleDateFromTitle, parseBbcArticlePaste, splitBbcArticleParagraphs } from "@/lib/articles/bbc-article-upload";
import type { BbcArticle, BbcVocabularyItem } from "@/lib/articles/bbc";
import { extractBbcWaveText } from "@/lib/articles/bbc-paste-markup";
import { normalizeBbcSyntaxSentenceEdits } from "@/lib/bbc-syntax-annotation-edits";
import { buildAutomaticBbcSyntax } from "@/lib/articles/bbc-automatic-syntax";
import { applyPastedBbcSyntax, retainReviewedBbcSyntax, type PastedBbcSyntaxSentence } from "@/lib/articles/bbc-pasted-syntax";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const bucket = process.env.R2_BBC_AUDIO_BUCKET || "englishjieyou-bbc-audio";
const maxAudioBytes = 200 * 1024 * 1024;

function createServiceClient() {
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function requireAdmin(request: NextRequest, supabase: SupabaseClient) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 }) };

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error && (error.status === undefined || error.status === 0 || error.status >= 500)) {
    return {
      response: NextResponse.json(
        { error: "后台登录验证服务暂时无法连接，请稍后重试。", retryable: true },
        { status: 503 },
      ),
    };
  }
  if (error || !user) return { response: NextResponse.json({ error: "管理员登录已失效，请重新登录。" }, { status: 401 }) };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || profile?.role !== "admin") {
    return { response: NextResponse.json({ error: "只有管理员可以上传 BBC 文章。" }, { status: 403 }) };
  }

  return { user };
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function encode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function getPresignedPutUrl(objectPath: string, method = "PUT") {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_BBC_AUDIO_UPLOAD_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_BBC_AUDIO_UPLOAD_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const uri = `/${bucket}/${objectPath.split("/").map(encode).join("/")}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const query: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", "900"],
    ["X-Amz-SignedHeaders", "content-type;host"],
  ];
  const canonicalQuery = query
    .map(([name, value]) => [encode(name), encode(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  const canonicalHeaders = `content-type:audio/mpeg\nhost:${host}\n`;
  const canonicalRequest = [
    method,
    uri,
    canonicalQuery,
    canonicalHeaders,
    "content-type;host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, hash(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return `https://${host}${uri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function hasR2Object(objectPath: string) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_BBC_AUDIO_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_BBC_AUDIO_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return false;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const uri = `/${bucket}/${objectPath.split("/").map(encode).join("/")}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const payloadHash = hash("");
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["HEAD", uri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, hash(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  try {
    const response = await fetch(`https://${host}${uri}`, {
      method: "HEAD",
      headers: {
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

function readText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) return { error: `${field}不能为空。` };
  if (value.length > maxLength) return { error: `${field}超出长度限制。` };
  return { value: value.trim() };
}

function parseVocabulary(value: unknown): BbcVocabularyItem[] | string {
  const text = typeof value === "string" ? value : "";
  if (text.length > 100_000) return "词汇与短语内容过长。";
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (rows.length > 300) return "一篇文章最多添加 300 条词汇或短语。";

  const items = rows.map((row, index) => {
    const [rawTerm, ...meaningParts] = row.split(/[|\t]/);
    const term = rawTerm.trim();
    const definition = meaningParts.join("|").trim();
    return {
      definition,
      entry: term,
      example: "",
      lemma: term,
      number: index + 1,
      term,
      translation: "",
      highlight: true,
    };
  });
  if (items.some((item) => !item.term || !item.definition)) {
    return "词汇与短语请按“英文词汇 | 中文释义”填写，每行一条。";
  }
  return items;
}

function splitChineseSentences(paragraph: string) {
  return (paragraph.match(/[^。！？!?…]+(?:[。！？!?…]+[”’"'」』）)]*)?|[^。！？!?…]+$/gu) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function buildPracticeSentences(body: string[], chineseParagraphs: string[]) {
  let sentenceNo = 0;
  return body.flatMap((paragraph, paragraphIndex) => {
    const englishWave = extractBbcWaveText(paragraph);
    const chineseWave = extractBbcWaveText(chineseParagraphs[paragraphIndex] ?? "");
    const englishSentences = splitArticleSentences(englishWave.text).map(({ text }) => text.trim()).filter(Boolean);
    const chineseSentences = splitChineseSentences(chineseWave.text);
    const aligned = englishSentences.length === chineseSentences.length;
    if (!aligned) throw new Error(`第 ${paragraphIndex + 1} 段有 ${englishSentences.length} 个英文句子、${chineseSentences.length} 个中文句子，请逐句对应后再发布。`);
    const units = aligned
      ? englishSentences.map((english, index) => ({ chinese: chineseSentences[index], english }))
      : [{ chinese: chineseWave.text, english: englishWave.text }];

    let englishCursor = 0, chineseCursor = 0;
    return units.map(({ chinese, english }) => {
      const englishStart = englishWave.text.indexOf(english, englishCursor);
      const chineseStart = chineseWave.text.indexOf(chinese, chineseCursor);
      englishCursor = englishStart + english.length; chineseCursor = chineseStart + chinese.length;
      const localRanges = (ranges: { start: number; end: number }[], start: number, length: number) => ranges
        .filter((range) => range.start < start + length && range.end > start)
        .map((range) => ({ start: Math.max(0, range.start - start), end: Math.min(length, range.end - start) }));
      const englishUnderlinedRanges = localRanges(englishWave.ranges, englishStart, english.length);
      const chineseUnderlinedRanges = localRanges(chineseWave.ranges, chineseStart, chinese.length);
      return {
      chinese,
      endMs: 0,
      english,
      sentenceNo: ++sentenceNo,
      startMs: 0,
      underlinedTerms: englishUnderlinedRanges.map((range) => english.slice(range.start, range.end)),
      chineseUnderlinedTerms: chineseUnderlinedRanges.map((range) => chinese.slice(range.start, range.end)),
      englishUnderlinedRanges, chineseUnderlinedRanges,
    }; });
  });
}

function buildArticle(payload: Record<string, unknown>, objectPath: string): BbcArticle | string {
  const titleResult = readText(payload.title, "英文标题", 180);
  if (titleResult.error) return titleResult.error;
  const title = titleResult.value!;
  const dateTitle = typeof payload.dateTitle === "string" ? payload.dateTitle : title;
  const parsedDate = parseBbcArticleDateFromTitle(dateTitle);
  if (!parsedDate) return "标题中需要包含有效日期数字，例如 260727 或 20260727。";

  const titleChinese = typeof payload.titleChinese === "string" ? payload.titleChinese.trim().slice(0, 180) : "";
  const englishResult = readText(payload.english, "英文原文", 500_000);
  if (englishResult.error) return englishResult.error;
  const english = englishResult.value!;
  const chineseResult = readText(payload.chinese, "中文翻译", 500_000);
  if (chineseResult.error) return chineseResult.error;
  const chinese = chineseResult.value!;
  const body = splitBbcArticleParagraphs(english, "en");
  const chineseParagraphs = splitBbcArticleParagraphs(chinese, "zh");
  if (body.length !== chineseParagraphs.length) {
    return `英文原文有 ${body.length} 段，中文翻译有 ${chineseParagraphs.length} 段。请按段落一一对应，并用空行分隔段落。`;
  }

  const vocabulary = Array.isArray(payload.vocabulary)
    ? payload.vocabulary as BbcVocabularyItem[]
    : parseVocabulary(payload.vocabulary);
  if (typeof vocabulary === "string") return vocabulary;
  if (vocabulary.length > 300 || vocabulary.some((item) => !item.term?.trim() || !item.entry?.trim())) {
    return "词汇与短语内容格式无效或超过 300 条。";
  }
  const expectedPrefix = `bbc/${parsedDate.year}/${parsedDate.id}/`;
  if (objectPath && (!objectPath.startsWith(expectedPrefix) || !/^full(?:-[a-f0-9]{16})?\.mp3$/.test(objectPath.slice(expectedPrefix.length)))) return "音频存储路径与文章日期不匹配。";

  const fullAudioUrl = objectPath ? `/api/bbc-audio/${parsedDate.year}/${parsedDate.id}/${objectPath.slice(expectedPrefix.length)}` : undefined;
  const sentences = buildPracticeSentences(body, chineseParagraphs);
  const syntaxAnnotations = Array.isArray(payload.syntaxAnnotations)
    ? payload.syntaxAnnotations as PastedBbcSyntaxSentence[]
    : [];
  const annotatedSentenceNos = new Set<number>();
  for (const annotation of syntaxAnnotations) {
    if (!Number.isInteger(annotation.sentenceNo) || annotation.sentenceNo < 1 || annotation.sentenceNo > sentences.length) {
      throw new Error(`语法标注的句号 ${annotation.sentenceNo} 超出正文范围，请核对输入框内容。`);
    }
    if (annotatedSentenceNos.has(annotation.sentenceNo)) throw new Error(`第 ${annotation.sentenceNo} 句存在重复语法标注。`);
    annotatedSentenceNos.add(annotation.sentenceNo);
  }
  return {
    ...(fullAudioUrl ? { audioUrl: fullAudioUrl, fullAudioUrl } : {}),
    body: body.map((paragraph) => extractBbcWaveText(paragraph).text),
    chineseParagraphs: chineseParagraphs.map((paragraph) => extractBbcWaveText(paragraph).text),
    paragraphUnderlines: body.map((paragraph, index) => ({ english: extractBbcWaveText(paragraph).ranges, chinese: extractBbcWaveText(chineseParagraphs[index]).ranges })),
    date: parsedDate.date,
    id: parsedDate.id,
    lead: titleChinese,
    sentences,
    syntaxSentences: sentences.map((sentence) => applyPastedBbcSyntax(
      buildAutomaticBbcSyntax(sentence.english),
      syntaxAnnotations,
      sentence.sentenceNo,
    )),
    title,
    titleChinese: titleChinese || undefined,
    vocabulary,
    year: parsedDate.year,
  };
}

function sentenceAudioPath(objectPath: string, sentenceNo: number) {
  const match = /^(bbc\/(\d{4})\/(\d{6}))\/full-([a-f0-9]{16})\.mp3$/.exec(objectPath);
  if (!match || !Number.isInteger(sentenceNo) || sentenceNo < 1 || sentenceNo > 500) return null;
  return `${match[1]}/sentences/${match[4]}/${match[3]}-${String(sentenceNo).padStart(3, "0")}.mp3`;
}

function validateSentenceAudioFiles(input: unknown, objectPath: string, count: number) {
  if (!Array.isArray(input) || input.length !== count || count < 1 || count > 500) return null;
  const files: { sentenceNo: number; objectPath: string }[] = [];
  for (let index = 0; index < count; index++) {
    const file = input[index];
    const expected = sentenceAudioPath(objectPath, index + 1);
    if (!expected || !file || typeof file !== "object" || file.sentenceNo !== index + 1 || typeof file.objectPath !== "string" || file.objectPath !== expected) return null;
    files.push({ sentenceNo: index + 1, objectPath: file.objectPath });
  }
  return files;
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "后台服务尚未配置 Supabase 管理密钥。" }, { status: 500 });
  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (payload?.action === "prepare") {
    if (typeof payload.text !== "string" || payload.text.length > 700_000) return NextResponse.json({ error: "文章内容无效或超过长度限制。" }, { status: 400 });
    const parsed = parseBbcArticlePaste(payload.text);
    if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
    try {
      const article = buildArticle(parsed, "");
      if (typeof article === "string") return NextResponse.json({ error: article }, { status: 400 });
      if (getBbcArticleById(article.id)) return NextResponse.json({ error: "内置文章正文由原有内容库维护，语法标注请在前端精读页面修改。" }, { status: 409 });
      const syntaxSentences = article.syntaxSentences ?? [];
      const unmatchedSyntaxSentenceNos = parsed.syntaxAnnotations
        .filter((annotation) => syntaxSentences[annotation.sentenceNo - 1]?.status !== "reviewed")
        .map((annotation) => annotation.sentenceNo);
      const pastedSyntaxCount = parsed.syntaxAnnotations.length - unmatchedSyntaxSentenceNos.length;
      return NextResponse.json({
        article,
        pastedSyntaxCount,
        pastedSyntaxTotalCount: parsed.syntaxAnnotations.length,
        unmatchedSyntaxSentenceNos,
      });
    } catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "文章分析失败。" }, { status: 400 }); }
  }
  const title = typeof payload?.title === "string" ? payload.title : "";
  const articleDate = parseBbcArticleDateFromTitle(title);
  if (!articleDate) return NextResponse.json({ error: "标题中需要包含有效日期数字，例如 260727 或 20260727。" }, { status: 400 });
  if (getBbcArticleById(articleDate.id)) {
    return NextResponse.json({ error: `BBC 文章 ${articleDate.id} 已存在于内置文章库，不能从此处覆盖。` }, { status: 409 });
  }

  const action = payload?.action;
  if (action === "presign-sentences") {
    const objectPath = typeof payload?.objectPath === "string" ? payload.objectPath : "";
    const expectedPrefix = `bbc/${articleDate.year}/${articleDate.id}/`;
    const files = payload?.files;
    if (!objectPath.startsWith(expectedPrefix) || !sentenceAudioPath(objectPath, 1) || !Array.isArray(files) || !files.length || files.length > 500) {
      return NextResponse.json({ error: "小音频的文章编号、原声路径或句子数量无效。" }, { status: 400 });
    }
    let totalBytes = 0;
    for (let index = 0; index < files.length; index++) {
      const size = Number(files[index]?.size);
      if (files[index]?.sentenceNo !== index + 1 || !Number.isInteger(size) || size < 128 || size > maxAudioBytes) {
        return NextResponse.json({ error: `第 ${index + 1} 句小音频无效。` }, { status: 400 });
      }
      totalBytes += size;
    }
    if (totalBytes > maxAudioBytes || !await hasR2Object(objectPath)) return NextResponse.json({ error: "小音频总量超过 200 MB，或原声尚未上传完成。" }, { status: 400 });
    const tickets = files.map((_, index) => {
      const path = sentenceAudioPath(objectPath, index + 1)!;
      return { sentenceNo: index + 1, objectPath: path, headers: { "Content-Type": "audio/mpeg" }, uploadUrl: getPresignedPutUrl(path) };
    });
    if (tickets.some((ticket) => !ticket.uploadUrl)) return NextResponse.json({ error: "音频上传服务尚未配置。" }, { status: 503 });
    return NextResponse.json({ tickets });
  }
  if (action === "presign") {
    const { error: tableError } = await supabase.from("bbc_uploaded_articles").select("id").limit(1);
    if (tableError) {
      const migrationHint = tableError.code === "42P01" || tableError.code === "PGRST205"
        ? "请先在 Supabase SQL Editor 运行 supabase/026_bbc_uploaded_articles.sql。"
        : tableError.message;
      return NextResponse.json({ error: `上传前检查失败：${migrationHint}` }, { status: 503 });
    }

    const filename = typeof payload?.filename === "string" ? payload.filename : "";
    const size = Number(payload?.size);
    if (!/\.mp3$/i.test(filename)) return NextResponse.json({ error: "请选择 MP3 音频文件。" }, { status: 400 });
    if (!Number.isFinite(size) || size <= 0 || size > maxAudioBytes) {
      return NextResponse.json({ error: "MP3 文件必须大于 0 且不超过 200 MB。" }, { status: 400 });
    }

    const objectPath = `bbc/${articleDate.year}/${articleDate.id}/full-${randomBytes(8).toString("hex")}.mp3`;
    const uploadUrl = getPresignedPutUrl(objectPath);
    if (!uploadUrl) {
      return NextResponse.json({ error: "音频上传服务尚未配置写入凭据，请联系管理员配置 BBC 音频上传权限。" }, { status: 503 });
    }
    return NextResponse.json({
      date: articleDate.date,
      headers: { "Content-Type": "audio/mpeg" },
      id: articleDate.id,
      month: articleDate.month,
      objectPath,
      uploadUrl,
      year: articleDate.year,
    });
  }

  return NextResponse.json({ error: "请求类型不受支持。" }, { status: 400 });
}

function reuseExistingBbcAudioTimings(article: BbcArticle, existing: BbcArticle | null, objectPath: string) {
  const filename = existing?.fullAudioUrl?.split("/").at(-1);
  if (!existing || !filename || !/^full(?:-[a-f0-9]{16})?\.mp3$/.test(filename)) return null;
  const existingObjectPath = `bbc/${existing.year}/${existing.id}/${filename}`;
  const existingSentences = existing.sentences ?? [];
  const currentSentences = article.sentences ?? [];
  const durationMs = existing.audioDurationMs;
  if (existingObjectPath !== objectPath || !Number.isInteger(durationMs) || !durationMs || existingSentences.length !== currentSentences.length) return null;
  if (existingSentences.some((sentence, index) => sentence.english !== currentSentences[index]?.english)) return null;

  return {
    durationMs,
    timings: existingSentences.map((sentence, index) => ({
      endMs: sentence.endMs,
      sentenceNo: index + 1,
      startMs: sentence.startMs,
      audioUrl: sentence.audioUrl,
    })),
  };
}

export async function PUT(request: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "后台服务尚未配置 Supabase 管理密钥。" }, { status: 500 });
  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return NextResponse.json({ error: "文章内容格式无效。" }, { status: 400 });
  if (typeof payload.text === "string" && payload.text.length > 700_000) {
    return NextResponse.json({ error: "粘贴内容不能超过 700 KB。" }, { status: 413 });
  }
  const parsedPaste = typeof payload.text === "string" ? parseBbcArticlePaste(payload.text) : null;
  if (typeof parsedPaste === "string") return NextResponse.json({ error: parsedPaste }, { status: 400 });
  const articlePayload = parsedPaste ? { ...parsedPaste } : payload;
  const title = typeof articlePayload.title === "string" ? articlePayload.title : "";
  const dateTitle = typeof articlePayload.dateTitle === "string" ? articlePayload.dateTitle : title;
  const articleDate = parseBbcArticleDateFromTitle(dateTitle);
  if (!articleDate) return NextResponse.json({ error: "标题中需要包含有效日期数字，例如 260727 或 20260727。" }, { status: 400 });
  if (getBbcArticleById(articleDate.id)) {
    return NextResponse.json({ error: `BBC 文章 ${articleDate.id} 已存在于内置文章库，不能从此处覆盖。` }, { status: 409 });
  }

  const expectedAudioPath = `bbc/${articleDate.year}/${articleDate.id}/full.mp3`;
  const objectPath = typeof payload.objectPath === "string"
    ? payload.objectPath
    : parsedPaste && await hasR2Object(expectedAudioPath) ? expectedAudioPath : "";
  let article: BbcArticle | string;
  try { article = buildArticle(articlePayload, objectPath); }
  catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "文章分析失败。" }, { status: 400 }); }
  if (typeof article === "string") return NextResponse.json({ error: article }, { status: 400 });
  if (!objectPath || !await hasR2Object(objectPath)) return NextResponse.json({ error: "请先上传本篇 MP3，完成时间轴分析后再发布。" }, { status: 400 });
  const existingArticleResult = await supabase.from("bbc_uploaded_articles").select("article,published,created_at").eq("id", article.id).maybeSingle();
  if (existingArticleResult.error) return NextResponse.json({ error: `保存前无法读取文章状态：${existingArticleResult.error.message}` }, { status: 503 });
  const existingArticle = existingArticleResult.data;
  let previousSyntax = (existingArticle?.article as BbcArticle | undefined)?.syntaxSentences ?? [];
  if (existingArticle && previousSyntax.length) {
    const overrides = await supabase.from("bbc_article_syntax_overrides").select("sentences,updated_at").eq("article_id", article.id).maybeSingle();
    if (overrides.error && !["42P01", "PGRST205"].includes(overrides.error.code)) return NextResponse.json({ error: "暂时无法读取已保存的语法修改，请稍后重试，避免丢失标注。" }, { status: 503 });
    if (overrides.data && Date.parse(overrides.data.updated_at) >= Date.parse(existingArticle.created_at)) {
      previousSyntax = normalizeBbcSyntaxSentenceEdits(overrides.data.sentences, previousSyntax) ?? previousSyntax;
    }
  }
  article.syntaxSentences = retainReviewedBbcSyntax(article.syntaxSentences ?? [], previousSyntax);
  let timings = payload.timings;
  let durationMs = Number(payload.durationMs);
  const reusingAudio = !Array.isArray(timings);
  if (!Array.isArray(timings)) {
    const reused = reuseExistingBbcAudioTimings(article, (existingArticle?.article as BbcArticle | null | undefined) ?? null, objectPath);
    if (!reused) return NextResponse.json({ error: "正文句子已变化，无法沿用原音频时间轴；请重新选择本篇 MP3 后保存。" }, { status: 400 });
    timings = reused.timings;
    durationMs = reused.durationMs;
  }
  if (!Array.isArray(timings) || timings.length !== article.sentences!.length || !Number.isFinite(durationMs) || durationMs <= 0) {
    return NextResponse.json({ error: "尚未生成完整的逐句原声时间轴。" }, { status: 400 });
  }
  const sentenceFiles = payload.sentenceAudioFiles === undefined ? undefined
    : validateSentenceAudioFiles(payload.sentenceAudioFiles, objectPath, article.sentences!.length);
  if (sentenceFiles === null) return NextResponse.json({ error: "独立小音频清单不完整或与本篇原声不匹配。" }, { status: 400 });
  if (sentenceFiles) {
    for (let first = 0; first < sentenceFiles.length; first += 8) {
      const batch = sentenceFiles.slice(first, first + 8);
      const complete = await Promise.all(batch.map((file) => hasR2Object(file.objectPath)));
      const missing = complete.findIndex((exists) => !exists);
      if (missing >= 0) return NextResponse.json({ error: `第 ${batch[missing].sentenceNo} 句小音频尚未上传完成，文章未保存。` }, { status: 400 });
    }
  }
  let previousEnd = 0;
  for (let index = 0; index < timings.length; index++) {
    const timing = timings[index] as Record<string, unknown>;
    const startMs = Number(timing.startMs), endMs = Number(timing.endMs);
    if (Number(timing.sentenceNo) !== index + 1 || !Number.isInteger(startMs) || !Number.isInteger(endMs) || startMs < previousEnd || endMs <= startMs || endMs > durationMs) {
      return NextResponse.json({ error: `第 ${index + 1} 句时间轴无效。` }, { status: 400 });
    }
    const audioUrl = sentenceFiles
      ? sentenceFiles[index].objectPath.replace(/^bbc\//, "/api/bbc-audio/")
      : reusingAudio && typeof timing.audioUrl === "string" ? timing.audioUrl : article.fullAudioUrl;
    Object.assign(article.sentences![index], { startMs, endMs, audioUrl });
    previousEnd = endMs;
  }
  article.subtitleUrl = `/api/bbc-subtitles/${article.id}`;
  article.audioDurationMs = durationMs;

  const published = existingArticle?.published === true;

  const { error } = await supabase.from("bbc_uploaded_articles").upsert({
    article,
    created_at: new Date().toISOString(),
    id: article.id,
    month: articleDate.month,
    published,
    uploaded_by: admin.user.id,
    year: article.year,
  }, { onConflict: "id" });

  if (error) {
    const migrationHint = error.code === "42P01" || error.code === "PGRST205"
      ? "请先在 Supabase SQL Editor 运行 supabase/026_bbc_uploaded_articles.sql。"
      : error.message;
    return NextResponse.json({ error: `文章上传成功，但保存文章资料失败：${migrationHint}` }, { status: 500 });
  }

  revalidatePath("/articles");
  revalidatePath(`/articles/${article.id}`);
  return NextResponse.json({
    articleId: article.id,
    audioIncluded: Boolean(article.fullAudioUrl),
    href: `/articles/${article.id}`,
    published,
    month: articleDate.month,
    ok: true,
    paragraphCount: article.body.length,
    vocabularyCount: article.vocabulary?.length ?? 0,
    sentenceCount: article.sentences?.length ?? 0,
    sentenceAudioCount: article.sentences?.filter((sentence) => sentence.audioUrl && sentence.audioUrl !== article.fullAudioUrl).length ?? 0,
    year: article.year,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "后台内容服务尚未配置。" }, { status: 500 });
  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (payload?.action === "publish") {
    const articleId = typeof payload.articleId === "string" ? payload.articleId : "";
    if (!/^\d{6}$/.test(articleId)) return NextResponse.json({ error: "文章编号无效。" }, { status: 400 });
    if (getBbcArticleById(articleId)) return NextResponse.json({ error: "内置文章不能通过上传后台发布。" }, { status: 409 });
    const existing = await supabase.from("bbc_uploaded_articles").select("article").eq("id", articleId).maybeSingle();
    if (existing.error || !existing.data) return NextResponse.json({ error: "草稿文章不存在。" }, { status: 404 });
    const article = existing.data.article as BbcArticle;
    if (!article.fullAudioUrl || !article.sentences?.length) return NextResponse.json({ error: "草稿缺少文章音频或逐句时间轴，暂时不能发布。" }, { status: 400 });
    const { error } = await supabase.from("bbc_uploaded_articles").update({ published: true }).eq("id", articleId);
    if (error) return NextResponse.json({ error: `发布失败：${error.message}` }, { status: 500 });
    revalidatePath("/articles");
    revalidatePath(`/articles/${articleId}`);
    return NextResponse.json({ ok: true, published: true, articleId });
  }
  const articleId = typeof payload?.articleId === "string" ? payload.articleId : "";
  const sentenceNo = Number(payload?.sentenceNo);
  const startMs = Number(payload?.startMs);
  const endMs = Number(payload?.endMs);
  if (!/^\d{6}$/.test(articleId) || !Number.isInteger(sentenceNo) || sentenceNo < 1
    || !Number.isInteger(startMs) || !Number.isInteger(endMs)) {
    return NextResponse.json({ error: "句子编号或时间值无效。" }, { status: 400 });
  }
  if (getBbcArticleById(articleId)) return NextResponse.json({ error: "内置文章的原声时间轴不能在此处修改。" }, { status: 409 });

  const result = await supabase.from("bbc_uploaded_articles").select("article").eq("id", articleId).maybeSingle();
  if (result.error || !result.data) return NextResponse.json({ error: "上传文章不存在。" }, { status: 404 });
  const article = result.data.article as BbcArticle;
  const sentences = article.sentences;
  const index = sentenceNo - 1;
  const durationMs = article.audioDurationMs;
  if (!article.fullAudioUrl || typeof durationMs !== "number" || !Number.isInteger(durationMs) || !sentences?.[index]) {
    return NextResponse.json({ error: "这篇文章没有可编辑的原声时间轴。" }, { status: 400 });
  }
  const previous = sentences[index - 1];
  const next = sentences[index + 1];
  if (startMs < 0 || endMs <= startMs || endMs > durationMs
    || (previous && startMs < previous.endMs) || (next && endMs > next.startMs)) {
    return NextResponse.json({ error: "调整后的时间必须位于音频范围内，且不能与相邻句子重叠。" }, { status: 400 });
  }
  sentences[index] = { ...sentences[index], startMs, endMs, audioUrl: article.fullAudioUrl };
  const { error } = await supabase.from("bbc_uploaded_articles").update({ article }).eq("id", articleId);
  if (error) return NextResponse.json({ error: `时间轴保存失败：${error.message}` }, { status: 500 });
  revalidatePath(`/articles/${articleId}`);
  return NextResponse.json({ ok: true, sentenceNo, startMs, endMs });
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "后台内容服务尚未配置。" }, { status: 503 });
  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;
  const id = request.nextUrl.searchParams.get("articleId");
  if (id) {
    const result = await supabase.from("bbc_uploaded_articles").select("article").eq("id", id).maybeSingle();
    if (result.error || !result.data) return NextResponse.json({ error: "上传文章不存在。" }, { status: 404 });
    const article = result.data.article as BbcArticle;
    const filename = article.fullAudioUrl?.split("/").at(-1) ?? "full.mp3";
    if (!/^full(?:-[a-f0-9]{16})?\.mp3$/.test(filename)) return NextResponse.json({ error: "文章音频路径无效。" }, { status: 400 });
    const objectPath = `bbc/${article.year}/${article.id}/${filename}`;
    return NextResponse.json({ article, objectPath });
  }
  const result = await supabase.from("bbc_uploaded_articles").select("id,year,created_at,published,title:article->>title").order("created_at", { ascending: false }).limit(200);
  if (result.error) return NextResponse.json({ error: "文章列表暂时无法读取。" }, { status: 503 });
  return NextResponse.json({ articles: result.data });
}
