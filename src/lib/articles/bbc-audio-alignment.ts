export type BbcRecognizedWord = { text: string; timestamp: [number, number | null] };
export type BbcSentenceTiming = { sentenceNo: number; startMs: number; endMs: number };
export type BbcAudioAlignment = { timings: BbcSentenceTiming[]; reviewSentenceNos: number[] };
const words = (text: string) => (text.toLowerCase().match(/[a-z0-9]+(?:['’][a-z]+)*/g) ?? []).map((word) => word.replace(/[’']/g, ""));

export function alignBbcAudioSentences(sentences: { sentenceNo: number; english: string }[], input: BbcRecognizedWord[], duration: number): BbcAudioAlignment {
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
  if (anchors.size / source.length < 0.65) throw new Error("音频与英文原文的匹配度不足，请检查是否选错 MP3。");
  let offset = 0;
  const aligned = sentences.map((sentence) => {
    const count = words(sentence.english).length;
    const matchedOffsets = Array.from({ length: count }, (_, index) => index).filter((index) => anchors.has(offset + index));
    const matches = matchedOffsets.map((index) => anchors.get(offset + index)!);
    offset += count;
    const missingAtStart = matchedOffsets[0] ?? 0;
    const missingAtEnd = matches.length ? count - matchedOffsets.at(-1)! - 1 : count;
    const review = !count || matches.length / count < 0.45 || missingAtStart > 1 || missingAtEnd > 1;
    return {
      count: Math.max(count, 1),
      matches,
      missingAtStart,
      missingAtEnd,
      review,
      timing: matches.length
        ? { sentenceNo: sentence.sentenceNo, startMs: Math.max(0, Math.round((matches[0].start - 0.12) * 1000)), endMs: Math.min(Math.round(duration * 1000), Math.round((matches.at(-1)!.end + 0.28) * 1000)) }
        : null,
    };
  });
  const secondsPerWord = aligned
    .filter((item) => item.matches.length && !item.review)
    .map((item) => (item.matches.at(-1)!.end - item.matches[0].start) / item.matches.length)
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0)
    .sort((left, right) => left - right);
  const estimatedSecondsPerWord = Math.min(0.75, Math.max(0.12, secondsPerWord[Math.floor(secondsPerWord.length / 2)] ?? duration / source.length));

  aligned.forEach((item) => {
    if (!item.timing || !item.matches.length) return;
    item.timing.startMs = Math.max(0, Math.round((item.matches[0].start - 0.12 - item.missingAtStart * estimatedSecondsPerWord) * 1000));
    item.timing.endMs = Math.min(Math.round(duration * 1000), Math.round((item.matches.at(-1)!.end + 0.28 + item.missingAtEnd * estimatedSecondsPerWord) * 1000));
  });

  for (let index = 0; index < aligned.length;) {
    if (aligned[index].timing) { index++; continue; }
    const first = index;
    while (index < aligned.length && !aligned[index].timing) index++;
    const previous = aligned[first - 1]?.timing;
    const next = aligned[index]?.timing;
    const previousEnd = (previous?.endMs ?? 0) / 1000;
    const nextStart = (next?.startMs ?? Math.round(duration * 1000)) / 1000;
    const available = nextStart - previousEnd;
    const missing = aligned.slice(first, index);
    const expected = missing.map((item) => Math.max(0.16, item.count * estimatedSecondsPerWord));
    const totalExpected = expected.reduce((sum, value) => sum + value, 0);
    const minimumSpan = missing.length * 0.08;
    if (available <= minimumSpan) {
      throw new Error(`第 ${sentences[first].sentenceNo} 句时间无法自动估算，请检查分句或音频。`);
    }
    const isCompressed = totalExpected > available;
    const durations = isCompressed
      ? expected.map((seconds) => 0.08 + (available - minimumSpan) * (seconds / totalExpected))
      : expected;
    let cursor = previousEnd + (isCompressed ? 0 : (available - totalExpected) / 2);
    missing.forEach((item, itemIndex) => {
      const sentence = sentences[first + itemIndex];
      const startMs = Math.max(0, Math.round(cursor * 1000));
      cursor += durations[itemIndex];
      const endMs = Math.min(Math.round(duration * 1000), next ? next.startMs : Math.round(duration * 1000), Math.max(startMs + 80, Math.round(cursor * 1000)));
      item.timing = { sentenceNo: sentence.sentenceNo, startMs, endMs };
    });
  }

  const timings = aligned.map((item) => item.timing!);
  for (let index = 1; index < timings.length; index++) {
    if (timings[index].startMs < timings[index - 1].endMs) {
      const boundary = Math.round((timings[index].startMs + timings[index - 1].endMs) / 2);
      timings[index - 1].endMs = boundary; timings[index].startMs = boundary;
    }
  }
  if (timings.some((timing) => timing.endMs <= timing.startMs)) throw new Error("句子时间轴无效，请重新分析音频。");
  return { timings, reviewSentenceNos: aligned.flatMap((item, index) => item.review ? [sentences[index].sentenceNo] : []) };
}
