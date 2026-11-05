import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { resolve, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { hasListeningAnswerWordsAccess } from "@/lib/vocabulary/listening-answer-words-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chunkRoot = process.env.VOCABULARY_ANSWER_AUDIO_CHUNKS_ROOT?.trim()
  || resolve(process.cwd(), "tmp/vocabulary-answer-audio");
const bucket = "vocabulary-answer-audio";
const NUMBER_GROUP_COUNT = 21;
const signedUrls = new Map<string, { expiresAt: number; url: string }>();

function parseRange(rangeHeader: string, totalBytes: number) {
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = Math.min(totalBytes - 1, match[2] ? Number(match[2]) : totalBytes - 1);
  if (!Number.isFinite(start) || start > end || start >= totalBytes) return null;
  return { end, start };
}

async function signNumberAudio(storagePath: string) {
  const cached = signedUrls.get(storagePath);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("数字音频存储服务暂不可用");

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 600);
  if (error || !data?.signedUrl) throw new Error("数字音频暂不可用");

  signedUrls.set(storagePath, { expiresAt: Date.now() + 480_000, url: data.signedUrl });
  return data.signedUrl;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deck: string; part: string }> },
) {
  const { deck, part } = await params;
  const groupMatch = part.match(/^group-(\d{3})$/);
  if (deck !== "numbers208" || !groupMatch) {
    return NextResponse.json({ error: "Unknown audio part" }, { status: 404 });
  }

  const groupNumber = Number(groupMatch[1]);
  if (groupNumber < 1 || groupNumber > NUMBER_GROUP_COUNT) {
    return NextResponse.json({ error: "Unknown audio part" }, { status: 404 });
  }
  if (!await hasListeningAnswerWordsAccess()) {
    return NextResponse.json(
      { error: "Project access required." },
      { headers: { "Cache-Control": "private, no-store" }, status: 403 },
    );
  }

  const filename = `group-${groupMatch[1]}.mp3`;
  const audioRoot = resolve(chunkRoot, "numbers208");
  const audioPath = resolve(audioRoot, filename);
  if (!audioPath.startsWith(`${audioRoot}${sep}`)) {
    return NextResponse.json({ error: "Invalid audio path" }, { status: 400 });
  }

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
        if (!range) {
          return new Response(null, {
            headers: { ...commonHeaders, "Content-Range": `bytes */${audioStats.size}` },
            status: 416,
          });
        }
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
      // Production audio is served directly from the private Supabase bucket.
    }
  }

  try {
    const signedUrl = await signNumberAudio(`numbers208/${filename}`);
    return new Response(null, {
      headers: {
        "Cache-Control": "private, no-store",
        Location: signedUrl,
        "Referrer-Policy": "no-referrer",
      },
      status: 302,
    });
  } catch {
    return new Response("Audio storage unavailable.", {
      headers: { "Cache-Control": "private, no-store" },
      status: 503,
    });
  }
}
