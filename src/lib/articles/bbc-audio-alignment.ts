export type BbcRecognizedWord = { text: string; timestamp: [number, number | null] };
export type BbcSentenceTiming = { sentenceNo: number; startMs: number; endMs: number };
const words = (text: string) => (text.toLowerCase().match(/[a-z0-9]+(?:['’][a-z]+)*/g) ?? []).map((word) => word.replace(/[’']/g, ""));

export function alignBbcAudioSentences(sentences: { sentenceNo: number; english: string }[], input: BbcRecognizedWord[], duration: number): BbcSentenceTiming[] {
  if (!Number.isFinite(duration) || duration <= 0 || !sentences.length) throw new Error("音频时长或句子内容无效。");
  const source = sentences.flatMap((sentence) => words(sentence.english));
  const recognized = input.flatMap((item) => {
    if (!Number.isFinite(item.timestamp[0]) || item.timestamp[1] === null || !Number.isFinite(item.timestamp[1]) || item.timestamp[1] <= item.timestamp[0]) return [];
    return words(item.text).map((word) => ({ word, start: item.timestamp[0], end: item.timestamp[1]! }));
  });
  if (!source.length || !recognized.length || source.length * recognized.length > 16_000_000) throw new Error("音频未识别出可对齐的英文，或文章过长。");
  const width = recognized.length + 1;
  const matrix = new Uint16Array((source.length + 1) * width);
  for (let i = 1; i <= source.length; i++) for (let j = 1; j <= recognized.length; j++) {
    matrix[i * width + j] = source[i - 1] === recognized[j - 1].word ? matrix[(i - 1) * width + j - 1] + 1 : Math.max(matrix[(i - 1) * width + j], matrix[i * width + j - 1]);
  }
  const anchors = new Map<number, typeof recognized[number]>();
  let i = source.length, j = recognized.length;
  while (i > 0 && j > 0) {
    if (source[i - 1] === recognized[j - 1].word) { anchors.set(--i, recognized[--j]); }
    else if (matrix[(i - 1) * width + j] >= matrix[i * width + j - 1]) i--;
    else j--;
  }
  if (anchors.size / source.length < 0.65) throw new Error("音频与英文原文的匹配度不足，请检查是否选错 MP3。");
  let offset = 0;
  const timings = sentences.map((sentence) => {
    const count = words(sentence.english).length;
    const matches = Array.from({ length: count }, (_, index) => anchors.get(offset + index)).filter((anchor): anchor is typeof recognized[number] => !!anchor);
    offset += count;
    if (!matches.length || matches.length / count < 0.45) throw new Error(`第 ${sentence.sentenceNo} 句没有可靠的原声时间，请检查音频或在前端微调。`);
    return { sentenceNo: sentence.sentenceNo, startMs: Math.max(0, Math.round((matches[0].start - 0.08) * 1000)), endMs: Math.min(Math.round(duration * 1000), Math.round((matches.at(-1)!.end + 0.08) * 1000)) };
  });
  for (let index = 1; index < timings.length; index++) {
    if (timings[index].startMs < timings[index - 1].endMs) {
      const boundary = Math.round((timings[index].startMs + timings[index - 1].endMs) / 2);
      timings[index - 1].endMs = boundary; timings[index].startMs = boundary;
    }
  }
  if (timings.some((timing) => timing.endMs <= timing.startMs)) throw new Error("句子时间轴无效，请重新分析音频。");
  return timings;
}
