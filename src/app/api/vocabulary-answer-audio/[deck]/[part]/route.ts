import { createHash, createHmac } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { resolve, sep } from "node:path";
import { NextResponse } from "next/server";
import type { ListeningAnswerDeckId } from "@/lib/vocabulary/listening-answer-words";
import { hasListeningAnswerWordsAccess } from "@/lib/vocabulary/listening-answer-words-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sourceRoot = process.env.VOCABULARY_ANSWER_AUDIO_ROOT?.trim()
  || "/Volumes/My HDD3/词汇音频/剑雅听力词汇答案词音频";
const bucket = process.env.R2_BBC_AUDIO_BUCKET || "englishjieyou-bbc-audio";

const DECK_FOLDERS: Record<ListeningAnswerDeckId, string> = {
  core346: "剑雅4-21听力答案词-超核心高频词346",
  answers683: "剑雅4-21听力答案词-683",
  numbers208: "剑雅4-20听力答案词-数字与拼写特辑",
};

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

function getAudioFilename(deck: ListeningAnswerDeckId, part: string) {
  if (deck === "core346" && part === "full") return "剑雅4-21听力答案词-超核心高频词346-文本.mp3";
  const match = part.match(/^part(\d{2})$/);
  if (!match) return null;
  const number = Number(match[1]);

  if (deck === "core346" && number >= 1 && number <= 6) {
    return `剑雅4-21超核心高频词346-文本-part${number}.mp3`;
  }
  if (deck === "answers683" && number >= 1 && number <= 12) {
    return `剑雅4-21听力答案词-part${match[1]}.mp3`;
  }
  if (deck === "numbers208" && number >= 1 && number <= 3) {
    return `剑雅4-20听力答案词-数字与拼写特辑-part${match[1]}.mp3`;
  }
  return null;
}

function signedR2Url(key: string) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_BBC_AUDIO_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_BBC_AUDIO_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

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
  const canonicalRequest = ["GET", uri, canonicalQuery, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), "auto"), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return `https://${host}${uri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function parseRange(rangeHeader: string, totalBytes: number) {
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = Math.min(totalBytes - 1, match[2] ? Number(match[2]) : totalBytes - 1);
  if (!Number.isFinite(start) || start > end || start >= totalBytes) return null;
  return { end, start };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deck: string; part: string }> },
) {
  const { deck: rawDeck, part } = await params;
  if (!(rawDeck in DECK_FOLDERS)) return NextResponse.json({ error: "Unknown audio deck" }, { status: 404 });
  const deck = rawDeck as ListeningAnswerDeckId;
  const filename = getAudioFilename(deck, part);
  if (!filename) return NextResponse.json({ error: "Unknown audio part" }, { status: 404 });
  if (!await hasListeningAnswerWordsAccess()) {
    return NextResponse.json({ error: "Project access required." }, { headers: { "Cache-Control": "private, no-store" }, status: 403 });
  }

  const deckRoot = resolve(sourceRoot, DECK_FOLDERS[deck]);
  const audioPath = resolve(deckRoot, filename);
  if (!audioPath.startsWith(`${deckRoot}${sep}`)) return NextResponse.json({ error: "Invalid audio path" }, { status: 400 });
  const rangeHeader = request.headers.get("range");
  if (rangeHeader && (rangeHeader.length > 80 || !/^bytes=(?:\d+-\d*|-\d+)$/.test(rangeHeader))) {
    return new Response(null, { status: 416 });
  }

  if (process.env.NODE_ENV === "development") {
    try {
      const audioStats = await stat(audioPath);
      const commonHeaders = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        "Content-Type": "audio/mpeg",
      };
      if (rangeHeader) {
        const range = parseRange(rangeHeader, audioStats.size);
        if (!range) return new Response(null, { headers: { ...commonHeaders, "Content-Range": `bytes */${audioStats.size}` }, status: 416 });
        const stream = Readable.toWeb(createReadStream(audioPath, { end: range.end, start: range.start })) as ReadableStream<Uint8Array>;
        return new Response(stream, {
          headers: {
            ...commonHeaders,
            "Content-Length": String(range.end - range.start + 1),
            "Content-Range": `bytes ${range.start}-${range.end}/${audioStats.size}`,
          },
          status: 206,
        });
      }
      const stream = Readable.toWeb(createReadStream(audioPath)) as ReadableStream<Uint8Array>;
      return new Response(stream, { headers: { ...commonHeaders, "Content-Length": String(audioStats.size) } });
    } catch {
      // Local audio is optional; deployed requests use the matching private R2 key.
    }
  }

  const key = `vocabulary/listening-answer-words/${DECK_FOLDERS[deck]}/${filename}`;
  const url = signedR2Url(key);
  if (!url) return new Response("Audio storage unavailable.", { status: 503 });
  return new Response(null, {
    headers: { "Cache-Control": "private, no-store", Location: url, "Referrer-Policy": "no-referrer" },
    status: 302,
  });
}
