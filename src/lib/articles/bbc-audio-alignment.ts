export type BbcRecognizedWord = { text: string; timestamp: [number, number | null] };
export type BbcSentenceTiming = { sentenceNo: number; startMs: number; endMs: number };
export type BbcAudioAlignment = { timings: BbcSentenceTiming[]; reviewSentenceNos: number[] };
const words = (text: string) => (text.toLowerCase().match(/[a-z0-9]+(?:['’][a-z]+)*/g) ?? []).map((word) => word.replace(/[’']/g, ""));

export function findBbcAudioPauses(audio: Float32Array, sampleRate: number): [number, number][] {
  const pauses: [number, number][] = [];
  const frame = Math.max(1, Math.round(sampleRate / 1000));
  const threshold = 10 ** (-35 / 20);
  let quietStart: number | null = null;
  for (let offset = 0; offset < audio.length; offset += frame) {
    let quiet = true;
    for (let index = offset; index < Math.min(audio.length, offset + frame); index++) {
      if (Math.abs(audio[index]) > threshold) { quiet = false; break; }
    }
    if (quiet && quietStart == null) quietStart = offset;
    if (!quiet && quietStart != null) {
      if ((offset - quietStart) / sampleRate >= 0.08) pauses.push([quietStart / sampleRate, offset / sampleRate]);
      quietStart = null;
    }
  }
  if (quietStart != null && (audio.length - quietStart) / sampleRate >= 0.08) pauses.push([quietStart / sampleRate, audio.length / sampleRate]);
  return pauses;
}

export function alignBbcAudioSentences(sentences: { sentenceNo: number; english: string }[], input: BbcRecognizedWord[], duration: number, pauses?: [number, number][]): BbcAudioAlignment {
  if (!Number.isFinite(duration) || duration <= 0 || !sentences.length) throw new Error("音频时长或句子内容无效。");
  const source = sentences.flatMap((sentence) => words(sentence.english));
  const recognized = input.flatMap((item, index) => {
    const start = item.timestamp?.[0];
    if (!Number.isFinite(start) || start! < 0 || start! >= duration) return [];
    const itemWords = words(item.text);
    if (!itemWords.length) return [];

    const suppliedEnd = item.timestamp[1];
    const nextStart = suppliedEnd == null || !Number.isFinite(suppliedEnd) || suppliedEnd <= start!
      ? input.slice(index + 1).map((next) => next.timestamp?.[0]).find((value) => Number.isFinite(value) && value! > start!)
      : undefined;
    const end = Math.min(duration, Math.max(start! + 0.08, suppliedEnd != null && Number.isFinite(suppliedEnd) && suppliedEnd > start! ? suppliedEnd : nextStart ?? duration));
    const span = end - start!;
    return itemWords.map((word, wordIndex) => ({
      word,
      start: start! + span * (wordIndex / itemWords.length),
      end: start! + span * ((wordIndex + 1) / itemWords.length),
    }));
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
  if (2 * anchors.size / (source.length + recognized.length) < 0.88 || anchors.size / source.length < 0.88) {
    throw new Error("音频与英文原文的匹配度不足，请检查是否选错 MP3，或原文与原声是否一致。");
  }
  let offset = 0;
  const aligned = sentences.map((sentence) => {
    const count = words(sentence.english).length;
    const matchedOffsets = Array.from({ length: count }, (_, index) => index).filter((index) => anchors.has(offset + index));
    const matches = matchedOffsets.map((index) => anchors.get(offset + index)!);
    offset += count;
    const sentenceWords = words(sentence.english);
    const missingAtStart = matchedOffsets[0] ?? count;
    const missingAtEnd = matches.length ? count - matchedOffsets.at(-1)! - 1 : count;
    const leadingLaughter = missingAtStart > 0 && sentenceWords.slice(0, missingAtStart).every((word) => /^(?:ha)+$/.test(word));
    if (!matches.length || missingAtEnd || (missingAtStart && !leadingLaughter)) {
      throw new Error(`第 ${sentence.sentenceNo} 句的句首或句尾未与原声完整对齐，请核对原文与 MP3 后重试。`);
    }
    const review = matches.length / count < 0.88;
    return {
      matches,
      review,
      timing: { sentenceNo: sentence.sentenceNo, startMs: Math.round(matches[0].start * 1000), endMs: Math.round(matches.at(-1)!.end * 1000) },
    };
  });
  const timings = aligned.map((item) => item.timing);
  for (let index = 1; index < timings.length; index++) {
    const previousEnd = aligned[index - 1].matches.at(-1)!.end;
    const nextStart = aligned[index].matches[0].start;
    if (previousEnd > nextStart) throw new Error(`第 ${sentences[index].sentenceNo} 句与上一句原声重叠，请检查分句。`);
    let boundary = (previousEnd + nextStart) / 2;
    if (pauses) {
      const pause = pauses.find(([start, end]) => start - 0.015 <= boundary && boundary <= end + 0.015);
      if (!pause) throw new Error(`第 ${sentences[index].sentenceNo} 句前没有可确认的停顿，请核对原文与音频。`);
      boundary = Math.max(pause[0], Math.min(pause[1], boundary));
    }
    timings[index - 1].endMs = Math.round(boundary * 1000);
    timings[index].startMs = Math.round(boundary * 1000);
  }
  const speechEnd = aligned.at(-1)!.matches.at(-1)!.end;
  const finalPause = pauses?.find(([start, end]) => start >= speechEnd && start - speechEnd < 1 && end - start > 0.2);
  timings.at(-1)!.endMs = Math.min(Math.round(duration * 1000), Math.round((finalPause ? (finalPause[0] + finalPause[1]) / 2 : speechEnd + 0.3) * 1000));
  if (timings.some((timing) => timing.endMs <= timing.startMs)) throw new Error("句子时间轴无效，请重新分析音频。");
  return { timings, reviewSentenceNos: aligned.flatMap((item, index) => item.review ? [sentences[index].sentenceNo] : []) };
}
