import type { BbcSentenceTiming } from "@/lib/articles/bbc-audio-alignment";

export type BbcSubtitleCue = { text: string; start: number; end: number };

function englishKey(text: string) {
  return (text.normalize("NFKC").toLowerCase().replace(/['’‘ʼ]/g, "").match(/[a-z0-9]+/g) ?? []).join(" ");
}

function timeToSeconds(value: string) {
  const match = value.trim().match(/^(?:(\d+):)?(\d{2}):([0-5]\d)[.,](\d{3})$/);
  if (!match) return null;
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function decodeCueText(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\{\\an\d+\}/g, "")
    .replace(/&amp;/gi, "&").replace(/&apos;|&#39;|&rsquo;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/[♪♫]/g, " ").trim();
}

function parseBbcLrc(input: string, duration: number): BbcSubtitleCue[] | null {
  const timestamp = /\[(\d{1,3}):([0-5]\d)(?:[.,](\d{1,3}))?\]/g;
  const offset = Number(input.match(/\[\s*offset\s*:\s*([+-]?\d+)\s*\]/i)?.[1] ?? 0);
  const entries = new Map<number, Set<string>>();
  for (const line of input.split("\n")) {
    const stamps = [...line.matchAll(timestamp)];
    if (!stamps.length) continue;
    const text = decodeCueText(line.replace(timestamp, " ").replace(/\[(?:[a-z]+\s*:|verse|chorus|bridge|intro|outro)[^\]]*\]/gi, " "));
    for (const match of stamps) {
      const startMs = Math.max(0, (Number(match[1]) * 60 + Number(match[2])) * 1000 + Number((match[3] ?? "").padEnd(3, "0")) + offset);
      if (startMs >= duration * 1000) continue;
      const texts = entries.get(startMs) ?? new Set<string>();
      if (englishKey(text)) texts.add(text);
      entries.set(startMs, texts);
    }
  }
  if (!entries.size) return null;
  const starts = [...entries.keys()].sort((a, b) => a - b);
  return starts.flatMap((start, index) => [...entries.get(start)!].map((text) => ({
    text, start: start / 1000, end: Math.min(duration, (starts[index + 1] ?? Infinity) / 1000),
  })));
}

export function parseBbcSubtitleCues(input: string, duration = Infinity): BbcSubtitleCue[] {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lrcCues = parseBbcLrc(text, duration);
  if (lrcCues?.length) return lrcCues;
  const cues: BbcSubtitleCue[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [startText, rawEndText] = lines[timingIndex].split("-->", 2);
    const start = timeToSeconds(startText);
    const end = timeToSeconds(rawEndText.trim().split(/\s+/, 1)[0]);
    const cueText = decodeCueText(lines.slice(timingIndex + 1).join("\n"));
    if (start == null || end == null || Math.min(duration, end) <= start || !englishKey(cueText)) continue;
    cues.push({ text: cueText, start, end: Math.min(duration, end) });
  }
  if (!cues.length) throw new Error("字幕中没有可用的英文句子和时间戳。");
  return cues.sort((a, b) => a.start - b.start);
}

export function alignBbcSubtitleSentences(
  sentences: { sentenceNo: number; english: string }[],
  cues: BbcSubtitleCue[],
  duration: number,
) {
  const cuesByEnglish = new Map<string, BbcSubtitleCue[]>();
  for (const cue of cues) {
    if (!Number.isFinite(cue.start) || cue.start < 0 || cue.end <= cue.start || cue.start >= duration) continue;
    // A bilingual cue can have its translation on a separate line or beside the English.
    const keys = new Set([englishKey(cue.text), ...cue.text.split(/\n|[\u3400-\u9fff]+/).map(englishKey)]);
    for (const key of keys) {
      if (!key) continue;
      const matches = cuesByEnglish.get(key) ?? [];
      if (matches.at(-1)?.start === cue.start) continue;
      matches.push(cue);
      cuesByEnglish.set(key, matches);
    }
  }
  const used = new Set<BbcSubtitleCue>();
  const timings: BbcSentenceTiming[] = [];
  const reviewSentenceNos: number[] = [];
  for (const sentence of sentences) {
    const matches = cuesByEnglish.get(englishKey(sentence.english));
    let cue = matches?.shift();
    while (cue && used.has(cue)) cue = matches?.shift();
    if (cue) {
      used.add(cue);
      const startMs = Math.round(cue.start * 1000);
      const endMs = Math.round(Math.min(cue.end, duration) * 1000);
      if (endMs > startMs) {
        timings.push({ sentenceNo: sentence.sentenceNo, startMs, endMs });
        continue;
      }
    }
    reviewSentenceNos.push(sentence.sentenceNo);
  }
  return { timings, reviewSentenceNos, autoAdjustedSentenceNos: [] as number[] };
}
