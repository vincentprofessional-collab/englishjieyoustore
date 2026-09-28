import { createReadStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import type { BbcArticle } from "@/lib/articles/bbc";

const execFileAsync = promisify(execFile);
const pendingClips = new Map<string, Promise<string | null>>();

async function fileSize(path: string) {
  try {
    const info = await stat(path);
    return info.isFile() ? info.size : 0;
  } catch {
    return 0;
  }
}

async function findOriginalAudio(root: string, article: BbcArticle) {
  const yearDir = join(root, `${article.year}年`);
  const prefix = `${article.id}-`;
  const entries = await readdir(yearDir, { withFileTypes: true });
  const direct = entries.find((entry) =>
    entry.isFile() && entry.name.startsWith(prefix) && entry.name.toLowerCase().endsWith(".mp3"),
  );
  if (direct) return join(yearDir, direct.name);

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(prefix)) continue;
    const articleDir = join(yearDir, entry.name);
    const files = await readdir(articleDir, { withFileTypes: true });
    const original = files.find((file) =>
      file.isFile() && file.name.startsWith(prefix) && file.name.toLowerCase().endsWith(".mp3"),
    );
    if (original) return join(articleDir, original.name);
  }
  return null;
}

async function createSentenceClip(
  original: string,
  article: BbcArticle,
  audioFile: string,
) {
  if (!/^sentences\/\d{6}-\d{3}\.mp3$/.test(audioFile)) return null;
  const sentence = article.sentences?.find((item) => item.audioUrl.endsWith(`/${audioFile}`));
  if (!sentence || sentence.endMs <= sentence.startMs) return null;

  const output = resolve(process.cwd(), "tmp", "bbc-local-audio", String(article.year), article.id, audioFile);
  if (await fileSize(output)) return output;

  await mkdir(resolve(output, ".."), { recursive: true });
  const temporary = join(tmpdir(), `bbc-local-${article.id}-${sentence.sentenceNo}-${crypto.randomUUID()}.mp3`);
  try {
    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
      "-ss", String(sentence.startMs / 1000),
      "-i", original,
      "-t", String((sentence.endMs - sentence.startMs) / 1000),
      "-vn", "-c:a", "libmp3lame", "-q:a", "2", "-f", "mp3", temporary,
    ], { timeout: 30_000, maxBuffer: 64 * 1024 });
    if (!(await fileSize(temporary))) return null;
    await rename(temporary, output);
    return output;
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function resolveLocalBbcAudio(article: BbcArticle, audioFile: string) {
  const root = process.env.NODE_ENV === "development" ? process.env.BBC_LOCAL_AUDIO_ROOT : null;
  if (!root) return null;

  const original = await findOriginalAudio(root, article);
  if (!original) return null;
  if (article.fullAudioUrl?.endsWith(`/${audioFile}`)) return original;

  const key = `${article.year}/${article.id}/${audioFile}`;
  const inProgress = pendingClips.get(key);
  if (inProgress) return inProgress;
  const task = createSentenceClip(original, article, audioFile);
  pendingClips.set(key, task);
  try {
    return await task;
  } finally {
    pendingClips.delete(key);
  }
}

export async function localBbcAudioResponse(path: string, range: string | null) {
  const size = await fileSize(path);
  if (!size) return null;

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Type": "audio/mpeg",
    "X-Content-Type-Options": "nosniff",
  });
  let start = 0;
  let end = size - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) return new Response(null, { status: 416 });
    if (!match[1]) {
      const suffix = Number(match[2]);
      start = suffix > 0 ? Math.max(0, size - suffix) : size;
    } else {
      start = Number(match[1]);
      if (match[2]) end = Math.min(Number(match[2]), size - 1);
    }
    if (start >= size || end < start) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  headers.set("Content-Length", String(end - start + 1));
  const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream<Uint8Array>;
  return new Response(body, { status: range ? 206 : 200, headers });
}
