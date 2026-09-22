import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getAudioRoot() {
  const configuredRoot = process.env.VOCABULARY_AUDIO_DIR?.trim();

  if (configuredRoot) {
    return resolve(configuredRoot);
  }

  return resolve(homedir(), "Desktop", "单词音频合成", "word-audio");
}

function isSafeWord(value: string) {
  return /^[a-z][a-z '\-]*[a-z]$|^[a-z]$/i.test(value);
}

function parseRange(rangeHeader: string, totalBytes: number) {
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);

  if (!match) {
    return null;
  }

  const requestedStart = match[1] ? Number(match[1]) : 0;
  const requestedEnd = match[2] ? Number(match[2]) : totalBytes - 1;
  const start = Math.max(0, requestedStart);
  const end = Math.min(totalBytes - 1, requestedEnd);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= totalBytes) {
    return null;
  }

  return { end, start };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accent: string; word: string }> },
) {
  const { accent, word: encodedWord } = await params;
  const word = decodeURIComponent(encodedWord).trim().toLowerCase();

  if ((accent !== "uk" && accent !== "us") || !isSafeWord(word)) {
    return NextResponse.json({ error: "Invalid audio path" }, { status: 400 });
  }

  const accentRoot = resolve(getAudioRoot(), accent);
  const audioPath = resolve(accentRoot, `${word}.mp3`);

  if (!audioPath.startsWith(`${accentRoot}${sep}`)) {
    return NextResponse.json({ error: "Invalid audio path" }, { status: 400 });
  }

  try {
    const audioStats = await stat(audioPath);
    const rangeHeader = request.headers.get("range");
    const commonHeaders = {
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
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

      const partialAudioLength = range.end - range.start + 1;
      const partialAudioStream = Readable.toWeb(
        createReadStream(audioPath, { end: range.end, start: range.start }),
      ) as ReadableStream<Uint8Array>;

      return new Response(partialAudioStream, {
        headers: {
          ...commonHeaders,
          "Content-Length": String(partialAudioLength),
          "Content-Range": `bytes ${range.start}-${range.end}/${audioStats.size}`,
        },
        status: 206,
      });
    }

    const audioStream = Readable.toWeb(createReadStream(audioPath)) as ReadableStream<Uint8Array>;

    return new Response(audioStream, {
      headers: { ...commonHeaders, "Content-Length": String(audioStats.size) },
    });
  } catch {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }
}
