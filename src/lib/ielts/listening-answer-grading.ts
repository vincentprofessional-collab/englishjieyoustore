import runtimeAnswerGroupRegistry from "./generated-listening-answer-groups.json" with { type: "json" };
import { normalizeListeningChoiceSelection } from "./listening-choice-selection.mjs";
import { fingerprintListeningQuestions } from "./listening-runtime-fingerprint.mjs";

export type ListeningAnswerQuestion = {
  answers: string[];
  id: string;
  promptText?: string | null;
  questionNo: number;
  questionType?: string;
};

export type ListeningAnswerGroup = {
  groupId?: string;
  id: string;
  mode: "unordered_distinct_slots" | "unordered_set_single_slot";
  questionNos: number[];
  selectionCount: number;
  valueKind?: "choice_letters" | "text_values";
};

export type ListeningContentSegment =
  | string
  | { answerPrefix?: string; answerSuffix?: string; questionNo: number; showQuestionNumber?: boolean }
  | {
      fontFamily?: "sans" | "serif";
      italic?: boolean;
      size?: "body" | "title";
      strong?: boolean;
      text: string;
      underline?: boolean;
    };

export type ListeningContentBlock =
  | { type: "paragraph"; segments: ListeningContentSegment[] }
  | {
      type: "list";
      items: ListeningContentSegment[][];
      style?: "bullet" | "dash" | "number" | "none";
    }
  | {
      type: "table";
      headers?: ListeningContentSegment[][];
      rows: ListeningContentSegment[][][];
      sourceShape?: { bodyRows: number; columns: number };
      title?: string;
      variant?: "borderless" | "form";
    }
  | { type: "flow"; steps: ListeningContentSegment[][] }
  | {
      type: "image";
      alt?: string;
      crop?: { height: number; width: number; x: number; y: number };
      sourceRef: string;
    }
  | {
      answerLabel?: string;
      label?: string;
      options?: Array<{ letter: string; text: string }>;
      segments: ListeningContentSegment[];
      type: "example";
    };

export type ListeningQuestionGroup = {
  content?: ListeningContentBlock[];
  framed?: boolean;
  id: string;
  instructions: string[];
  layout: string;
  options?: Array<{ letter: string; text: string }>;
  optionsLayout?: "single-column" | "source-columns";
  optionsTitle?: string | null;
  questionNos: number[];
  rangeHeading?: string | null;
  renderMode: string;
  showRangeHeading?: boolean;
  sourceRefs: string[];
  title: string | null;
};

export type ListeningRuntimeGroupMetadata = {
  answerGroups: ListeningAnswerGroup[];
  groups: ListeningQuestionGroup[];
  metadataStatus: "matched" | "mismatch" | "missing" | "unsupported-schema";
  questionImageRefs: string[];
};

type ListeningRuntimeRegistryMetadata = Omit<ListeningRuntimeGroupMetadata, "metadataStatus"> & {
  questionFingerprint: string;
};

export type ListeningAnswerContext = {
  answerGroups?: ListeningAnswerGroup[];
  answers: Record<string, string>;
  bookCode: string;
  questions: ListeningAnswerQuestion[];
  sectionNo: number;
  testNo: number;
};

function emptyRuntimeGroupMetadata(
  metadataStatus: ListeningRuntimeGroupMetadata["metadataStatus"],
): ListeningRuntimeGroupMetadata {
  return { answerGroups: [], groups: [], metadataStatus, questionImageRefs: [] };
}

export function parseListeningRuntimeRegistry(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    (value as { schemaVersion?: unknown }).schemaVersion !== 2
  ) {
    return {} as Record<string, ListeningRuntimeRegistryMetadata>;
  }
  const sections = (value as { sections?: unknown }).sections;
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return {} as Record<string, ListeningRuntimeRegistryMetadata>;
  }

  return Object.fromEntries(
    Object.entries(sections).filter(([, metadata]) => {
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
      const candidate = metadata as Partial<ListeningRuntimeRegistryMetadata>;
      return (
        Array.isArray(candidate.answerGroups) &&
        Array.isArray(candidate.groups) &&
        /^v1:[a-f0-9]{32}$/.test(candidate.questionFingerprint ?? "") &&
        Array.isArray(candidate.questionImageRefs)
      );
    }),
  ) as Record<string, ListeningRuntimeRegistryMetadata>;
}

