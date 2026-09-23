import { createHash, createHmac } from "node:crypto";
import { getBbcArticleById } from "@/lib/articles/bbc";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const article = getBbcArticleById(articleId);
  const audioFile = file.join("/");

  if (
    !article ||
    String(article.year) !== year ||
    (article.fullAudioUrl?.split("/").pop() !== audioFile &&
      !article.sentences?.some((sentence) =>
        sentence.audioUrl.endsWith(`/${audioFile}`),
      ))
  ) {
    return new Response("Audio not found.", { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: hasAccess, error } = await supabase.rpc("can_access_project", {
    _project_key: "bbc",
  });

  if (error || hasAccess !== true) {
    return new Response("BBC membership required.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const range = request.headers.get("range");

  if (range && (range.length > 80 || !/^bytes=(?:\d+-\d*|-\d+)$/.test(range))) {
    return new Response(null, { status: 416 });
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
