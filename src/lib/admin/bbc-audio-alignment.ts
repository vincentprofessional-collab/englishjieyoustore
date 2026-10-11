import { alignBbcAudioSentences, type BbcRecognizedWord } from "@/lib/articles/bbc-audio-alignment";

export async function analyzeBbcAudio(file: Blob, sentences: { sentenceNo: number; english: string }[], onProgress: (message: string) => void) {
  onProgress("正在读取 MP3……");
  const audioContext = new AudioContext();
  let decoded: AudioBuffer;
  try { decoded = await audioContext.decodeAudioData(await file.arrayBuffer()); }
  finally { await audioContext.close(); }
  const duration = decoded.duration;
  const renderer = new OfflineAudioContext(1, Math.ceil(duration * 16_000), 16_000);
  const source = renderer.createBufferSource(); source.buffer = decoded; source.connect(renderer.destination); source.start();
  const audio = (await renderer.startRendering()).getChannelData(0);
  const worker = new Worker(new URL("../../workers/bbc-audio-alignment.worker.ts", import.meta.url), { type: "module" });
  try {
    const recognized = await new Promise<BbcRecognizedWord[]>((resolve, reject) => {
      worker.onerror = () => reject(new Error("本地语音分析未能启动，请刷新后重试。"));
      worker.onmessage = (event) => {
        if (event.data.status === "progress") onProgress(event.data.message);
        else if (event.data.status === "error") reject(new Error(event.data.message));
        else if (event.data.status === "complete") resolve(event.data.result.chunks ?? []);
      };
      worker.postMessage({ audio }, [audio.buffer]);
    });
    return { durationMs: Math.round(duration * 1000), ...alignBbcAudioSentences(sentences, recognized, duration) };
  } finally { worker.terminate(); }
}
