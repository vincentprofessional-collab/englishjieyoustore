import type { BbcSentenceTiming } from "@/lib/articles/bbc-audio-alignment";

export type BbcSentenceAudioFile = { sentenceNo: number; file: File };

export async function createBbcSentenceAudio(file: Blob, timings: BbcSentenceTiming[], onProgress: (message: string) => void): Promise<BbcSentenceAudioFile[]> {
  if (!timings.length) return [];
  onProgress("正在准备独立小音频……");
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const encoder = new FFmpeg();
  const signal = AbortSignal.timeout(60_000);
  try {
    await encoder.load({
      classWorkerURL: new URL("/vendor/bbc-audio/worker.js", window.location.href).href,
      coreURL: "/vendor/bbc-audio/ffmpeg-core.js", wasmURL: "/vendor/bbc-audio/ffmpeg-core.wasm",
    }, { signal });
    await encoder.writeFile("original.mp3", new Uint8Array(await file.arrayBuffer()), { signal });
    const clips: BbcSentenceAudioFile[] = [];
    for (const [index, timing] of timings.entries()) {
      if (signal.aborted) break;
      onProgress(`正在切分小音频 ${index + 1}/${timings.length}……`);
      const name = `sentence-${timing.sentenceNo}.mp3`;
      const duration = (timing.endMs - timing.startMs) / 1000;
      try {
        const code = await encoder.exec(["-hide_banner", "-loglevel", "error", "-nostdin", "-y",
          "-ss", String(timing.startMs / 1000), "-i", "original.mp3", "-t", String(duration),
          "-vn", "-c:a", "libmp3lame", "-q:a", "2", name], 10_000, { signal });
        if (code !== 0) continue;
        const data = await encoder.readFile(name, "binary", { signal });
        if (typeof data === "string" || data.byteLength < 128) continue;
        clips.push({ sentenceNo: timing.sentenceNo, file: new File([new Uint8Array(data).buffer], name, { type: "audio/mpeg" }) });
      } catch {
        // The saved range on the full MP3 is still usable if this clip fails.
      } finally {
        if (!signal.aborted) await encoder.deleteFile(name, { signal }).catch(() => undefined);
      }
    }
    return clips;
  } finally {
    encoder.terminate();
  }
}
