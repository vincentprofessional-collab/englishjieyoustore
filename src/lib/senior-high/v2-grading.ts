import type { SeniorHighAnswerSpec, SeniorHighQuestion } from "./v2-types";

export type SeniorHighV2Answers = Record<string, string>;
export type SeniorHighGrade = "correct" | "incorrect" | "manual" | "none" | "conflict" | "unanswered";

function normalizeAnswer(value: string, answerSpec: SeniorHighAnswerSpec) {
  const rules = answerSpec.normalization;
  let normalized = rules?.unicodeNfkc ? value.normalize("NFKC") : value;
  if (rules?.trim) normalized = normalized.trim();
  if (rules?.collapseSpaces) normalized = normalized.replace(/\s+/g, " ");
  if (rules?.stripTrailingPunctuation) normalized = normalized.replace(/[.,!?;:，。！？；：]+$/u, "");
  if (!rules?.caseSensitive) normalized = normalized.toLocaleLowerCase("en");
  return normalized;
}

function matches(value: string, accepted: string[], answerSpec: SeniorHighAnswerSpec) {
  const actual = normalizeAnswer(value, answerSpec);
  return accepted.some((candidate) => normalizeAnswer(candidate, answerSpec) === actual);
}

export function seniorHighQuestionAnswered(question: SeniorHighQuestion, answers: SeniorHighV2Answers) {
  if (question.blanks.length > 0) return question.blanks.every((blank) => Boolean(answers[blank.blankId]?.trim() || answers[question.id]?.trim()));
  return Boolean(answers[question.id]?.trim());
}

export function gradeSeniorHighQuestion(question: SeniorHighQuestion, answers: SeniorHighV2Answers): SeniorHighGrade {
  const spec = question.answerSpec;
  if (spec.availability === "conflict") return "conflict";
  if (spec.availability === "none" || spec.gradingMode === "none") return "none";
  if (!seniorHighQuestionAnswered(question, answers)) return "unanswered";
  if (spec.gradingMode === "manual") return "manual";
  if (spec.kind === "choice") return matches(answers[question.id] || "", spec.acceptedAnswers || [], spec) ? "correct" : "incorrect";
  if (spec.kind === "multi_choice") {
    const actual = (answers[question.id] || "").split(",").filter(Boolean).sort().join(",");
    const expected = [...(spec.acceptedAnswers || [])].sort().join(",");
    return actual && actual === expected ? "correct" : "incorrect";
  }
  if (spec.kind === "text") return matches(answers[question.id] || "", spec.acceptedAnswers || [], spec) ? "correct" : "incorrect";
  if (spec.kind === "per_blank") {
    const correct = question.blanks.every((blank) => matches(answers[blank.blankId] || "", spec.perBlankAnswers?.[blank.blankId] || [], spec));
    return correct ? "correct" : "incorrect";
  }
  return "manual";
}

export function seniorHighCorrectAnswer(question: SeniorHighQuestion) {
  const spec = question.answerSpec;
  if (spec.kind === "choice" || spec.kind === "multi_choice" || spec.kind === "text") return (spec.acceptedAnswers || []).join(" / ");
  if (spec.kind === "per_blank") {
    if (question.blanks.length === 1) return (spec.perBlankAnswers?.[question.blanks[0].blankId] || []).join(" / ");
    return question.blanks.map((blank, index) => `${blank.label || `第 ${index + 1} 空`}: ${(spec.perBlankAnswers?.[blank.blankId] || []).join(" / ")}`).join("；");
  }
  return "";
}
