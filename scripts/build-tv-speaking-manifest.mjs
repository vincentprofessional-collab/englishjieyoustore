import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const sourceRoot = process.env.TV_SPEAKING_SOURCE_ROOT ?? "/Volumes/My HDD3/影视视频";
const outputPath = path.join(process.cwd(), "data", "tv-speaking", "clips.json");
const vocabularyPath = path.join(process.cwd(), "src", "data", "vocabulary", "flat-vocabulary.json");
const requestedCount = 100;

function wordsFromFilename(filename) {
  const stem = filename
    .replace(/\.mp4$/i, "")
    .replace(/^\d+_\d+分\d+_?/, "")
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, " ");
  return stem.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) ?? [];
}

function chineseFromFilename(filename) {
  return (filename.match(/[\u3400-\u9fff]+/g) ?? []).join(" ").trim();
}

function shortDefinition(definition = "") {
  const firstLine = definition.split("\n")[0] ?? "";
  return firstLine
    .replace(/^[a-z]+\.\s*/i, "")
    .split(/[；;]/)[0]
    .trim();
}

const dictionary = new Map(
  JSON.parse(readFileSync(vocabularyPath, "utf8"))
    .filter((entry) => entry?.word && entry?.def)
    .map((entry) => [String(entry.word).toLowerCase(), shortDefinition(entry.def)]),
);

const candidates = readdirSync(sourceRoot, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isFile() &&
      !entry.name.startsWith("._") &&
      entry.name.toLowerCase().endsWith(".mp4"),
  )
  .map((entry) => {
    const words = wordsFromFilename(entry.name);
    const english = words.join(" ").trim();
    const sourcePath = path.join(sourceRoot, entry.name);
    return {
      english,
      filename: entry.name,
      sourcePath,
      sizeBytes: statSync(sourcePath).size,
      wordCount: words.length,
    };
  })
  .filter((entry) => entry.english)
  .sort(
    (left, right) =>
      left.wordCount - right.wordCount ||
      left.english.length - right.english.length ||
      left.sizeBytes - right.sizeBytes ||
      left.filename.localeCompare(right.filename, "en"),
  );

const seenEnglish = new Set();
const uniqueCandidates = [];
for (const candidate of candidates) {
  const normalized = candidate.english.toLowerCase();
  if (seenEnglish.has(normalized)) continue;
  seenEnglish.add(normalized);
  uniqueCandidates.push(candidate);
}

if (uniqueCandidates.length < requestedCount) {
  throw new Error(`Expected ${requestedCount} clips, found ${uniqueCandidates.length}.`);
}

const boundary = uniqueCandidates[requestedCount - 1];
const probePool = uniqueCandidates.filter(
  (candidate) =>
    candidate.wordCount < boundary.wordCount ||
    (candidate.wordCount === boundary.wordCount && candidate.english.length <= boundary.english.length),
);
const probedCandidates = probePool.map((candidate) => {
  const media = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,width,height",
        "-of",
        "json",
        candidate.sourcePath,
      ],
      { encoding: "utf8" },
    ),
  );
  return {
    ...candidate,
    durationSeconds: Number(Number(media.format?.duration ?? 0).toFixed(3)),
    videoStream: media.streams?.find((stream) => stream.codec_type === "video") ?? {},
  };
});
const selected = probedCandidates
  .filter((candidate) => candidate.durationSeconds > 0 && candidate.durationSeconds <= 15)
  .sort(
    (left, right) =>
      left.wordCount - right.wordCount ||
      left.english.length - right.english.length ||
      left.durationSeconds - right.durationSeconds ||
      left.sizeBytes - right.sizeBytes ||
      left.filename.localeCompare(right.filename, "en"),
  )
  .slice(0, requestedCount);

const clips = selected.map((candidate, index) => {
  const normalizedEnglish = candidate.english.toLowerCase();
  const id = createHash("sha256").update(candidate.filename).digest("hex").slice(0, 16);
  const filenameChinese = chineseFromFilename(candidate.filename);

  return {
    chinese: filenameChinese || dictionary.get(normalizedEnglish) || "",
    durationSeconds: candidate.durationSeconds,
    english: candidate.english,
    height: Number(candidate.videoStream.height ?? 0),
    id: `tv_${id}`,
    rank: index + 1,
    sizeBytes: candidate.sizeBytes,
    sourceFilename: candidate.filename,
    storagePath: `tv-speaking/${String(index + 1).padStart(3, "0")}-${id}.mp4`,
    videoUrl: null,
    width: Number(candidate.videoStream.width ?? 0),
    wordCount: candidate.wordCount,
  };
});

const manifest = {
  clips,
  generatedAt: new Date().toISOString(),
  selection: {
    count: requestedCount,
    duplicatePolicy: "unique normalized English text",
    durationPolicy: "valid clips up to 15 seconds",
    sort: ["English word count asc", "English character count asc", "video duration asc"],
    sourceRoot,
  },
  title: "看美剧学口语",
  version: 1,
};

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  JSON.stringify({
    count: clips.length,
    maxWordCount: Math.max(...clips.map((clip) => clip.wordCount)),
    outputPath,
    sourceMiB: Number((clips.reduce((sum, clip) => sum + clip.sizeBytes, 0) / 2 ** 20).toFixed(2)),
  }),
);
