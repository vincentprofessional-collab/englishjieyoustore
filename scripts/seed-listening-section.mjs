import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();
const defaultDataFile = path.join(rootDir, "scripts/seed-data/listening-demo-section.mjs");
const dataFile = path.resolve(rootDir, process.argv[2] ?? defaultDataFile);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(rootDir, ".env.local"));
loadEnvFile(path.join(rootDir, ".env.seed.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.");
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY. Put it in .env.seed.local before running this seed.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

const VALID_SOURCE_TYPES = new Set(["cambridge", "og", "british_council", "custom"]);
const VALID_QUESTION_TYPES = new Set([
  "fill_blank",
  "single_choice",
  "multiple_choice",
  "matching",
  "map",
  "form",
  "table",
  "flowchart",
  "sentence_completion",
  "summary",
  "short_answer",
]);

function normalizeAnswer(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?'"“”‘’()[\]\s-]/g, "");
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertIntegerOrNull(value, label) {
  if (value == null) {
    return;
  }

  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer because the database column is int.`);
  }
}

function assertStoragePath(value, label) {
  if (value == null) {
    return;
  }

  assertNonEmptyString(value, label);

  if (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")) {
    throw new Error(`${label} must be a Storage object path, not a URL or absolute path.`);
  }

  if (value.startsWith("audio/") || value.startsWith("images/")) {
    throw new Error(
      `${label} should not include the bucket name. Use "listening/ci4/t1/s1/full.mp3", not "audio/listening/...".`,
    );
  }
}

function validateSeedData(seedData) {
  assertPlainObject(seedData, "seedData");
  assertPlainObject(seedData.book, "book");
  assertPlainObject(seedData.test, "test");
  assertPlainObject(seedData.section, "section");

  assertNonEmptyString(seedData.book.code, "book.code");
  assertNonEmptyString(seedData.book.title, "book.title");

  const sourceType = seedData.book.sourceType ?? "custom";
  if (!VALID_SOURCE_TYPES.has(sourceType)) {
    throw new Error(
      `book.sourceType "${sourceType}" is invalid. Use one of: ${Array.from(VALID_SOURCE_TYPES).join(", ")}.`,
    );
  }

  if (!Number.isInteger(seedData.test.testNo)) {
    throw new Error("test.testNo must be an integer.");
  }

  if (!Number.isInteger(seedData.section.sectionNo)) {
    throw new Error("section.sectionNo must be an integer.");
  }

  assertIntegerOrNull(seedData.section.questionCount, "section.questionCount");
  assertIntegerOrNull(seedData.section.timeLimitSeconds, "section.timeLimitSeconds");
  assertStoragePath(seedData.section.fullAudioPath, "section.fullAudioPath");
  assertStoragePath(seedData.section.questionImagePath, "section.questionImagePath");

  if (!Array.isArray(seedData.questions) || seedData.questions.length === 0) {
    throw new Error("questions must be a non-empty array.");
  }

  for (const [index, question] of seedData.questions.entries()) {
    const label = `questions[${index}]`;
    assertPlainObject(question, label);

    if (!Number.isInteger(question.questionNo)) {
      throw new Error(`${label}.questionNo must be an integer.`);
    }

    const questionType = question.questionType ?? "fill_blank";
    if (!VALID_QUESTION_TYPES.has(questionType)) {
      throw new Error(
        `${label}.questionType "${questionType}" is invalid. Use one of: ${Array.from(VALID_QUESTION_TYPES).join(", ")}.`,
      );
    }

    assertNonEmptyString(question.promptText, `${label}.promptText`);
    assertNonEmptyString(question.answerText, `${label}.answerText`);
    assertIntegerOrNull(question.sortOrder, `${label}.sortOrder`);
    assertIntegerOrNull(question.points, `${label}.points`);

    if (question.variants != null && !Array.isArray(question.variants)) {
      throw new Error(`${label}.variants must be an array when provided.`);
    }

    for (const [variantIndex, variant] of (question.variants ?? []).entries()) {
      assertNonEmptyString(variant, `${label}.variants[${variantIndex}]`);
    }
  }

  if (!Array.isArray(seedData.transcriptSentences)) {
    throw new Error("transcriptSentences must be an array.");
  }

  for (const [index, sentence] of seedData.transcriptSentences.entries()) {
    const label = `transcriptSentences[${index}]`;
    assertPlainObject(sentence, label);

    if (!Number.isInteger(sentence.sentenceNo)) {
      throw new Error(`${label}.sentenceNo must be an integer.`);
    }

    if (sentence.speaker != null && typeof sentence.speaker !== "string") {
      throw new Error(`${label}.speaker must be a string when provided.`);
    }

    assertNonEmptyString(sentence.englishText, `${label}.englishText`);
    assertNonEmptyString(sentence.chineseText, `${label}.chineseText`);
    assertStoragePath(sentence.audioPath, `${label}.audioPath`);
    assertIntegerOrNull(sentence.startMs, `${label}.startMs`);
    assertIntegerOrNull(sentence.endMs, `${label}.endMs`);
    assertIntegerOrNull(sentence.sortOrder, `${label}.sortOrder`);

    if (sentence.startMs != null && sentence.endMs != null && sentence.endMs < sentence.startMs) {
      throw new Error(`${label}.endMs must be greater than or equal to startMs.`);
    }
  }
}

async function upsertSingle(table, values, onConflict, select = "id") {
  const { data, error } = await supabase
    .from(table)
    .upsert(values, { onConflict })
    .select(select)
    .single();

  if (error) {
    throw new Error(`${table} upsert failed: ${error.message}`);
  }

  return data;
}

async function verifySeedResult(sectionId, expectedQuestionCount, expectedTranscriptCount) {
  const [
    { data: section, error: sectionError },
    { data: questions, error: questionsError },
    { data: transcript, error: transcriptError },
  ] = await Promise.all([
    supabase
      .from("test_sections")
      .select(
        `
          id,
          title,
          section_no,
          question_count,
          full_audio_path,
          tests (
            id,
            test_no,
            module,
            content_books (
              id,
              code,
              title,
              source_type
            )
          )
        `,
      )
      .eq("id", sectionId)
      .single(),
    supabase
      .from("questions")
      .select("id,question_no,question_type,prompt_text,question_answers(id,answer_text)")
      .eq("section_id", sectionId),
    supabase
      .from("transcript_sentences")
      .select("id,sentence_no,english_text,chinese_text,audio_path,start_ms,end_ms")
      .eq("section_id", sectionId),
  ]);

  if (sectionError || questionsError || transcriptError) {
    throw new Error(
      `Seed verification failed: ${
        sectionError?.message ?? questionsError?.message ?? transcriptError?.message
      }`,
    );
  }

  if (!section) {
    throw new Error("Seed verification failed: section was not found after upsert.");
  }

  if ((questions ?? []).length !== expectedQuestionCount) {
    throw new Error(
      `Seed verification failed: expected ${expectedQuestionCount} questions, found ${
        questions?.length ?? 0
      }.`,
    );
  }

  if ((transcript ?? []).length !== expectedTranscriptCount) {
    throw new Error(
      `Seed verification failed: expected ${expectedTranscriptCount} transcript sentences, found ${
        transcript?.length ?? 0
      }.`,
    );
  }

  for (const question of questions ?? []) {
    if (!question.prompt_text) {
      throw new Error(`Seed verification failed: Q${question.question_no} is missing prompt_text.`);
    }

    if (!question.question_answers || question.question_answers.length === 0) {
      throw new Error(`Seed verification failed: Q${question.question_no} has no answer.`);
    }
  }

  for (const sentence of transcript ?? []) {
    if (!sentence.english_text || !sentence.chinese_text) {
      throw new Error(
        `Seed verification failed: sentence ${sentence.sentence_no} is missing English or Chinese text.`,
      );
    }
  }
}

async function seed() {
  if (!existsSync(dataFile)) {
    throw new Error(`Seed data file not found: ${dataFile}`);
  }

  const { default: seedData } = await import(pathToFileURL(dataFile).href);
  validateSeedData(seedData);

  const book = await upsertSingle(
    "content_books",
    {
      code: seedData.book.code,
      title: seedData.book.title,
      source_type: seedData.book.sourceType ?? "custom",
      is_published: seedData.book.isPublished ?? true,
      is_paid_only: seedData.book.isPaidOnly ?? false,
      access_feature_key: seedData.book.accessFeatureKey ?? "listening.practice",
    },
    "code",
  );

  const test = await upsertSingle(
    "tests",
    {
      book_id: book.id,
      test_no: seedData.test.testNo,
      module: "listening",
      title: seedData.test.title ?? `Test ${seedData.test.testNo}`,
      is_published: seedData.test.isPublished ?? true,
      is_paid_only: seedData.test.isPaidOnly ?? false,
      access_feature_key: seedData.test.accessFeatureKey ?? "listening.practice",
    },
    "book_id,test_no,module",
  );

  const section = await upsertSingle(
    "test_sections",
    {
      test_id: test.id,
      section_no: seedData.section.sectionNo,
      title: seedData.section.title ?? `Section ${seedData.section.sectionNo}`,
      question_count: seedData.section.questionCount ?? seedData.questions.length,
      time_limit_seconds: seedData.section.timeLimitSeconds ?? null,
      full_audio_path: seedData.section.fullAudioPath ?? null,
      question_image_path: seedData.section.questionImagePath ?? null,
      is_paid_only: seedData.section.isPaidOnly ?? false,
      access_feature_key: seedData.section.accessFeatureKey ?? "listening.practice",
    },
    "test_id,section_no",
  );

  for (const [index, question] of seedData.questions.entries()) {
    const questionRow = await upsertSingle(
      "questions",
      {
        section_id: section.id,
        question_no: question.questionNo,
        question_type: question.questionType ?? "fill_blank",
        prompt_text: question.promptText,
        sort_order: question.sortOrder ?? index + 1,
        points: question.points ?? 1,
      },
      "section_id,question_no",
    );

    await upsertSingle(
      "question_answers",
      {
        question_id: questionRow.id,
        answer_text: question.answerText,
        normalized_answer: normalizeAnswer(question.answerText),
        accepts_variants: question.variants?.map(normalizeAnswer) ?? [],
        is_primary: true,
        sort_order: 1,
      },
      "question_id,answer_text",
    );
  }

  for (const [index, sentence] of seedData.transcriptSentences.entries()) {
    await upsertSingle(
      "transcript_sentences",
      {
        section_id: section.id,
        sentence_no: sentence.sentenceNo,
        speaker: sentence.speaker ?? null,
        english_text: sentence.englishText,
        chinese_text: sentence.chineseText,
        audio_path: sentence.audioPath ?? null,
        start_ms: sentence.startMs ?? null,
        end_ms: sentence.endMs ?? null,
        sort_order: sentence.sortOrder ?? index + 1,
      },
      "section_id,sentence_no",
    );
  }

  await verifySeedResult(
    section.id,
    seedData.questions.length,
    seedData.transcriptSentences.length,
  );

  console.log("Listening seed completed.");
  console.log(`Book: ${seedData.book.title}`);
  console.log(`Test: ${seedData.test.testNo}`);
  console.log(`Section id: ${section.id}`);
  console.log(`Open: http://127.0.0.1:3000/listening/${section.id}`);
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