const RUNTIME_ANSWER_GROUPS = parseListeningRuntimeRegistry(runtimeAnswerGroupRegistry);
const RUNTIME_REGISTRY_SCHEMA_SUPPORTED =
  (runtimeAnswerGroupRegistry as { schemaVersion?: unknown }).schemaVersion === 2;

export function getListeningRuntimeGroupMetadata(
  bookCode: string,
  testNo: number,
  sectionNo: number,
  questions: ListeningAnswerQuestion[],
): ListeningRuntimeGroupMetadata {
  if (!RUNTIME_REGISTRY_SCHEMA_SUPPORTED) {
    return emptyRuntimeGroupMetadata("unsupported-schema");
  }
  const metadata = RUNTIME_ANSWER_GROUPS[`${bookCode}:${testNo}:${sectionNo}`];
  if (!metadata) {
    return emptyRuntimeGroupMetadata("missing");
  }
  if (metadata.questionFingerprint !== fingerprintListeningQuestions(questions)) {
    return {
      answerGroups: metadata.answerGroups,
      groups: metadata.groups,
      metadataStatus: "mismatch",
      questionImageRefs: metadata.questionImageRefs,
    };
  }
  return {
    answerGroups: metadata.answerGroups,
    groups: metadata.groups,
    metadataStatus: "matched",
    questionImageRefs: metadata.questionImageRefs,
  };
}

export function normalizeListeningAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?'"“”‘’()\[\]\s-]/g, "");
}

export function isListeningQuestionCorrect(
  context: ListeningAnswerContext,
  question: ListeningAnswerQuestion,
) {
  const answerGroups = context.answerGroups ?? getListeningRuntimeGroupMetadata(
    context.bookCode,
    context.testNo,
    context.sectionNo,
    context.questions,
  ).answerGroups;
  const group = answerGroups.find(
    (answerGroup) => answerGroup.questionNos.includes(question.questionNo),
  );

  if (group?.mode === "unordered_distinct_slots") {
    const selectedAnswers = new Set(
      context.questions
        .filter((item) => group.questionNos.includes(item.questionNo))
        .map((item) => normalizeListeningAnswer(context.answers[item.id] ?? ""))
        .filter(Boolean),
    );
    return question.answers
      .map(normalizeListeningAnswer)
      .filter(Boolean)
      .some((acceptedAnswer) => selectedAnswers.has(acceptedAnswer));
  }

  if (group?.mode === "unordered_set_single_slot") {
    const normalizeSelection = group.valueKind === "text_values"
      ? normalizeUnorderedTextSelection
      : normalizeUnorderedChoiceSelection;
    const selectedAnswers = normalizeSelection(context.answers[question.id] ?? "", group.selectionCount);
    return question.answers.some(
      (acceptedAnswer) =>
        normalizeSelection(acceptedAnswer, group.selectionCount) === selectedAnswers &&
        selectedAnswers !== "",
    );
  }

  const userAnswer = normalizeListeningAnswer(context.answers[question.id] ?? "");
  return question.answers.map(normalizeListeningAnswer).includes(userAnswer);
}

function normalizeUnorderedChoiceSelection(value: string, selectionCount: number) {
  const letters = normalizeListeningChoiceSelection(value);
  return letters.length === selectionCount ? letters.join("") : "";
}

function normalizeUnorderedTextSelection(value: string, selectionCount: number) {
  const selections = String(value ?? "")
    .split(/\s*(?:,|&|\band\b)\s*/i)
    .map(normalizeListeningAnswer)
    .filter(Boolean);
  return selections.length === selectionCount && new Set(selections).size === selections.length
    ? [...selections].sort().join("|")
    : "";
}

export function toggleOrderedChoiceSelection(
  currentSelection: string[],
  letter: string,
  checked: boolean,
  maximumSelections: number,
) {
  const normalizedLetter = letter.trim().toUpperCase();
  const nextSelection = new Set(
    currentSelection.map((value) => value.trim().toUpperCase()).filter(Boolean),
  );

  if (checked) {
    if (nextSelection.has(normalizedLetter) || nextSelection.size >= maximumSelections) {
      return [...nextSelection].sort();
    }
    nextSelection.add(normalizedLetter);
  } else {
    nextSelection.delete(normalizedLetter);
  }

  return [...nextSelection].sort();
}
