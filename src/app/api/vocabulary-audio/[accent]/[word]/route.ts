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

function getAudioRoots() {
  const roots = [
    getAudioRoot(),
    resolve("/Volumes/My HDD3/网站/英文解忧杂货铺/04_媒体素材/词汇发音/word-audio"),
  ];
  return [...new Set(roots)];
}

function isSafeAudioKey(value: string) {
  return /^[a-z0-9][a-z0-9'\-]*[a-z0-9]$|^[a-z0-9]$/i.test(value);
}

function getLegacyAudioNames(value: string) {
  const names = [value, value.replace(/-/g, " ")];
  if (value === "cafe-accent") names.push("café");
  return [...new Set(names)];
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
  const word = encodedWord.trim().toLowerCase();

  if ((accent !== "uk" && accent !== "us") || !isSafeAudioKey(word)) {
    return NextResponse.json({ error: "Invalid audio path" }, { status: 400 });
  }

  const audioPaths = getAudioRoots().flatMap((root) => {
    const accentRoot = resolve(root, accent);
    return getLegacyAudioNames(word).map((filename) => {
      if (!/^[a-z0-9' café-]+$/i.test(filename)) return "";
      const audioPath = resolve(accentRoot, `${filename}.mp3`);
      return audioPath.startsWith(`${accentRoot}${sep}`) ? audioPath : "";
    });
  }).filter(Boolean);
  let audioPath = "";
  let audioStats: Awaited<ReturnType<typeof stat>> | null = null;
  for (const candidate of audioPaths) {
    try {
      audioStats = await stat(candidate);
      audioPath = candidate;
      break;
    } catch {
      // Check the next local audio source.
    }
  }

  if (audioPath && audioStats) {
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
  }

  return NextResponse.json({ error: "Audio not found" }, { status: 404 });
}
