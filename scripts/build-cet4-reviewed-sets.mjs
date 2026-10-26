import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertCet4PublicFile, validateReviewedCet4Set } from "./lib/cet4-publication.mjs";

export async function buildReviewedCet4Sets() {
  const manifest = JSON.parse(await readFile("src/data/cet4/source-review.json", "utf8"));
  if (manifest.sets.filter((set) => set.kind === "paper").length !== 46) throw new Error("CET-4: the 46-paper source review is incomplete");
  const publicationSets = manifest.sets.map((set) => set.id !== "practice-cet4-matching" ? set : {
    ...set,
    sections: set.sections.map((section) => ({
      ...section,
      groups: section.groups.map((group) => ({
        ...group,
        questions: group.questions.map((question) => /skimming and scanning/i.test(group.title) && question.typeLabel === "长篇阅读" ? { ...question, typeLabel: "快速阅读" } : question),
      })),
    })),
  });
  async function checkPublicDirectory(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("CET-4: source-directory symlinks must remain offline");
      if (entry.isDirectory()) await checkPublicDirectory(file);
      else assertCet4PublicFile(path.relative("public/cet4", file));
    }
  }
  await checkPublicDirectory("public/cet4");
  const summaries = [];
  // Validate the entire replacement batch before mutating generated payloads.
  for (const set of publicationSets) {
    validateReviewedCet4Set(set);
    for (const asset of set.assetRefs.filter((asset) => asset.kind === "image")) {
      const bytes = await readFile(path.join("public", asset.url));
      if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256) throw new Error(`${set.id}: evidence hash changed`);
      if (!manifest.cleanedImageHashes.includes(asset.sha256)) throw new Error(`${set.id}: unapproved source image`);
    }
    for (const asset of set.assetRefs.filter((asset) => asset.kind === "audio")) {
      if (!asset.url.startsWith("/cet4/audio/")) throw new Error(`${set.id}: unapproved audio location`);
      const bytes = await readFile(path.join("public", asset.url));
      if (!/^[a-f0-9]{64}$/.test(asset.sha256) || createHash("sha256").update(bytes).digest("hex") !== asset.sha256) throw new Error(`${set.id}: audio hash changed`);
    }
  }
  for (const set of publicationSets) {
    const directory = path.join("public/cet4", set.kind === "paper" ? "papers" : "practice");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${set.id}.json`), JSON.stringify(set) + "\n");
    const questions = set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions));
    summaries.push({ id: set.id, kind: set.kind, title: set.title, year: set.year,
      region: set.region, variant: set.variant, questionCount: questions.length,
      answeredCount: questions.filter((q) => q.answerSpec.availability === "answered").length,
      explanationCount: questions.filter((q) => q.explanationBlocks.some((block) => block.type !== "notice") || q.answerSpec.kind === "reference" || set.sections.some((s) => s.groups.some((g) => g.questions.includes(q) && g.explanationBlocks?.length))).length,
      answerStatus: "answered", questionTypes: [...new Set(questions.map((q) => q.type))],
      href: `/cet4/${set.id}`, quality: set.quality,
      ...(set.coverageNote ? { coverageNote: set.coverageNote } : {}),
    });
  }
  // Retain neutral provenance metadata only. Raw document bodies and answers
  // must not be bundled into any server route or future upload.
  await writeFile("src/data/cet4/library.json", JSON.stringify({ contentSource: "reviewed-question-payloads", entries: manifest.sets.filter((set) => set.kind === "paper").map((set) => ({
    id: set.id, title: set.title, section: "试卷", topic: "历年真题", sourceFiles: set.sourceRefs.map((ref) => ref.relativePath), sourceHash: set.sourceRefs[0].sha256,
    excerpt: set.coverageNote || "", body: "", answers: "", audioUrl: set.assetRefs.find((asset) => asset.kind === "audio")?.url || "",
  })) }, null, 2) + "\n");
  // Remove stale generated payloads only after all replacements have passed validation.
  for (const kind of ["papers", "practice"]) {
    const directory = path.join("public/cet4", kind);
    await mkdir(directory, { recursive: true });
    for (const filename of await readdir(directory)) {
      if (filename.endsWith(".json") && !summaries.some((summary) => filename === `${summary.id}.json`)) await rm(path.join(directory, filename));
    }
  }
  // Keep evidence and audio assets as a durable audit trail when manifests change.
  summaries.sort((a, b) => a.kind === b.kind ? b.title.localeCompare(a.title, "zh-CN", { numeric: true }) : a.kind === "practice" ? -1 : 1);
  await writeFile("public/cet4/index.json", JSON.stringify({ schemaVersion: 2, generatedAt: manifest.reviewedAt, entries: summaries }, null, 2) + "\n");
  console.log(`CET-4: ${summaries.filter((s) => s.kind === "paper").length} reviewed papers; ${summaries.filter((s) => s.kind === "practice").length} practice categories; ${summaries.reduce((n, s) => n + s.questionCount, 0)} questions`);
}
