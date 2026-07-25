#!/usr/bin/env node

import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const value = argv[index + 1]?.startsWith("--") ? "true" : argv[index + 1];
    args[key] = value ?? "true";
    if (value !== "true") index += 1;
  }
  return args;
}

function parsePageRange(value) {
  if (!value) return [];
  return value.split(",").flatMap((part) => {
    const trimmed = part.trim();
    if (!trimmed) return [];
    const [startRaw, endRaw] = trimmed.split("-").map((number) => Number(number.trim()));
    if (!Number.isInteger(startRaw)) return [];
    if (!Number.isInteger(endRaw)) return [startRaw];
    const start = Math.min(startRaw, endRaw);
    const end = Math.max(startRaw, endRaw);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with ${code}\n${stderr}`));
    });
  });
}

async function renderPages({ dpi, pages, pdf, workDir }) {
  if (pages.length === 0) return new Map();
  const first = Math.min(...pages);
  const last = Math.max(...pages);
  const prefix = path.join(workDir, "page");
  await run("pdftoppm", ["-f", String(first), "-l", String(last), "-png", "-r", String(dpi), pdf, prefix]);
  const files = await readdir(workDir);
  const imageByPage = new Map();
  for (const page of pages) {
    const suffix = String(page).padStart(3, "0");
    const match = files.find((file) => file === `page-${suffix}.png`);
    if (match) imageByPage.set(page, path.join(workDir, match));
  }
  return imageByPage;
}

async function ocrPages(imageByPage) {
  const results = [];
  for (const [page, imagePath] of [...imageByPage.entries()].sort((a, b) => a[0] - b[0])) {
    const { stdout } = await run("tesseract", [imagePath, "stdout", "-l", "eng", "--psm", "6"], { capture: true });
    results.push({ page, text: stdout.trim() });
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pdf = args.pdf;
  const readingPages = parsePageRange(args["reading-pages"] ?? args.pages);
  const answerPages = parsePageRange(args["answer-pages"]);
  const out = args.out;
  const dpi = Number(args.dpi ?? 140);

  if (!pdf || !out || (readingPages.length === 0 && answerPages.length === 0)) {
    throw new Error(
      "Usage: node scripts/extract-reading-ocr.mjs --pdf <file.pdf> --reading-pages 17-29 --answer-pages 119 --out /tmp/output.json",
    );
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "ielts-reading-ocr-"));
  try {
    const allPages = [...new Set([...readingPages, ...answerPages])];
    const imageByPage = await renderPages({ dpi, pages: allPages, pdf, workDir });
    const ocr = await ocrPages(imageByPage);
    const byPage = new Map(ocr.map((page) => [page.page, page]));
    const payload = {
      answerPages: answerPages.map((page) => byPage.get(page)).filter(Boolean),
      dpi,
      pdf,
      readingPages: readingPages.map((page) => byPage.get(page)).filter(Boolean),
    };
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`);
    const stats = await readFile(out, "utf8");
    process.stdout.write(`Wrote ${out} (${stats.length} chars)\n`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
