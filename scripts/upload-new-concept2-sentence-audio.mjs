#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultSourceDir = "/Volumes/My HDD3/备课/新概念/新概念2/新概念2美音版";
const defaultOutputDir = "/private/tmp/new-concept2-sentence-audio";
const bucket = "audio";
const generationConcurrency = 4;
const uploadConcurrency = 4;
const uploadBatchSize = 25;

function readArguments(argv) {
  const options = { execute: false, sourceDir: defaultSourceDir, outputDir: defaultOutputDir };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--execute") options.execute = true;
    else if (["--source-dir", "--output-dir", "--env-file"].includes(argument)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value after ${argument}`);
      options[{ "--source-dir": "sourceDir", "--output-dir": "outputDir", "--env-file": "envFile" }[argument]] = value;
      index += 1;
    } else if (argument === "--help") {
      console.log("Usage: node scripts/upload-new-concept2-sentence-audio.mjs [--source-dir DIR] [--output-dir DIR] [--env-file FILE] [--execute]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function run(binary, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`${basename(binary)} exited ${code}: ${stderr.slice(-1200)}`));
      else resolvePromise({ stdout, stderr });
    });
  });
}

async function mapConcurrent(items, concurrency, callback) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await callback(items[index], index);
    }
  });
  await Promise.all(workers);
}

function normalizeForAlignment(value) {
  return value
    .toLowerCase()
    .replace(/twenty[- ]one/g, "21")
    .replace(/nineteenth/g, "19th")
    .replace(/sixteen/g, "16")
    .replace(/united states of america/g, "usa")
    .replace(/hosptial/g, "hospital")
    .replace(/set to a museum/g, "sent to a museum")
    .replace(/lettters/g, "letters")
    .replace(/[^a-z0-9]/g, "");
}

function parseLrc(source) {
  const cues = [];
  const timeTag = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g;
  for (const line of source.split(/\r?\n/)) {
    const tags = [...line.matchAll(timeTag)];
    if (tags.length === 0) continue;
    const text = line.replace(timeTag, "").trim();
    for (const tag of tags) {
      const fraction = Number(`0.${tag[3]}`);
      cues.push({
        seconds: Number(tag[1]) * 60 + Number(tag[2]) + fraction,
        text,
      });
    }
  }
  return cues.sort((left, right) => left.seconds - right.seconds);
}

function readEnvFile(filePath) {
  const values = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
  }
  return values;
}

function saveJson(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, filePath);
}

async function buildPlan(sourceDir, ffprobe) {
  if (!existsSync(sourceDir)) throw new Error(`Source directory not found: ${sourceDir}`);
  const files = readdirSync(sourceDir).filter((name) => !name.startsWith("._"));
  const lessons = JSON.parse(readFileSync(join(repoRoot, "src/data/new-concept/level-2.json"), "utf8")).lessons;
  const plan = [];

  for (const lesson of lessons) {
    const prefix = String(lesson.lessonNo).padStart(2, "0");
    const lrcName = files.find((name) => name.startsWith(prefix) && name.toLowerCase().endsWith(".lrc"));
    const audioName = files.find((name) => name.startsWith(`新概念2美音${prefix}`) && name.toLowerCase().endsWith(".mp3"));
    if (!lrcName || !audioName) throw new Error(`Lesson ${prefix}: missing source MP3 or LRC file`);

    const sourceAudioPath = join(sourceDir, audioName);
    const durationOutput = await run(ffprobe, [
      "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", sourceAudioPath,
    ]);
    const duration = Number(durationOutput.stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Lesson ${prefix}: could not read MP3 duration`);

    const englishCues = parseLrc(readFileSync(join(sourceDir, lrcName), "utf8"))
      .filter((cue) => /[a-z]/i.test(cue.text))
      .map((cue) => ({ ...cue, normalizedText: normalizeForAlignment(cue.text) }))
      .filter((cue) => cue.normalizedText.length > 0);
    const flattened = [];
    const cueIndexByCharacter = [];
    for (const [cueIndex, cue] of englishCues.entries()) {
      for (const character of cue.normalizedText) {
        flattened.push(character);
        cueIndexByCharacter.push(cueIndex);
      }
    }
    const transcript = flattened.join("");
    let searchFrom = 0;

    for (const [sentenceIndex, englishText] of lesson.english.entries()) {
      const normalizedTarget = normalizeForAlignment(englishText);
      let matchAt = transcript.indexOf(normalizedTarget, searchFrom);
      let reusedEarlierCue = false;
      if (matchAt < 0) {
        matchAt = transcript.indexOf(normalizedTarget);
        reusedEarlierCue = matchAt >= 0;
      }
      if (matchAt < 0) {
        throw new Error(`Lesson ${prefix}, sentence ${sentenceIndex + 1}: transcript text did not align: ${englishText}`);
      }

      const firstCueIndex = cueIndexByCharacter[matchAt];
      const lastCueIndex = cueIndexByCharacter[matchAt + normalizedTarget.length - 1];
      const startSeconds = Math.max(0, englishCues[firstCueIndex].seconds - 0.12);
      const nextCueTime = englishCues[lastCueIndex + 1]?.seconds ?? duration;
      const endSeconds = Math.min(duration, Math.max(startSeconds + 0.45, nextCueTime + 0.08));
      const lessonCode = String(lesson.lessonNo).padStart(3, "0");
      const sentenceCode = String(sentenceIndex + 1).padStart(2, "0");

      plan.push({
        audioPath: `new-concept-sentences/book2/${lessonCode}/${sentenceCode}.mp3`,
        durationSeconds: Number((endSeconds - startSeconds).toFixed(3)),
        endSeconds: Number(endSeconds.toFixed(3)),
        englishText,
        lessonNo: lesson.lessonNo,
        outputPath: join("lessons", lessonCode, `${sentenceCode}.mp3`),
        reusedEarlierCue,
        sentenceNo: sentenceIndex + 1,
        sourceAudioPath,
        sourceAudioBytes: statSync(sourceAudioPath).size,
        startSeconds: Number(startSeconds.toFixed(3)),
      });
      searchFrom = matchAt + normalizedTarget.length;
    }
  }
  return plan;
}

