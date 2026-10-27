import { alignBbcAudioSentences, findBbcAudioPauses, type BbcRecognizedWord } from "@/lib/articles/bbc-audio-alignment";
import { alignBbcSubtitleSentences, parseBbcSubtitleCues, wordsFromBbcSubtitleCues } from "@/lib/articles/bbc-subtitle-alignment";
import { createBbcSentenceAudio } from "@/lib/admin/bbc-sentence-audio";

export async function analyzeBbcAudio(file: Blob, sentences: { sentenceNo: number; english: string }[], onProgress: (message: string) => void, subtitleFile?: Blob) {
  onProgress("正在读取 MP3……");
  const audioContext = new AudioContext();
  let decoded: AudioBuffer;
  try { decoded = await audioContext.decodeAudioData(await file.arrayBuffer()); }
  finally { await audioContext.close(); }
  const duration = decoded.duration;
  const renderer = new OfflineAudioContext(1, Math.ceil(duration * 16_000), 16_000);
  const source = renderer.createBufferSource(); source.buffer = decoded; source.connect(renderer.destination); source.start();
  const audio = (await renderer.startRendering()).getChannelData(0);
  const pauses = findBbcAudioPauses(audio, 16_000);
  if (subtitleFile) {
    onProgress("正在读取字幕时间戳并匹配文章句子……");
    const cues = parseBbcSubtitleCues(await subtitleFile.text());
    let subtitleAlignment = alignBbcSubtitleSentences(sentences, cues, duration);
    if (!subtitleAlignment) {
      try { subtitleAlignment = alignBbcAudioSentences(sentences, wordsFromBbcSubtitleCues(cues), duration, pauses); }
      catch { subtitleAlignment = null; }
    }
    if (subtitleAlignment) {
      const clips = await createBbcSentenceAudio(file, subtitleAlignment.timings, onProgress);
      return { durationMs: Math.round(duration * 1000), ...subtitleAlignment, clips, alignmentSource: "subtitle" as const };
    }
    onProgress("字幕与文章未能稳定逐句对应，正在改用原声自动识别……");
  }
  const worker = new Worker(new URL("../../workers/bbc-audio-alignment.worker.ts", import.meta.url), { type: "module" });
  let recognized: BbcRecognizedWord[];
  try {
    recognized = await new Promise<BbcRecognizedWord[]>((resolve, reject) => {
      worker.onerror = () => reject(new Error("本地语音分析未能启动，请刷新后重试。"));
      worker.onmessage = (event) => {
        if (event.data.status === "progress") onProgress(event.data.message);
        else if (event.data.status === "error") reject(new Error(event.data.message));
        else if (event.data.status === "complete") resolve(event.data.result.chunks ?? []);
      };
      worker.postMessage({ audio }, [audio.buffer]);
    });
  } finally { worker.terminate(); }
  const alignment = alignBbcAudioSentences(sentences, recognized, duration, pauses);
  const clips = await createBbcSentenceAudio(file, alignment.timings, onProgress);
  return { durationMs: Math.round(duration * 1000), ...alignment, clips, alignmentSource: "recognition" as const };
}
