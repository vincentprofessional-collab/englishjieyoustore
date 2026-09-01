const HASH_SEEDS = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];

function normalizeAnswer(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?\'"“”‘’()\[\]\s-]/g, "");
}

function normalizePrompt(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function acceptedAnswers(question) {
  return Array.isArray(question?.answers)
    ? question.answers
    : [question?.answerText, ...(Array.isArray(question?.variants) ? question.variants : [])];
}

function hashPart(value, seed) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function fingerprintListeningQuestions(questions) {
  const canonical = [...(questions ?? [])]
    .map((question) => ({
      answers: [...new Set(acceptedAnswers(question).map(normalizeAnswer).filter(Boolean))].sort(),
      promptText: normalizePrompt(question?.promptText),
      questionNo: Number(question?.questionNo),
      questionType: String(question?.questionType ?? "").trim().toLowerCase(),
    }))
    .sort((left, right) => left.questionNo - right.questionNo);
  const serialized = JSON.stringify(canonical);
  return `v1:${HASH_SEEDS.map((seed) => hashPart(serialized, seed)).join("")}`;
}