async function generateClips(plan, outputDir, ffmpeg) {
  await mapConcurrent(plan, generationConcurrency, async (clip, index) => {
    const outputPath = join(outputDir, clip.outputPath);
    mkdirSync(join(outputPath, ".."), { recursive: true });
    if (existsSync(outputPath) && statSync(outputPath).size > 1024) return;

    await run(ffmpeg, [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
      "-ss", clip.startSeconds.toFixed(3), "-i", clip.sourceAudioPath,
      "-t", clip.durationSeconds.toFixed(3), "-map", "0:a:0", "-vn",
      "-c:a", "copy", "-avoid_negative_ts", "make_zero", outputPath,
    ]);
    if (!existsSync(outputPath) || statSync(outputPath).size <= 1024) {
      throw new Error(`Generated clip is empty or too small: ${clip.audioPath}`);
    }
    if ((index + 1) % 100 === 0 || index + 1 === plan.length) {
      console.log(`Generated ${index + 1}/${plan.length} clips.`);
    }
  });
}

async function uploadClips(plan, outputDir, envFile, checkpointPath) {
  const env = readEnvFile(envFile);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("The env file must contain SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
  const checkpoint = existsSync(checkpointPath)
    ? JSON.parse(readFileSync(checkpointPath, "utf8"))
    : { uploadedPaths: [] };
  const uploaded = new Set(checkpoint.uploadedPaths);
  const pending = plan.filter((clip) => !uploaded.has(clip.audioPath));
  console.log(`Uploading ${pending.length} clips to Supabase bucket "${bucket}".`);

  for (let offset = 0; offset < pending.length; offset += uploadBatchSize) {
    const batch = pending.slice(offset, offset + uploadBatchSize);
    const results = await Promise.allSettled(batch.map(async (clip) => {
      const filePath = join(outputDir, clip.outputPath);
      const target = `${baseUrl}/storage/v1/object/${bucket}/${clip.audioPath.split("/").map(encodeURIComponent).join("/")}`;
      let lastError;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const response = await fetch(target, {
            method: "PUT",
            headers: {
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "audio/mpeg",
              "x-upsert": "true",
            },
            body: new Uint8Array(readFileSync(filePath)),
            signal: AbortSignal.timeout(60000),
          });
          if (response.ok) return clip.audioPath;
          lastError = `${response.status} ${response.statusText}: ${(await response.text()).slice(0, 240)}`;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
        if (attempt < 3) await new Promise((resolvePromise) => setTimeout(resolvePromise, 700 * (2 ** attempt)));
      }
      throw new Error(`${clip.audioPath}: ${lastError}`);
    }));

    for (const result of results) {
      if (result.status === "fulfilled") uploaded.add(result.value);
    }
    saveJson(checkpointPath, { uploadedPaths: [...uploaded].sort() });
    console.log(`Uploaded and verified ${uploaded.size}/${plan.length} clips.`);
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      throw new Error(`Upload batch had ${failures.length} failure(s): ${failures.map((result) => result.reason?.message ?? "unknown error").join("; ")}`);
    }
  }
}

