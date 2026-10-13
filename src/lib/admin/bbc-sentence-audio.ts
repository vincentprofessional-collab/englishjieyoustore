import type { BbcSentenceTiming } from "@/lib/articles/bbc-audio-alignment";

export type BbcSentenceAudioFile = { sentenceNo: number; file: File };

export async function createBbcSentenceAudio(file: Blob, timings: BbcSentenceTiming[], onProgress: (message: string) => void): Promise<BbcSentenceAudioFile[]> {
  onProgress("正在准备独立小音频……");
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const encoder = new FFmpeg();
  const verifier = new AudioContext();
  try {
    await encoder.load({
      classWorkerURL: new URL("/vendor/bbc-audio/worker.js", window.location.href).href,
      coreURL: "/vendor/bbc-audio/ffmpeg-core.js", wasmURL: "/vendor/bbc-audio/ffmpeg-core.wasm",
    });
    await encoder.writeFile("original.mp3", new Uint8Array(await file.arrayBuffer()));
    const clips: BbcSentenceAudioFile[] = [];
    for (const timing of timings) {
      onProgress(`正在切分小音频 ${clips.length + 1}/${timings.length}……`);
      const name = `sentence-${timing.sentenceNo}.mp3`;
      const duration = (timing.endMs - timing.startMs) / 1000;
      const code = await encoder.exec(["-hide_banner", "-loglevel", "error", "-nostdin", "-y",
        "-ss", String(timing.startMs / 1000), "-i", "original.mp3", "-t", String(duration),
        "-vn", "-c:a", "libmp3lame", "-q:a", "2", name], 60_000);
      if (code !== 0) throw new Error(`第 ${timing.sentenceNo} 句音频切分失败，请重试。`);
      const data = await encoder.readFile(name);
      if (typeof data === "string" || data.byteLength < 128) throw new Error(`第 ${timing.sentenceNo} 句音频文件不完整。`);
      const clip = new File([new Uint8Array(data).buffer], name, { type: "audio/mpeg" });
      const decoded = await verifier.decodeAudioData(await clip.arrayBuffer());
      if (Math.abs(decoded.duration - duration) > 0.15) throw new Error(`第 ${timing.sentenceNo} 句小音频的时长与原声不符。`);
      clips.push({ sentenceNo: timing.sentenceNo, file: clip });
      await encoder.deleteFile(name);
    }
    return clips;
  } finally {
    encoder.terminate();
    await verifier.close();
  }
}
