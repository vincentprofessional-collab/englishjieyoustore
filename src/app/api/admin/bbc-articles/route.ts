import { createHash, createHmac, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { splitArticleSentences } from "@/lib/article-inline-annotations";
import { getArticleInlineSourceDocument } from "@/lib/article-inline-annotation-sources";
import { getBbcArticleById } from "@/lib/articles/bbc";
import { parseBbcArticleDateFromTitle, parseBbcArticlePaste, splitBbcArticleParagraphs } from "@/lib/articles/bbc-article-upload";
import type { BbcArticle, BbcVocabularyItem } from "@/lib/articles/bbc";
import { getBbcArticleContentOverride } from "@/lib/articles/bbc-content-overrides";
import { extractBbcWaveText } from "@/lib/articles/bbc-paste-markup";
import { getBbcEffectiveVocabularyById } from "@/lib/articles/bbc-vocabulary";
import { mergeBbcVocabularyItems, normalizeBbcVocabularyTerm } from "@/lib/articles/bbc-vocabulary-merge";
import { normalizeBbcSyntaxSentenceEdits } from "@/lib/bbc-syntax-annotation-edits";
import { buildAutomaticBbcSyntax, buildUnclassifiedBbcSyntax } from "@/lib/articles/bbc-automatic-syntax";
import { applyPastedBbcSyntax, matchPastedBbcSyntax, retainReviewedBbcSyntax, type PastedBbcSyntaxSentence } from "@/lib/articles/bbc-pasted-syntax";
import { normalizeBbcPdfQuiz } from "@/lib/articles/bbc-quiz";
import { createBbcSubtitleSentenceMatcher, parseBbcSubtitleCues } from "@/lib/articles/bbc-subtitle-alignment";
import { syncBbcDashedPhrases } from "@/lib/vocabulary/bbc-dashed-phrase-sync";

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

async function syncPublishedPhraseVocabulary(supabase: SupabaseClient, adminUserId: string, article: BbcArticle) {
  try {
    const document = getArticleInlineSourceDocument("bbc", article.id, article);
    if (!document) return { added: 0, updated: 0, warning: "找不到文章正文，短语词汇表未同步。" };
    const result = await syncBbcDashedPhrases(supabase, adminUserId, article, document, [], article.vocabulary ?? []);
    return { ...result, warning: "" };
  } catch (cause) {
    return {
      added: 0,
      updated: 0,
      warning: cause instanceof Error ? cause.message : "地道表达词汇表同步失败。",
    };
  }
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

async function hasR2Object(objectPath: string, signal = AbortSignal.timeout(5_000)) {
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
      signal,
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

function splitChineseSentences(paragraph: string, keepEllipses = false) {
  const boundary = keepEllipses
    ? /[^。！？!?]+(?:[。！？!?]+[”’"'」』）)]*)?/gu
    : /[^。！？!?…]+(?:[。！？!?…]+[”’"'」』）)]*)?/gu;
  return (paragraph.match(boundary) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function readBbcSubtitleTexts(value: string) {
  if (value.length > 750_000) return [];
  try { return parseBbcSubtitleCues(value).map(({ text }) => text); }
  catch { return []; }
}

function splitBbcPracticeParagraph(
  paragraph: string,
  matchSubtitle: ReturnType<typeof createBbcSubtitleSentenceMatcher>,
) {
  const matched = matchSubtitle(paragraph);
  const segments: ReturnType<typeof splitArticleSentences> = [];
  function appendGap(start: number, end: number) {
    for (const segment of splitArticleSentences(paragraph.slice(start, end))) {
      if (segment.text.trim()) segments.push({ ...segment, index: segments.length, start: start + segment.start, end: start + segment.end });
    }
  }

  let cursor = 0;
  for (const { start, end } of matched) {
    appendGap(cursor, start);
    const raw = paragraph.slice(start, end);
    const text = raw.trim();
    const trimmedStart = start + raw.search(/\S/u);
    segments.push({ text, start: trimmedStart, end: trimmedStart + text.length, index: segments.length });
    cursor = end;
  }
  appendGap(cursor, paragraph.length);
  return segments;
}

function buildPracticeSentences(body: string[], chineseParagraphs: string[], reviewWarnings?: string[], subtitleTexts: string[] = []) {
  let sentenceNo = 0;
  const matchSubtitle = createBbcSubtitleSentenceMatcher(subtitleTexts);
  return body.flatMap((paragraph, paragraphIndex) => {
    const englishWave = extractBbcWaveText(paragraph);
    const chineseWave = extractBbcWaveText(chineseParagraphs[paragraphIndex] ?? "");
    const englishSentences = splitBbcPracticeParagraph(englishWave.text, matchSubtitle);
    let chineseSentences = splitChineseSentences(chineseWave.text);
    if (subtitleTexts.length && englishSentences.length !== chineseSentences.length) {
      const joined = splitChineseSentences(chineseWave.text, true);
      if (joined.length === englishSentences.length) chineseSentences = joined;
    }
    const aligned = englishSentences.length === chineseSentences.length;
    if (!aligned) {
      const warning = `第 ${paragraphIndex + 1} 段有 ${englishSentences.length} 个英文句子、${chineseSentences.length} 个中文句子，逐句翻译待校对。`;
      if (!reviewWarnings) throw new Error(warning);
      if (chineseSentences.length) reviewWarnings.push(warning);
    }

    let chineseCursor = 0;
    return englishSentences.map(({ text, start: englishStart }, index) => {
      const english = text.trim();
      const chinese = aligned ? chineseSentences[index] : "";
      const chineseStart = chineseWave.text.indexOf(chinese, chineseCursor);
      chineseCursor = chineseStart + chinese.length;
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

function withoutSyntaxGuessing(text: string) {
  let automatic: ReturnType<typeof buildAutomaticBbcSyntax>;
  try { automatic = buildAutomaticBbcSyntax(text); }
  catch { automatic = buildUnclassifiedBbcSyntax(text); }
  return {
    ...automatic,
    tokens: automatic.tokens.map((token) => token.pos === "PUNCT"
      ? { ...token }
      : { ...token, pos: "X", posLabel: "待补标" }),
    level1: [],
    level2: [],
    level3: [],
    level4: [],
    level5: [],
    notes: [],
    status: "draft" as const,
  };
}

function buildArticle(payload: Record<string, unknown>, objectPath: string, allowIncomplete = false, subtitleTexts: string[] = []): BbcArticle | string {
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
  if (chineseResult.error && !allowIncomplete) return chineseResult.error;
  const chinese = typeof payload.chinese === "string" ? payload.chinese.trim() : "";
  const body = splitBbcArticleParagraphs(english, "en");
  const chineseParagraphs = splitBbcArticleParagraphs(chinese, "zh");
  const reviewWarnings: string[] = [];
  const paragraphsAligned = body.length === chineseParagraphs.length;
  if (!paragraphsAligned) {
    const warning = `英文原文有 ${body.length} 段，中文翻译有 ${chineseParagraphs.length} 段，译文段落待校对。`;
    if (!allowIncomplete) return warning;
    reviewWarnings.push(warning);
  }

  const parsedVocabulary = Array.isArray(payload.vocabulary)
    ? payload.vocabulary as BbcVocabularyItem[]
    : parseVocabulary(payload.vocabulary);
  const vocabularyWarning = typeof parsedVocabulary === "string"
    ? parsedVocabulary
    : parsedVocabulary.length > 300 || parsedVocabulary.some((item) => typeof item?.term !== "string" || !item.term.trim() || typeof item.entry !== "string" || !item.entry.trim())
      ? "词汇与短语内容格式无效或超过 300 条。"
      : payload.vocabularyWarning;
  if (typeof vocabularyWarning === "string") {
    if (!allowIncomplete) return vocabularyWarning;
    reviewWarnings.push(vocabularyWarning);
  }
  const vocabulary = typeof parsedVocabulary === "string" || vocabularyWarning ? [] : parsedVocabulary;
  const expectedPrefix = `bbc/${parsedDate.year}/${parsedDate.id}/`;
  if (objectPath && (!objectPath.startsWith(expectedPrefix) || !/^full(?:-[a-f0-9]{16})?\.mp3$/.test(objectPath.slice(expectedPrefix.length)))) return "音频存储路径与文章日期不匹配。";

  const fullAudioUrl = objectPath ? `/api/bbc-audio/${parsedDate.year}/${parsedDate.id}/${objectPath.slice(expectedPrefix.length)}` : undefined;
  const sentences = buildPracticeSentences(body, paragraphsAligned ? chineseParagraphs : [], allowIncomplete ? reviewWarnings : undefined, subtitleTexts);
  const syntaxAnnotations = Array.isArray(payload.syntaxAnnotations)
    ? payload.syntaxAnnotations as PastedBbcSyntaxSentence[]
    : [];
  if (typeof payload.syntaxWarning === "string" && payload.syntaxWarning.trim()) {
    reviewWarnings.push(payload.syntaxWarning.trim());
  }
  const warn = (warning: string) => reviewWarnings.push(warning);
  const matchingSyntax = matchPastedBbcSyntax(
    syntaxAnnotations.filter((annotation) => annotation && typeof annotation.text === "string" && Array.isArray(annotation.items)),
    sentences.map((sentence) => sentence.english),
    warn,
  );
  const syntaxSentences = sentences.map((sentence, index) => {
    const annotation = matchingSyntax.get(index);
    try {
      if (annotation) {
        const annotated = applyPastedBbcSyntax(withoutSyntaxGuessing(sentence.english), [annotation], undefined, warn);
        if (annotated.status === "reviewed" || annotated.notes?.length) return annotated;
      }
      return buildAutomaticBbcSyntax(sentence.english);
    } catch {
      warn(`第 ${sentence.sentenceNo} 句的语法标注待核对，可在后台编辑。`);
      return buildUnclassifiedBbcSyntax(sentence.english);
    }
  });
  return {
    ...(fullAudioUrl ? { audioUrl: fullAudioUrl, fullAudioUrl } : {}),
    body: body.map((paragraph) => extractBbcWaveText(paragraph).text),
    chineseParagraphs: chineseParagraphs.map((paragraph) => extractBbcWaveText(paragraph).text),
    paragraphUnderlines: body.map((paragraph, index) => ({ english: extractBbcWaveText(paragraph).ranges, chinese: extractBbcWaveText(chineseParagraphs[index] ?? "").ranges })),
    date: parsedDate.date,
    id: parsedDate.id,
    lead: titleChinese,
    reviewWarnings: [...new Set(reviewWarnings)],
    sentences,
    syntaxSentences,
    title,
    titleChinese: titleChinese || undefined,
    vocabulary,
    year: parsedDate.year,
  };
}

type SentenceAudioRange = { startMs: number; endMs: number };

function readSentenceAudioRange(value: unknown): SentenceAudioRange | null {
  if (!value || typeof value !== "object") return null;
  const { startMs, endMs } = value as Partial<SentenceAudioRange>;
  return typeof startMs === "number" && typeof endMs === "number"
    && Number.isSafeInteger(startMs) && Number.isSafeInteger(endMs) && startMs >= 0 && endMs > startMs
    ? { startMs, endMs } : null;
}

function sentenceAudioPath(objectPath: string, sentenceNo: number, range?: SentenceAudioRange | null) {
  const match = /^(bbc\/(\d{4})\/(\d{6}))\/full-([a-f0-9]{16})\.mp3$/.exec(objectPath);
  if (!match || !Number.isInteger(sentenceNo) || sentenceNo < 1 || sentenceNo > 500) return null;
  return `${match[1]}/sentences/${match[4]}/${match[3]}-${String(sentenceNo).padStart(3, "0")}${range ? `-${range.startMs}-${range.endMs}` : ""}.mp3`;
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
    const parsed = parseBbcArticlePaste(payload.text, payload.allowIncomplete === true);
    if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
    try {
      const articleDate = parseBbcArticleDateFromTitle(parsed.dateTitle);
      if (!articleDate) return NextResponse.json({ error: "标题缺少有效日期。" }, { status: 400 });
      const subtitleTexts = typeof payload.subtitleText === "string" ? readBbcSubtitleTexts(payload.subtitleText) : [];
      if (!subtitleTexts.length) {
        const existing = await supabase.from("bbc_uploaded_articles").select("article").eq("id", articleDate.id).maybeSingle();
        if (existing.error) return NextResponse.json({ error: "暂时无法读取已保存的文章分句。" }, { status: 503 });
        const previous = existing.data?.article as BbcArticle | undefined;
        subtitleTexts.push(...(previous?.sentences ?? []).map(({ english }) => english));
      }
      const article = buildArticle(parsed, "", payload.allowIncomplete === true, subtitleTexts);
      if (typeof article === "string") return NextResponse.json({ error: article }, { status: 400 });
      if (getBbcArticleById(article.id)) return NextResponse.json({ error: "内置文章正文由原有内容库维护，语法标注请在前端精读页面修改。" }, { status: 409 });
      if (payload.quiz != null) {
        const quiz = normalizeBbcPdfQuiz(payload.quiz, article.id, article.title, article.body.length);
        if (typeof quiz === "string") return NextResponse.json({ error: quiz }, { status: 400 });
        article.quiz = quiz;
      }
      return NextResponse.json({ article });
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
    const requested = new Map<number, string>();
    for (const file of files) {
      const sentenceNo = file?.sentenceNo;
      const size = file?.size;
      const range = readSentenceAudioRange(file);
      const path = sentenceAudioPath(objectPath, sentenceNo, range);
      if (!path || requested.has(sentenceNo) || !Number.isSafeInteger(size) || size < 128 || size > maxAudioBytes
        || ((file?.startMs !== undefined || file?.endMs !== undefined) && !range)) {
        return NextResponse.json({ error: "小音频的句号、时间或文件大小无效。" }, { status: 400 });
      }
      requested.set(sentenceNo, path);
      totalBytes += size;
    }
    if (totalBytes > maxAudioBytes || !await hasR2Object(objectPath)) return NextResponse.json({ error: "小音频总量超过 200 MB，或原声尚未上传完成。" }, { status: 400 });
    const tickets = Array.from(requested, ([sentenceNo, path]) => ({
      sentenceNo, objectPath: path, headers: { "Content-Type": "audio/mpeg" }, uploadUrl: getPresignedPutUrl(path),
    }));
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

function getStoredAudioPath(article: BbcArticle | null | undefined) {
  if (!article?.fullAudioUrl) return "";
  const prefix = `/api/bbc-audio/${article.year}/${article.id}/`;
  if (!article.fullAudioUrl.startsWith(prefix) || !/^full(?:-[a-f0-9]{16})?\.mp3$/.test(article.fullAudioUrl.slice(prefix.length))) return "";
  return article.fullAudioUrl.replace(/^\/api\/bbc-audio\//, "bbc/");
}

function reuseExistingBbcAudioTimings(article: BbcArticle, existing: BbcArticle | null, objectPath: string) {
  if (!existing || !objectPath || getStoredAudioPath(existing) !== objectPath) return null;
  const existingSentences = existing.sentences ?? [];
  const currentSentences = article.sentences ?? [];
  const durationMs = existing.audioDurationMs;
  if (!Number.isInteger(durationMs) || !durationMs || existingSentences.length !== currentSentences.length) return null;
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
  const publishNow = payload.publish === true;
  const allowIncomplete = publishNow || payload.allowIncomplete === true;
  const parsedPaste = typeof payload.text === "string" ? parseBbcArticlePaste(payload.text, allowIncomplete) : null;
  if (typeof parsedPaste === "string") return NextResponse.json({ error: parsedPaste }, { status: 400 });
  const articlePayload = parsedPaste ? { ...parsedPaste } : payload;
  const title = typeof articlePayload.title === "string" ? articlePayload.title : "";
  const dateTitle = typeof articlePayload.dateTitle === "string" ? articlePayload.dateTitle : title;
  const articleDate = parseBbcArticleDateFromTitle(dateTitle);
  if (!articleDate) return NextResponse.json({ error: "标题中需要包含有效日期数字，例如 260727 或 20260727。" }, { status: 400 });
  if (getBbcArticleById(articleDate.id)) {
    return NextResponse.json({ error: `BBC 文章 ${articleDate.id} 已存在于内置文章库，不能从此处覆盖。` }, { status: 409 });
  }

  const audioPrefix = `bbc/${articleDate.year}/${articleDate.id}/`;
  const requestedAudioPath = typeof payload.objectPath === "string"
    ? payload.objectPath
    : !allowIncomplete && parsedPaste ? `${audioPrefix}full.mp3` : "";
  const validAudioPath = requestedAudioPath.startsWith(audioPrefix) && /^full(?:-[a-f0-9]{16})?\.mp3$/.test(requestedAudioPath.slice(audioPrefix.length));
  const existingArticleResult = await supabase.from("bbc_uploaded_articles").select("article,published,created_at").eq("id", articleDate.id).maybeSingle();
  if (existingArticleResult.error) return NextResponse.json({ error: `保存前无法读取文章状态：${existingArticleResult.error.message}` }, { status: 503 });
  const existingArticle = existingArticleResult.data;
  const previousArticle = existingArticle?.article as BbcArticle | undefined;
  const subtitleTexts = typeof payload.subtitleText === "string" ? readBbcSubtitleTexts(payload.subtitleText) : [];
  const sentenceTexts = subtitleTexts.length ? subtitleTexts : (previousArticle?.sentences ?? []).map(({ english }) => english);
  let article: BbcArticle | string;
  try { article = buildArticle(articlePayload, allowIncomplete ? "" : requestedAudioPath, allowIncomplete, sentenceTexts); }
  catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "文章分析失败。" }, { status: 400 }); }
  if (typeof article === "string") return NextResponse.json({ error: article }, { status: 400 });
  const previousAudioPath = getStoredAudioPath(previousArticle);
  const audioAvailable = validAudioPath && (
    (allowIncomplete && requestedAudioPath === previousAudioPath) || await hasR2Object(requestedAudioPath)
  );
  if (!allowIncomplete && !audioAvailable) {
    return NextResponse.json({ error: "请先上传本篇 MP3，再保存自动对齐的草稿。" }, { status: 400 });
  }

  const reviewWarnings = article.reviewWarnings ?? [];
  if (typeof payload.subtitleText === "string" && !subtitleTexts.length) {
    reviewWarnings.push("字幕中没有可用的英文条目，已根据现有分句和文章正文处理。");
  }
  const objectPath = audioAvailable ? requestedAudioPath : previousAudioPath;
  if (allowIncomplete) {
    if (requestedAudioPath && !audioAvailable) {
      reviewWarnings.push(previousAudioPath ? "新 MP3 暂未上传成功，已保留原有音频。" : "MP3 暂未上传成功，可稍后补传。");
    }
    if (objectPath) {
      article.audioUrl = article.fullAudioUrl = objectPath.replace(/^bbc\//, "/api/bbc-audio/");
    }
  }

  const quizInput = payload.quiz === undefined ? previousArticle?.quiz : payload.quiz;
  if (quizInput != null) {
    const quiz = normalizeBbcPdfQuiz(quizInput, article.id, article.title, article.body.length, allowIncomplete);
    if (typeof quiz === "string") {
      if (!allowIncomplete) return NextResponse.json({ error: quiz }, { status: 400 });
      reviewWarnings.push(quiz);
      if (previousArticle?.quiz && quizInput !== previousArticle.quiz) {
        const previousQuiz = normalizeBbcPdfQuiz(previousArticle.quiz, article.id, article.title, article.body.length, true);
        if (typeof previousQuiz !== "string") article.quiz = previousQuiz;
      }
    } else {
      article.quiz = quiz;
    }
  }
  if (allowIncomplete) {
    const useSuppliedAudio = Boolean(objectPath && requestedAudioPath === objectPath && audioAvailable);
    const suppliedDuration = useSuppliedAudio ? Number(payload.durationMs) : 0;
    const durationMs = Number.isSafeInteger(suppliedDuration) && suppliedDuration > 0
      ? suppliedDuration : objectPath === previousAudioPath ? previousArticle?.audioDurationMs : undefined;
    if (durationMs && objectPath) article.audioDurationMs = durationMs;

    const sentences = article.sentences ?? [];
    const reused = reuseExistingBbcAudioTimings(article, previousArticle ?? null, objectPath);
    function acceptRange(row: unknown) {
      const range = readSentenceAudioRange(row);
      return range && (!durationMs || range.endMs <= durationMs) ? range : null;
    }
    reused?.timings.forEach((row, index) => {
      const range = acceptRange(row);
      if (range) Object.assign(sentences[index], range, { audioUrl: row.audioUrl ?? article.fullAudioUrl });
    });
    if (useSuppliedAudio && Array.isArray(payload.timings)) {
      const supplied = new Map<number, SentenceAudioRange>();
      for (const row of payload.timings.slice(0, 500)) {
        const range = acceptRange(row);
        if (!range || !Number.isSafeInteger(row?.sentenceNo) || row.sentenceNo < 1 || row.sentenceNo > sentences.length) continue;
        const sentence = sentences[row.sentenceNo - 1];
        supplied.set(row.sentenceNo, range);
        if (sentence.startMs !== range.startMs || sentence.endMs !== range.endMs) {
          Object.assign(sentence, range, { audioUrl: article.fullAudioUrl });
        }
      }
      const files = new Map<number, string>();
      for (const row of Array.isArray(payload.sentenceAudioFiles) ? payload.sentenceAudioFiles.slice(0, 500) : []) {
        const range = supplied.get(row?.sentenceNo);
        if (!range) continue;
        const path = sentenceAudioPath(objectPath, row.sentenceNo, range);
        if (path && row.objectPath === path) files.set(row.sentenceNo, path);
      }
      const signal = AbortSignal.timeout(8_000);
      const entries = [...files];
      for (let first = 0; first < entries.length && !signal.aborted; first += 8) {
        await Promise.all(entries.slice(first, first + 8).map(async ([sentenceNo, path]) => {
          if (await hasR2Object(path, signal)) sentences[sentenceNo - 1].audioUrl = path.replace(/^bbc\//, "/api/bbc-audio/");
        }));
      }
    }
    if (sentences.length && sentences.every((sentence, index) => sentence.endMs > sentence.startMs
      && (!index || sentence.startMs >= sentences[index - 1].endMs))) {
      article.subtitleUrl = `/api/bbc-subtitles/${article.id}`;
    }
  } else {
    let timings = payload.timings;
    let durationMs = Number(payload.durationMs);
    const reusingAudio = !Array.isArray(timings);
    if (!Array.isArray(timings)) {
      const reused = reuseExistingBbcAudioTimings(article, previousArticle ?? null, objectPath);
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
  }
  let previousSyntax = previousArticle?.syntaxSentences
    ?? previousArticle?.sentences?.map(({ english }) => buildAutomaticBbcSyntax(english)) ?? [];
  let createdAt = new Date().toISOString();
  if (existingArticle && previousSyntax.length) {
    const overrides = await supabase.from("bbc_article_syntax_overrides").select("sentences,updated_at").eq("article_id", article.id).maybeSingle();
    if (overrides.error && !["42P01", "PGRST205"].includes(overrides.error.code)) {
      const warning = "暂时无法读取前端保存的语法标注。";
      if (!allowIncomplete) return NextResponse.json({ error: warning }, { status: 503 });
      reviewWarnings.push(warning);
      createdAt = existingArticle.created_at;
    }
    if (overrides.data && Date.parse(overrides.data.updated_at) >= Date.parse(existingArticle.created_at)) {
      previousSyntax = normalizeBbcSyntaxSentenceEdits(overrides.data.sentences, previousSyntax) ?? previousSyntax;
    }
  }
  article.syntaxSentences = retainReviewedBbcSyntax(article.syntaxSentences ?? [], previousSyntax);
  const suppliedReviewWarnings = Array.isArray(payload.reviewWarnings)
    ? payload.reviewWarnings
      .filter((warning): warning is string => typeof warning === "string" && warning.trim().length > 0)
      .map((warning) => warning.trim().slice(0, 240))
    : [];
  article.reviewWarnings = [...new Set([
    ...reviewWarnings,
    ...suppliedReviewWarnings,
  ])].slice(0, 30);

  const published = publishNow || existingArticle?.published === true;

  const { error } = await supabase.from("bbc_uploaded_articles").upsert({
    article,
    created_at: createdAt,
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
  const phraseVocabulary = published
    ? await syncPublishedPhraseVocabulary(supabase, admin.user.id, article)
    : { added: 0, updated: 0, warning: "" };
  return NextResponse.json({
    article,
    articleId: article.id,
    audioIncluded: Boolean(article.fullAudioUrl),
    href: `/articles/${article.id}`,
    published,
    month: articleDate.month,
    objectPath: objectPath || null,
    ok: true,
    reviewWarnings: article.reviewWarnings,
    timingsComplete: Boolean(article.subtitleUrl),
    paragraphCount: article.body.length,
    vocabularyCount: article.vocabulary?.length ?? 0,
    sentenceCount: article.sentences?.length ?? 0,
    timedSentenceCount: article.sentences?.filter((sentence) => sentence.endMs > sentence.startMs).length ?? 0,
    sentenceAudioCount: article.sentences?.filter((sentence) => sentence.audioUrl && sentence.audioUrl !== article.fullAudioUrl).length ?? 0,
    phraseVocabularyAdded: phraseVocabulary.added,
    phraseVocabularyUpdated: phraseVocabulary.updated,
    phraseVocabularyWarning: phraseVocabulary.warning,
    year: article.year,
  });
}

function removeBbcSentence(article: BbcArticle, index: number) {
  const sentences = article.sentences;
  if (!sentences?.[index] || sentences.length < 2) return "一篇文章至少要保留一个句子。";
  const matchSubtitle = createBbcSubtitleSentenceMatcher(sentences.map(({ english }) => english));

  const body = [...article.body];
  const chinese = [...(article.chineseParagraphs ?? [])];
  const underlines = article.paragraphUnderlines?.map((row) => ({ ...row }));
  const warnings: string[] = [];
  const alignedParagraphs = chinese.length === body.length;
  let offset = 0;
  let found = false;

  function cut(text: string, segments: { start: number; end: number }[], localIndex: number, ranges: { start: number; end: number }[] = []) {
    const current = segments[localIndex];
    const next = segments[localIndex + 1];
    const previous = segments[localIndex - 1];
    const start = next || !previous ? current.start : previous.end;
    const end = next?.start ?? current.end;
    const shift = (position: number) => position <= start ? position : Math.max(start, position - (end - start));
    return {
      text: text.slice(0, start) + text.slice(end),
      ranges: ranges.map((range) => ({ start: shift(range.start), end: shift(range.end) })).filter((range) => range.start < range.end),
    };
  }

  for (const [paragraphIndex, paragraph] of body.entries()) {
    const english = splitBbcPracticeParagraph(paragraph, matchSubtitle);
    const localIndex = index - offset;
    offset += english.length;
    if (!english[localIndex]) continue;
    if (english[localIndex].text.trim() !== sentences[index].english) return "正文与句子列表不一致，请重新打开文章后再试。";
    found = true;
    if (english.length === 1) {
      body.splice(paragraphIndex, 1);
      underlines?.splice(paragraphIndex, 1);
      if (alignedParagraphs) chinese.splice(paragraphIndex, 1);
      else if (chinese.length) warnings.push("原文和译文段落数不一致，请检查译文。");
      if (article.quiz) warnings.push("已移除整段正文，请核对 PDF 练习中的段落编号。");
    } else {
      const ranges = underlines?.[paragraphIndex];
      const updated = cut(paragraph, english, localIndex, ranges?.english);
      body[paragraphIndex] = updated.text;
      if (ranges) ranges.english = updated.ranges;
      const translation = alignedParagraphs ? chinese[paragraphIndex] : "";
      let translations = splitChineseSentences(translation);
      if (translations.length !== english.length) translations = splitChineseSentences(translation, true);
      if (translations.length === english.length && translations[localIndex] === sentences[index].chinese) {
        let cursor = 0;
        const segments = translations.map((text) => {
          const start = translation.indexOf(text, cursor);
          cursor = start + text.length;
          return { start, end: cursor };
        });
        const updatedChinese = cut(translation, segments, localIndex, ranges?.chinese);
        chinese[paragraphIndex] = updatedChinese.text;
        if (ranges) ranges.chinese = updatedChinese.ranges;
      } else if (translation || (!alignedParagraphs && chinese.length)) {
        warnings.push("这句没有可确认的对应译文，请检查译文。");
      }
    }
    break;
  }
  if (!found) return "在正文中找不到这句话，请重新打开文章后再试。";

  article.body = body;
  article.chineseParagraphs = chinese;
  article.paragraphUnderlines = underlines;
  article.sentences = sentences.filter((_, position) => position !== index).map((sentence, position) => ({ ...sentence, sentenceNo: position + 1 }));
  article.syntaxSentences = article.syntaxSentences?.filter((_, position) => position !== index).map((sentence, position) => sentence.sourceAnnotation
    ? { ...sentence, sourceAnnotation: sentence.sourceAnnotation.replace(/^(##[ \t]*句[ \t]*)\d+/m, (_, heading) => `${heading}${position + 1}`) }
    : sentence);
  if (article.fullAudioUrl && article.sentences.every((sentence) => sentence.endMs > sentence.startMs)) article.subtitleUrl = `/api/bbc-subtitles/${article.id}`;
  article.reviewWarnings = [...new Set([...warnings, ...(article.reviewWarnings ?? [])])].slice(0, 30);
  return warnings;
}

async function editPublishedVocabulary(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { articleId, operation, index } = payload;
  if (typeof articleId !== "string" || !/^\d{6}$/.test(articleId) ||
    (operation !== "save" && operation !== "delete") ||
    typeof index !== "number" || !Number.isInteger(index) || index < -1 ||
    (operation === "delete" && index < 0)) {
    return NextResponse.json({ error: "词汇编辑请求无效。" }, { status: 400 });
  }

  let article = getBbcArticleById(articleId);
  if (!article) {
    const uploaded = await supabase.from("bbc_uploaded_articles")
      .select("article").eq("id", articleId).eq("published", true).maybeSingle();
    if (uploaded.error) return NextResponse.json({ error: "暂时无法读取文章。" }, { status: 503 });
    article = uploaded.data?.article as BbcArticle | undefined;
  }
  if (!article) return NextResponse.json({ error: "已发布文章不存在。" }, { status: 404 });

  const table = supabase.from("managed_content_pages");
  const slug = `bbc-article-${articleId}`;
  const { data: row, error: readError } = await table.select("meta_json,status,updated_at").eq("slug", slug).maybeSingle();
  if (readError) return NextResponse.json({ error: "暂时无法读取词汇表。" }, { status: 503 });
  if (row && row.status !== "published") {
    return NextResponse.json({ error: "这篇文章有待发布的内容修改，请先处理该草稿。" }, { status: 409 });
  }
  const vocabulary = [...(getBbcArticleContentOverride(row?.meta_json)?.vocabulary ??
    mergeBbcVocabularyItems(article.vocabulary, getBbcEffectiveVocabularyById(articleId) ?? []))];
  const existing = vocabulary[index];
  const previous = payload.previous as { term?: unknown; entry?: unknown; definition?: unknown } | null;
  const conflict = () => NextResponse.json({ error: "词汇表已变化，请刷新文章后再试。" }, { status: 409 });
  if (index >= 0 && (!existing || previous?.term !== existing.term || previous.entry !== existing.entry ||
    previous.definition !== (existing.definition ?? ""))) return conflict();

  if (operation === "delete") {
    vocabulary.splice(index, 1);
  } else {
    if (index < 0 && vocabulary.length >= 300) {
      return NextResponse.json({ error: "词汇表最多可保存 300 项。" }, { status: 400 });
    }
    const term = readText(payload.term, "词汇或短语", 160);
    const definition = readText(payload.definition, "释义", 600);
    if ("error" in term || "error" in definition) {
      return NextResponse.json({ error: term.error ?? definition.error }, { status: 400 });
    }
    const key = normalizeBbcVocabularyTerm(term.value);
    if (!key || /[|\r\n\t]/.test(term.value) || /[\r\n]/.test(definition.value)) {
      return NextResponse.json({ error: "请在同一行填写词汇和释义，词汇中不要使用竖线。" }, { status: 400 });
    }
    if (vocabulary.some((item, itemIndex) => itemIndex !== index &&
      (normalizeBbcVocabularyTerm(item.term) === key || normalizeBbcVocabularyTerm(item.lemma ?? "") === key))) {
      return NextResponse.json({ error: "词汇表中已有这个词汇。" }, { status: 409 });
    }
    const selectedText = typeof payload.selectedText === "string" ? payload.selectedText.trim().slice(0, 160) : "";
    const item: BbcVocabularyItem = {
      ...existing,
      number: existing?.number ?? vocabulary.length + 1,
      term: term.value,
      entry: existing?.term === term.value ? existing.entry : `${term.value} ${definition.value}`,
      lemma: existing?.term === term.value ? existing.lemma : term.value,
      highlight: existing?.highlight ?? true,
      highlightTerm: existing?.highlightTerm || existing?.term || selectedText || term.value,
      example: existing?.example ?? "",
      definition: definition.value,
      translation: definition.value,
    };
    if (index < 0) vocabulary.push(item);
    else vocabulary[index] = item;
  }

  const updatedVocabulary = vocabulary.map((item, itemIndex) => ({ ...item, number: itemIndex + 1 }));
  const meta_json = { ...row?.meta_json, vocabulary: updatedVocabulary };
  const now = new Date(Math.max(Date.now(), (Date.parse(row?.updated_at ?? "") || 0) + 1)).toISOString();
  const write = row
    ? table.update({ meta_json, updated_at: now }).eq("slug", slug).eq("status", "published")
    : table.insert({ slug, template_key: "foreign_article_page", module: "articles", title: article.title,
      status: "published", published_at: now, meta_json });
  if (row) {
    if (row.updated_at == null) write.is("updated_at", null);
    else write.eq("updated_at", row.updated_at);
  }
  const { data: saved, error: writeError } = await write.select("slug").maybeSingle();
  if (writeError?.code === "23505" || (!writeError && !saved)) return conflict();
  if (writeError) return NextResponse.json({ error: "词汇保存失败，请稍后再试。" }, { status: 503 });
  revalidatePath(`/articles/${articleId}`);
  return NextResponse.json({ ok: true, vocabulary: updatedVocabulary });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "后台内容服务尚未配置。" }, { status: 500 });
  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = payload?.action;
  if (payload && action === "editVocabulary") return editPublishedVocabulary(supabase, payload);
  if (payload && (action === "deleteSentence" || action === "deleteVocabulary" || action === "addVocabulary")) {
    const articleId = typeof payload.articleId === "string" ? payload.articleId : "";
    if (!/^\d{6}$/.test(articleId)) return NextResponse.json({ error: "文章编号无效。" }, { status: 400 });
    if (getBbcArticleById(articleId)) return NextResponse.json({ error: "内置文章不能通过上传后台编辑。" }, { status: 409 });
    const table = supabase.from("bbc_uploaded_articles");
    const existing = await table.select("article,created_at").eq("id", articleId).maybeSingle();
    if (existing.error) return NextResponse.json({ error: "暂时无法读取上传文章。" }, { status: 503 });
    if (!existing.data) return NextResponse.json({ error: "上传文章不存在。" }, { status: 404 });
    const article = existing.data.article as BbcArticle;
    let warnings: string[] = [];
    let createdAt: string | undefined;

    if (action === "deleteSentence") {
      const index = Number(payload.sentenceNo) - 1;
      const sentence = article.sentences?.[index];
      if (!Number.isInteger(index) || !sentence || sentence.english !== payload.english) {
        return NextResponse.json({ error: "句子已变化，请重新打开文章后再试。" }, { status: 409 });
      }
      if (article.syntaxSentences?.length) {
        const overrides = await supabase.from("bbc_article_syntax_overrides").select("sentences,updated_at").eq("article_id", articleId).maybeSingle();
        if (overrides.error && !["42P01", "PGRST205"].includes(overrides.error.code)) {
          return NextResponse.json({ error: "暂时无法读取前端语法标注，请稍后再试。" }, { status: 503 });
        }
        if (overrides.data && Date.parse(overrides.data.updated_at) >= Date.parse(existing.data.created_at)) {
          article.syntaxSentences = normalizeBbcSyntaxSentenceEdits(overrides.data.sentences, article.syntaxSentences) ?? article.syntaxSentences;
        }
        // Any older override still contains the deleted sentence.
        const latest = Math.max(Date.parse(existing.data.created_at), overrides.data ? Date.parse(overrides.data.updated_at) : 0);
        createdAt = new Date(Math.max(Date.now(), latest + 1)).toISOString();
      }
      const removed = removeBbcSentence(article, index);
      if (typeof removed === "string") return NextResponse.json({ error: removed }, { status: 400 });
      warnings = removed;
    } else {
      const vocabulary = [...(article.vocabulary ?? [])];
      if (action === "deleteVocabulary") {
        const index = payload.index;
        if (typeof index !== "number" || !Number.isInteger(index) || !vocabulary[index] || vocabulary[index].term !== payload.term) {
          return NextResponse.json({ error: "词汇表已变化，请重新打开文章后再试。" }, { status: 409 });
        }
        vocabulary.splice(index, 1);
      } else {
        const term = readText(payload.term, "词汇或短语", 160);
        const definition = readText(payload.definition, "释义", 600);
        if ("error" in term || "error" in definition) return NextResponse.json({ error: term.error ?? definition.error }, { status: 400 });
        const key = normalizeBbcVocabularyTerm(term.value);
        if (!key || /[|\r\n\t]/.test(term.value) || /[\r\n]/.test(definition.value)) {
          return NextResponse.json({ error: "请在同一行填写词汇和释义，词汇中不要使用竖线。" }, { status: 400 });
        }
        if (vocabulary.some((item) => normalizeBbcVocabularyTerm(item.lemma || item.term) === key)) {
          return NextResponse.json({ error: "这条词汇已在词汇表中。" }, { status: 409 });
        }
        if (vocabulary.length >= 300) return NextResponse.json({ error: "一篇文章最多添加 300 条词汇或短语。" }, { status: 400 });
        vocabulary.push({ entry: `${term.value} | ${definition.value}`, definition: definition.value, example: "", number: 0, term: term.value, translation: "" });
      }
      article.vocabulary = vocabulary.map((item, index) => ({ ...item, number: index + 1 }));
    }

    const result = await table.update({ article, ...(createdAt ? { created_at: createdAt } : {}) })
      .eq("id", articleId).eq("created_at", existing.data.created_at).select("id").maybeSingle();
    if (result.error) return NextResponse.json({ error: "文章修改未保存，请重试。" }, { status: 500 });
    if (!result.data) return NextResponse.json({ error: "文章已变化，请重新打开后再试。" }, { status: 409 });
    revalidatePath("/articles");
    revalidatePath(`/articles/${articleId}`);
    return NextResponse.json({ ok: true, article, warnings });
  }
  if (payload?.action === "publish") {
    const articleId = typeof payload.articleId === "string" ? payload.articleId : "";
    if (!/^\d{6}$/.test(articleId)) return NextResponse.json({ error: "文章编号无效。" }, { status: 400 });
    if (getBbcArticleById(articleId)) return NextResponse.json({ error: "内置文章不能通过上传后台发布。" }, { status: 409 });
    const existing = await supabase.from("bbc_uploaded_articles").select("article").eq("id", articleId).maybeSingle();
    if (existing.error || !existing.data) return NextResponse.json({ error: "草稿文章不存在。" }, { status: 404 });
    const article = existing.data.article as BbcArticle;
    const { error } = await supabase.from("bbc_uploaded_articles").update({ published: true }).eq("id", articleId);
    if (error) return NextResponse.json({ error: `发布失败：${error.message}` }, { status: 500 });
    const phraseVocabulary = await syncPublishedPhraseVocabulary(supabase, admin.user.id, article);
    revalidatePath("/articles");
    revalidatePath(`/articles/${articleId}`);
    return NextResponse.json({
      ok: true,
      published: true,
      articleId,
      phraseVocabularyAdded: phraseVocabulary.added,
      phraseVocabularyUpdated: phraseVocabulary.updated,
      phraseVocabularyWarning: phraseVocabulary.warning,
    });
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
  const isTimed = (sentence: (typeof sentences)[number]) => sentence.endMs > sentence.startMs;
  const previous = sentences.slice(0, index).reverse().find(isTimed);
  const next = sentences.slice(index + 1).find(isTimed);
  if (startMs < 0 || endMs <= startMs || endMs > durationMs
    || (previous && startMs < previous.endMs) || (next && endMs > next.startMs)) {
    return NextResponse.json({ error: "调整后的时间必须位于音频范围内，且不能与相邻句子重叠。" }, { status: 400 });
  }
  sentences[index] = { ...sentences[index], startMs, endMs, audioUrl: article.fullAudioUrl };
  if (sentences.every(isTimed)) article.subtitleUrl = `/api/bbc-subtitles/${articleId}`;
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
    const result = await supabase.from("bbc_uploaded_articles").select("article,published").eq("id", id).maybeSingle();
    if (result.error || !result.data) return NextResponse.json({ error: "上传文章不存在。" }, { status: 404 });
    const article = result.data.article as BbcArticle;
    return NextResponse.json({ article, published: result.data.published, objectPath: getStoredAudioPath(article) || null });
  }
  const result = await supabase.from("bbc_uploaded_articles").select("id,year,created_at,published,title:article->>title").order("created_at", { ascending: false }).limit(200);
  if (result.error) return NextResponse.json({ error: "文章列表暂时无法读取。" }, { status: 503 });
  return NextResponse.json({ articles: result.data });
}
