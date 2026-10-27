import type { BbcRecognizedWord, BbcSentenceTiming } from "@/lib/articles/bbc-audio-alignment";

export type BbcSubtitleCue = { text: string; start: number; end: number };
export type BbcSubtitleAlignment = { timings: BbcSentenceTiming[]; reviewSentenceNos: number[]; autoAdjustedSentenceNos: number[] };

const getWords = (text: string) => (text.toLowerCase().match(/[a-z0-9]+(?:['’][a-z]+)*/g) ?? []).map((word) => word.replace(/[’']/g, ""));

function timeToSeconds(value: string) {
  const match = value.trim().replace(",", ".").match(/^(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})$/);
  if (!match) return null;
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function decodeCueText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\{\\an\d+\}/g, " ")
    .replace(/&amp;/gi, "&").replace(/&apos;|&#39;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/[♪♫]/g, " ").trim();
}

function parseBbcLrc(input: string, duration: number): BbcSubtitleCue[] | null {
  const lines = input.split("\n");
  const timestampPattern = /\[(\d{1,3}):([0-5]\d)(?:\.(\d{1,3}))?\]/g;
  if (!lines.some((line) => /\[\d{1,3}:[0-5]\d(?:\.\d{1,3})?\]/.test(line))) return null;

  const offsetMs = Number(lines.join("\n").match(/\[\s*offset\s*:\s*([+-]?\d+)\s*\]/i)?.[1] ?? 0);
  const entries: Array<BbcSubtitleCue & { order: number }> = [];
  let order = 0;
  for (const line of lines) {
    const timestamps = [...line.matchAll(timestampPattern)];
    if (!timestamps.length) continue;
    const cueText = decodeCueText(line.replace(timestampPattern, " ")
      .replace(/\[(?:ar|al|ti|by|re|ve|length|id|la|offset)\s*:[^\]]*\]/gi, " ")
      .replace(/\[(?:verse|chorus|bridge|intro|outro)[^\]]*\]/gi, " "));
    if (!getWords(cueText).length) continue;
    for (const match of timestamps) {
      const fraction = (match[3] ?? "").padEnd(3, "0");
      const rawStart = Number(match[1]) * 60 + Number(match[2]) + Number(fraction || 0) / 1000;
      const start = Math.max(0, rawStart + offsetMs / 1000);
      if (start >= duration) continue;
      entries.push({ text: cueText, start, end: 0, order: order++ });
    }
  }
  if (!entries.length) throw new Error("LRC 文件中没有可识别的英文歌词和有效时间标签。");
  entries.sort((left, right) => left.start - right.start || left.order - right.order);
  const unique = entries.filter((cue, index) => index === 0 || cue.start !== entries[index - 1].start || cue.text !== entries[index - 1].text);
  return unique.map((cue, index) => {
    const nextStart = unique.slice(index + 1).find((next) => next.start > cue.start)?.start;
    return { text: cue.text, start: cue.start, end: Math.min(duration, nextStart ?? duration) };
  }).filter((cue) => cue.end > cue.start);
}

export function parseBbcSubtitleCues(input: string, duration = Number.POSITIVE_INFINITY): BbcSubtitleCue[] {
  const text = input.replace(/^\uFEFF/, "").replace(/\r/g, "");
  const lrcCues = parseBbcLrc(text, duration);
  if (lrcCues) return lrcCues;
  const cues: BbcSubtitleCue[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [startText, rawEndText] = lines[timingIndex].split("-->", 2);
    const endText = rawEndText.trim().split(/\s+/, 1)[0];
    const start = timeToSeconds(startText);
    const end = timeToSeconds(endText);
    const cueText = decodeCueText(lines.slice(timingIndex + 1).join(" "));
    if (start == null || end == null || end <= start || !getWords(cueText).length) continue;
    cues.push({ text: cueText, start, end });
  }
  if (!cues.length) throw new Error("字幕文件中没有可识别的 SRT/VTT/LRC 时间轴，请检查字幕格式。");
  for (let index = 1; index < cues.length; index++) {
    if (cues[index].start < cues[index - 1].start) throw new Error("字幕时间顺序有误，请检查时间戳。");
  }
  return cues;
}

export function wordsFromBbcSubtitleCues(cues: BbcSubtitleCue[]): BbcRecognizedWord[] {
  return cues.flatMap((cue) => {
    const words = cue.text.match(/[a-z0-9]+(?:['’][a-z]+)*/gi) ?? [];
    const span = cue.end - cue.start;
    return words.map((text, index) => ({
      text,
      timestamp: [cue.start + span * index / words.length, cue.start + span * (index + 1) / words.length] as [number, number],
    }));
  });
}

export function alignBbcSubtitleSentences(
  sentences: { sentenceNo: number; english: string }[],
  cues: BbcSubtitleCue[],
  duration: number,
): BbcSubtitleAlignment | null {
  if (cues.length !== sentences.length) return null;
  const timings: BbcSentenceTiming[] = [];
  const reviewSentenceNos: number[] = [];
  for (let index = 0; index < sentences.length; index++) {
    const sourceWords = getWords(sentences[index].english);
    const cueWords = getWords(cues[index].text);
    if (!sourceWords.length || !cueWords.length) return null;
    let matched = 0;
    let sourceIndex = 0;
    let cueIndex = 0;
    while (sourceIndex < sourceWords.length && cueIndex < cueWords.length) {
      if (sourceWords[sourceIndex] === cueWords[cueIndex]) { matched++; sourceIndex++; cueIndex++; }
      else if (sourceWords.length - sourceIndex >= cueWords.length - cueIndex) sourceIndex++;
      else cueIndex++;
    }
    if (matched / sourceWords.length < 0.65 || matched / cueWords.length < 0.65) return null;
    if (matched / sourceWords.length < 0.88 || matched / cueWords.length < 0.88) reviewSentenceNos.push(sentences[index].sentenceNo);
    const startMs = Math.max(0, Math.round(cues[index].start * 1000));
    const endMs = Math.min(Math.round(duration * 1000), Math.round(cues[index].end * 1000));
    if (endMs <= startMs) return null;
    timings.push({ sentenceNo: sentences[index].sentenceNo, startMs, endMs });
  }
  for (let index = 1; index < timings.length; index++) {
    if (timings[index].startMs < timings[index - 1].endMs) return null;
  }
  return { timings, reviewSentenceNos, autoAdjustedSentenceNos: [] };
}
