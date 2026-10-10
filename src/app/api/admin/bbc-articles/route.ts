import { createHash, createHmac } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { splitArticleSentences } from "@/lib/article-inline-annotations";
import { getBbcArticleById } from "@/lib/articles/bbc";
import { parseBbcArticleDateFromTitle, parseBbcArticlePaste, splitBbcArticleParagraphs } from "@/lib/articles/bbc-article-upload";
import type { BbcArticle, BbcVocabularyItem } from "@/lib/articles/bbc";

export const runtime = "nodejs";

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

function getPresignedPutUrl(objectPath: string) {
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
    "PUT",
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
    const englishSentences = splitArticleSentences(paragraph).map(({ text }) => text.trim()).filter(Boolean);
    const chineseSentences = splitChineseSentences(chineseParagraphs[paragraphIndex] ?? "");
    const aligned = englishSentences.length === chineseSentences.length;
    const units = aligned
      ? englishSentences.map((english, index) => ({ chinese: chineseSentences[index], english }))
      : [{ chinese: chineseParagraphs[paragraphIndex] ?? "", english: paragraph }];

    return units.map(({ chinese, english }) => ({
      chinese,
      endMs: 0,
      english,
      sentenceNo: ++sentenceNo,
      startMs: 0,
    }));
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
  const expectedObjectPath = `bbc/${parsedDate.year}/${parsedDate.id}/full.mp3`;
  if (objectPath && objectPath !== expectedObjectPath) return "音频存储路径与文章日期不匹配。";

  const fullAudioUrl = objectPath ? `/api/bbc-audio/${parsedDate.year}/${parsedDate.id}/full.mp3` : undefined;
  return {
    ...(fullAudioUrl ? { audioUrl: fullAudioUrl, fullAudioUrl } : {}),
    body,
    chineseParagraphs,
    date: parsedDate.date,
    id: parsedDate.id,
    lead: titleChinese,
    sentences: buildPracticeSentences(body, chineseParagraphs),
    title,
    titleChinese: titleChinese || undefined,
    vocabulary,
    year: parsedDate.year,
  };
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "后台服务尚未配置 Supabase 管理密钥。" }, { status: 500 });
  const admin = await requireAdmin(request, supabase);
  if ("response" in admin) return admin.response;

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = typeof payload?.title === "string" ? payload.title : "";
  const articleDate = parseBbcArticleDateFromTitle(title);
  if (!articleDate) return NextResponse.json({ error: "标题中需要包含有效日期数字，例如 260727 或 20260727。" }, { status: 400 });
  if (getBbcArticleById(articleDate.id)) {
    return NextResponse.json({ error: `BBC 文章 ${articleDate.id} 已存在于内置文章库，不能从此处覆盖。` }, { status: 409 });
  }

  const action = payload?.action;
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

    const objectPath = `bbc/${articleDate.year}/${articleDate.id}/full.mp3`;
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
  const article = buildArticle(articlePayload, objectPath);
  if (typeof article === "string") return NextResponse.json({ error: article }, { status: 400 });

  const { error } = await supabase.from("bbc_uploaded_articles").upsert({
    article,
    created_at: new Date().toISOString(),
    id: article.id,
    month: articleDate.month,
    published: true,
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
    month: articleDate.month,
    ok: true,
    paragraphCount: article.body.length,
    vocabularyCount: article.vocabulary?.length ?? 0,
    year: article.year,
  });
}
