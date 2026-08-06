import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function timecodeToMs(value) {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);

  if (!match) {
    throw new Error("Invalid SRT timecode: " + value);
  }

  const [, hours, minutes, seconds, milliseconds] = match.map(Number);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}

function msToClock(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0") +
    "." +
    String(milliseconds).padStart(3, "0")
  );
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseSrt(rawSrt) {
  return rawSrt
    .replace(/\r/g, "")
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const cueNo = Number(lines[0]);
      const timeMatch = lines[1]?.match(
        /^(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})$/,
      );

      if (!Number.isInteger(cueNo) || !timeMatch) {
        throw new Error("Invalid SRT block: " + block);
      }

      return {
        cueNo,
        englishText: cleanText(lines.slice(2).join(" ")),
        startMs: timecodeToMs(timeMatch[1]),
        endMs: timecodeToMs(timeMatch[2]),
      };
    });
}

export function applyEnglishCorrections(cues, corrections, answerCueMap) {
  return cues.map((cue) => {
    const reviewEnglishText = corrections[cue.cueNo] ?? cue.englishText;
    const changedFromSrt = reviewEnglishText !== cue.englishText;
    const answerQuestionNos = answerCueMap[cue.cueNo] ?? [];

    return {
      cueNo: cue.cueNo,
      time: {
        startMs: cue.startMs,
        endMs: cue.endMs,
        start: msToClock(cue.startMs),
        end: msToClock(cue.endMs),
      },
      srtEnglishText: cue.englishText,
      reviewEnglishText,
      changedFromSrt,
      answerQuestionNos,
      needsHumanReview: false,
    };
  });
}

function readAudioDurationSeconds(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  const output = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
    { encoding: "utf8" },
  );
  const durationSeconds = Number(output.trim());

  return Number.isFinite(durationSeconds) ? durationSeconds : null;
}

function listSmallAudioFiles(smallAudioDir) {
  if (!existsSync(smallAudioDir)) {
    return [];
  }

  return readdirSync(smallAudioDir)
    .filter((name) => /^\d{3}\.mp3$/.test(name))
    .sort()
    .map((name) => path.join(smallAudioDir, name));
}

export function buildSectionAudioTranscriptReview(options) {
  const rawSrt = existsSync(options.srtPath) ? readFileSync(options.srtPath, "utf8") : "";
  const cues = rawSrt ? parseSrt(rawSrt) : [];
  const smallAudioFiles = listSmallAudioFiles(options.smallAudioDir);
  const rows = applyEnglishCorrections(cues, options.corrections, options.answerCueMap);

  const items = rows.map((row) => {
    const fileName = String(row.cueNo).padStart(3, "0") + ".mp3";
    const audioPath = path.join(options.smallAudioDir, fileName);
    const durationSeconds = readAudioDurationSeconds(audioPath);
    const expectedDurationSeconds = (row.time.endMs - row.time.startMs) / 1000;

    return {
      ...row,
      smallAudio: {
        path: audioPath,
        exists: existsSync(audioPath),
        sizeBytes: existsSync(audioPath) ? statSync(audioPath).size : null,
        durationSeconds,
        expectedDurationSeconds,
        durationDeltaSeconds:
          durationSeconds == null ? null : Number((durationSeconds - expectedDurationSeconds).toFixed(3)),
      },
    };
  });

  const missingSmallAudioCount = items.filter((item) => !item.smallAudio.exists).length;
  const changedEnglishCount = items.filter((item) => item.changedFromSrt).length;
  const answerCueCount = items.filter((item) => item.answerQuestionNos.length > 0).length;

  return {
    title: options.title,
    generatedAt: new Date().toISOString(),
    sources: {
      fullAudioPath: options.fullAudioPath,
      smallAudioDir: options.smallAudioDir,
      srtPath: options.srtPath,
    },
    summary: {
      cueCount: cues.length,
      smallAudioCount: smallAudioFiles.length,
      missingSmallAudioCount,
      changedEnglishCount,
      answerCueCount,
      fullAudioExists: existsSync(options.fullAudioPath),
    },
    items,
  };
}