async function verifyPublicSamples(plan, baseUrl) {
  const samplePaths = [...new Set([plan[0]?.audioPath, plan[Math.floor(plan.length / 2)]?.audioPath, plan.at(-1)?.audioPath].filter(Boolean))];
  for (const audioPath of samplePaths) {
    const target = `${baseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${audioPath.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetch(target, {
      headers: { Range: "bytes=0-0" },
      signal: AbortSignal.timeout(20000),
    });
    if (response.status !== 206 || !response.headers.get("content-type")?.includes("audio/")) {
      throw new Error(`Public audio verification failed for ${audioPath}: HTTP ${response.status}, ${response.headers.get("content-type")}`);
    }
    await response.arrayBuffer();
  }
}

async function main() {
  const options = readArguments(process.argv.slice(2));
  const outputDir = resolve(options.outputDir);
  const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
  const ffprobe = process.env.FFPROBE_PATH ?? "ffprobe";
  const plan = await buildPlan(resolve(options.sourceDir), ffprobe);
  const totalSeconds = plan.reduce((sum, clip) => sum + clip.durationSeconds, 0);
  const repeated = plan.filter((clip) => clip.reusedEarlierCue).length;
  const manifestPath = join(outputDir, "manifest.json");
  const checkpointPath = join(outputDir, "upload-checkpoint.json");
  console.log(`Aligned ${plan.length} sentence clips from 96 New Concept 2 lessons; ${repeated} sentence(s) reused an earlier repeated line.`);
  console.log(`Planned audio duration: ${(totalSeconds / 60).toFixed(1)} minutes. Target key prefix: new-concept-sentences/book2/`);

  if (!options.execute) {
    console.log("Dry run only. Pass --execute to generate and upload the clips.");
    return;
  }
  if (!options.envFile) throw new Error("Pass --env-file FILE when using --execute.");

  mkdirSync(outputDir, { recursive: true });
  saveJson(manifestPath, plan.map(({ outputPath, sourceAudioPath, ...clip }) => ({ outputPath, sourceAudioPath, ...clip })));
  await generateClips(plan, outputDir, ffmpeg);
  await uploadClips(plan, outputDir, options.envFile, checkpointPath);
  const env = readEnvFile(options.envFile);
  await verifyPublicSamples(plan, env.SUPABASE_URL);
  console.log(`Complete: ${plan.length} sentence clips are public in Supabase. Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
