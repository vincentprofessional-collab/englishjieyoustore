import { createHash, createHmac } from "node:crypto";
import { getBbcArticleById } from "@/lib/articles/bbc";
import { getUploadedBbcArticle } from "@/lib/articles/bbc-uploaded-content";
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

function signedR2Request(key: string, range: string | null) {
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
  const payloadHash = sha256("");
  const canonicalHeaders: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  if (range) {
    canonicalHeaders.range = range;
  }

  const names = Object.keys(canonicalHeaders).sort();
  const signedHeaders = names.join(";");
  const canonicalRequest = [
    "GET",
    uri,
    "",
    names.map((name) => `${name}:${canonicalHeaders[name]}\n`).join(""),
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), "auto"), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return {
    url: `https://${host}${uri}`,
    headers: {
      ...(range ? { Range: range } : {}),
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ year: string; articleId: string; file: string[] }> },
) {
  const { year, articleId, file } = await params;
  const article = getBbcArticleById(articleId) ?? await getUploadedBbcArticle(articleId);
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

  if (!(article.year === 2015 && isFreeBbc2015ArticleUnlocked(article.id))) {
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

  const signed = signedR2Request(`bbc/${year}/${articleId}/${audioFile}`, range);

  if (!signed) {
    return new Response("Audio storage unavailable.", { status: 503 });
  }

  try {
    const upstream = await fetch(signed.url, {
      method: "GET",
      headers: signed.headers,
      cache: "no-store",
    });

    if (upstream.status === 404) {
      return new Response("Audio not found.", { status: 404 });
    }

    if (upstream.status !== 200 && upstream.status !== 206 && upstream.status !== 416) {
      return new Response("Audio storage unavailable.", { status: 502 });
    }

    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "Content-Type": "audio/mpeg",
      "X-Content-Type-Options": "nosniff",
    });

    for (const name of ["content-length", "content-range", "etag"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new Response(upstream.status === 416 ? null : upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return new Response("Audio storage unavailable.", { status: 502 });
  }
}
