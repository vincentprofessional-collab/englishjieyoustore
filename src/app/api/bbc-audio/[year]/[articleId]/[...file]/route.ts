import { createHash, createHmac } from "node:crypto";
import { getBbcArticleById } from "@/lib/articles/bbc";
import { getUploadedBbcArticle, getUploadedBbcArticleForAdmin } from "@/lib/articles/bbc-uploaded-content";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { localBbcAudioResponse, resolveLocalBbcAudio } from "@/lib/articles/bbc-local-audio";
import { getPaidContentKey } from "@/lib/access-control";
import { claimPaidContentAccess } from "@/lib/free-preview-access-server";
import { isFreeBbc2015ArticleUnlocked } from "@/lib/articles/bbc-free-access.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bucket = process.env.R2_BBC_AUDIO_BUCKET || "englishjieyou-bbc-audio";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function encodePathPart(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function signedR2Url(key: string) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_BBC_AUDIO_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_BBC_AUDIO_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const uri = `/${bucket}/${key.split("/").map(encodePathPart).join("/")}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const query: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", "3600"],
    ["X-Amz-SignedHeaders", "host"],
  ];
  const canonicalQuery = query
    .map(([name, value]) => [encodePathPart(name), encodePathPart(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  const canonicalRequest = [
    "GET",
    uri,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), "auto"), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return `https://${host}${uri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ year: string; articleId: string; file: string[] }> },
) {
  const { year, articleId, file } = await params;
  const builtinArticle = getBbcArticleById(articleId);
  let article = builtinArticle ?? await getUploadedBbcArticle(articleId);
  let adminDraftPreview = false;
  if (!builtinArticle && !article) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (profile?.role === "admin") {
          const record = await getUploadedBbcArticleForAdmin(articleId);
          article = record?.article ?? null;
          adminDraftPreview = Boolean(record && !record.published);
        }
      }
    } catch {
      article = null;
    }
  }
  const audioFile = file.join("/");

  if (
    !article ||
    String(article.year) !== year ||
    (article.fullAudioUrl?.split("/").pop() !== audioFile &&
      !article.sentences?.some((sentence) =>
        sentence.audioUrl?.endsWith(`/${audioFile}`),
      ))
  ) {
    return new Response("Audio not found.", { status: 404 });
  }

  if (!adminDraftPreview && !(article.year === 2015 && isFreeBbc2015ArticleUnlocked(article.id))) {
    const hasAccess = await claimPaidContentAccess(
      "bbc",
      getPaidContentKey("bbc-article", article.id),
      1,
    );

    if (!hasAccess) {
      return new Response("BBC membership required.", {
        status: 403,
        headers: { "Cache-Control": "private, no-store" },
      });
    }
  }

  const range = request.headers.get("range");

  if (range && (range.length > 80 || !/^bytes=(?:\d+-\d*|-\d+)$/.test(range))) {
    return new Response(null, { status: 416 });
  }

  // Local preview reads the user's BBC archive only after the usual membership check.
  // Production continues to use the private R2 path below.
  if (process.env.NODE_ENV === "development" && process.env.BBC_LOCAL_AUDIO_ROOT) {
    try {
      const localPath = await resolveLocalBbcAudio(article, audioFile);
      if (localPath) {
        const localResponse = await localBbcAudioResponse(localPath, range);
        if (localResponse) return localResponse;
      }
    } catch {
      // A missing/unmounted local archive may still fall back to configured R2.
    }
  }

  const url = signedR2Url(`bbc/${year}/${articleId}/${audioFile}`);

  if (!url) {
    return new Response("Audio storage unavailable.", { status: 503 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control": "private, no-store",
      Location: url,
      "Referrer-Policy": "no-referrer",
    },
  });
}
