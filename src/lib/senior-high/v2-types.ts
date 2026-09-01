/**
 * Senior-high content contract v2.
 *
 * The public index contains metadata only. Paper and practice payloads use
 * these controlled blocks and question types; arbitrary HTML is intentionally
 * not part of the contract.
 */

export const SENIOR_HIGH_V2_SCHEMA_VERSION = 2 as const;

export type SeniorHighSetKind = "paper" | "practice";
export type SeniorHighReviewStatus = "approved" | "review_required" | "excluded";
export type SeniorHighQuestionType =
  | "single_choice"
  | "multi_choice"
  | "shared_option_matching"
  | "inline_fill"
  | "multi_blank"
  | "table_fill"
  | "short_answer"
  | "translation"
  | "error_correction"
  | "essay"
  | "oral_response"
  | "instruction_only";

export type SeniorHighInlineRun =
  | { type: "text"; text: string }
  | { type: "blank"; blankId: string };

export type SeniorHighBlock =
  | { type: "heading"; id?: string; level: 1 | 2 | 3 | 4; text: string }
  | { type: "paragraph"; id?: string; runs: SeniorHighInlineRun[] }
  | { type: "richText"; id?: string; runs: SeniorHighInlineRun[] }
  | { type: "image"; id?: string; assetId: string; alt: string; caption?: string }
  | { type: "audio"; id?: string; assetId: string; label?: string }
  | { type: "video"; id?: string; assetId: string; label?: string }
  | {
      type: "table";
      id?: string;
      headers?: SeniorHighBlock[];
      rows: Array<{ cells: SeniorHighBlock[][] }>;
    }
  | {
      type: "dialogue";
      id?: string;
      turns: Array<{ speaker: string; blocks: SeniorHighBlock[] }>;
    }
  | { type: "notice"; id?: string; text: string; tone?: "info" | "warning" };

export type SeniorHighOption = {
  id: string;
  label: string;
  blocks: SeniorHighBlock[];
};

export type SeniorHighBlank = {
  blankId: string;
  label?: string;
  answerShape?: "text" | "number" | "date" | "word" | "sentence";
};

export type SeniorHighAnswerNormalization = {
  unicodeNfkc: true;
  trim: true;
  collapseSpaces: true;
  caseSensitive: boolean;
  stripTrailingPunctuation?: boolean;
};

export type SeniorHighAnswerSpec = {
  availability: "answered" | "none" | "conflict";
  gradingMode: "auto" | "manual" | "none";
  kind: "choice" | "multi_choice" | "text" | "per_blank" | "reference" | "none";
  acceptedAnswers?: string[];
  perBlankAnswers?: Record<string, string[]>;
  normalization?: SeniorHighAnswerNormalization;
  referenceAnswer?: string | SeniorHighBlock[];
  conflictReason?: string;
};

export type SeniorHighSourceLocator = {
  page?: number;
  paragraph?: number | string;
  table?: number | string;
  cell?: string;
  sheet?: string;
  slide?: number;
  audio?: { startSeconds?: number; endSeconds?: number };
};

export type SeniorHighSourceRef = {
  sourceDocumentId: string;
  relativePath: string;
  sha256: string;
  locator: SeniorHighSourceLocator;
  extractionMethod: "docx-xml" | "docx-text" | "doc-html" | "pdf-text" | "pdf-ocr" | "pptx-xml" | "xlsx-cell" | "media-manifest" | "manual-review";
  confidence: number;
};

export type SeniorHighAssetRef = {
  assetId: string;
  kind: "image" | "audio" | "video";
  url: string;
  mimeType: string;
  sha256: string;
  sourceRefs: SeniorHighSourceRef[];
};

export type SeniorHighPlacement =
  | { kind: "standalone" }
  | { kind: "inline" | "table" | "dialogue"; blankIds: string[] };

export type SeniorHighQuestion = {
  id: string;
  displayNumber: number;
  sourceQuestionNumber?: number;
  type: SeniorHighQuestionType;
  promptBlocks: SeniorHighBlock[];
  placement: SeniorHighPlacement;
  options: SeniorHighOption[];
  blanks: SeniorHighBlank[];
  answerSpec: SeniorHighAnswerSpec;
  explanationBlocks: SeniorHighBlock[];
  sourceRefs: SeniorHighSourceRef[];
  reviewStatus: SeniorHighReviewStatus;
};

export type SeniorHighQuestionGroup = {
  id: string;
  title?: string;
  instructions: SeniorHighBlock[];
  stimulusBlocks: SeniorHighBlock[];
  sharedOptions: SeniorHighOption[];
  sharedOptionsReusable?: boolean;
  questions: SeniorHighQuestion[];
};

export type SeniorHighSection = {
  id: string;
  title: string;
  instructions: SeniorHighBlock[];
  score?: number;
  layout: "flow" | "split" | "table" | "dialogue";
  groups: SeniorHighQuestionGroup[];
};

export type SeniorHighSetQuality = {
  structureStatus: SeniorHighReviewStatus;
  structureConfidence: number;
  issueCount: number;
  issues: string[];
};

export type SeniorHighSet = {
  schemaVersion: typeof SENIOR_HIGH_V2_SCHEMA_VERSION;
  id: string;
  kind: SeniorHighSetKind;
  title: string;
  year: string;
  region: string;
  variant: string;
  instructions: SeniorHighBlock[];
  timeLimit?: number;
  score?: number;
  sections: SeniorHighSection[];
  assetRefs: SeniorHighAssetRef[];
  sourceRefs: SeniorHighSourceRef[];
  quality: SeniorHighSetQuality;
};

export type SeniorHighLibraryEntry = {
  id: string;
  kind: SeniorHighSetKind;
  title: string;
  year: string;
  region: string;
  variant: string;
  questionCount: number;
  answeredCount: number;
  explanationCount: number;
  answerStatus: "answered" | "partial" | "none" | "conflict";
  questionTypes: SeniorHighQuestionType[];
  href: string;
  quality: Pick<SeniorHighSetQuality, "structureStatus" | "structureConfidence" | "issueCount">;
};

export type SeniorHighLibraryIndex = {
  schemaVersion: typeof SENIOR_HIGH_V2_SCHEMA_VERSION;
  generatedAt: string;
  entries: SeniorHighLibraryEntry[];
};

export type SeniorHighPaper = SeniorHighSet & { kind: "paper" };
export type SeniorHighPracticeSet = SeniorHighSet & { kind: "practice" };
