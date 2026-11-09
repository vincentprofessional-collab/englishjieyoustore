import { alignBbcAudioSentences, findBbcAudioPauses, type BbcRecognizedWord } from "@/lib/articles/bbc-audio-alignment";
import { createBbcSentenceAudio } from "@/lib/admin/bbc-sentence-audio";

export async function analyzeBbcAudio(file: Blob, sentences: { sentenceNo: number; english: string }[], onProgress: (message: string) => void) {
  onProgress("正在读取 MP3……");
  const audioContext = new AudioContext();
  let decoded: AudioBuffer;
  try { decoded = await audioContext.decodeAudioData(await file.arrayBuffer()); }
  finally { await audioContext.close().catch(() => undefined); }
  const duration = decoded.duration;
  const durationMs = Math.round(duration * 1000);
  const renderer = new OfflineAudioContext(1, Math.ceil(duration * 16_000), 16_000);
  const source = renderer.createBufferSource(); source.buffer = decoded; source.connect(renderer.destination); source.start();
  const audio = (await renderer.startRendering()).getChannelData(0);
  const pauses = findBbcAudioPauses(audio, 16_000);
  const worker = new Worker(new URL("../../workers/bbc-audio-alignment.worker.ts", import.meta.url), { type: "module" });
  let recognized: BbcRecognizedWord[];
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    recognized = await new Promise<BbcRecognizedWord[]>((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error("本地语音分析超时。")), 120_000);
      worker.onerror = () => reject(new Error("本地语音分析未能启动，请刷新后重试。"));
      worker.onmessage = (event) => {
        if (event.data.status === "progress") onProgress(event.data.message);
        else if (event.data.status === "error") reject(new Error(event.data.message));
        else if (event.data.status === "complete") resolve(event.data.result.chunks ?? []);
      };
      worker.postMessage({ audio }, [audio.buffer]);
    });
  } finally {
    clearTimeout(timeout);
    worker.terminate();
  }
  const alignment = alignBbcAudioSentences(sentences, recognized, duration, pauses);
  const clips = await createBbcSentenceAudio(file, alignment.timings, onProgress).catch(() => []);
  return { durationMs, ...alignment, clips };
}
