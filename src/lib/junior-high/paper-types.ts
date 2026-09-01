export type JuniorHighGroupType =
  | "choice"
  | "inline-blank"
  | "cloze"
  | "dialogue-completion"
  | "reading-passage"
  | "table-reading"
  | "writing"
  | "source";

export type JuniorHighLayoutFamily =
  | "passage-choice"
  | "standalone-choice"
  | "inline-blank"
  | "table-fill"
  | "dialogue-completion"
  | "short-answer"
  | "writing";

export type JuniorHighTableType =
  | "plain"
  | "two-column"
  | "merged-header"
  | "info-conversion"
  | "table-reading";

export type JuniorHighSourceProvenance = {
  sourceFile: string;
  sourcePage: number[] | null;
  sourceSection?: string;
  sourceLineStart?: number;
  sourceLineEnd?: number;
  analysisFile?: string;
  analysisPage?: number[] | null;
  analysisLineStart?: number;
  analysisLineEnd?: number;
  originalNumber?: string;
  extractionMethod: "docx-ooxml" | "pdf-text" | "ocr" | "manual" | "markdown-structured";
  pageMappingMethod?: "rendered-docx-visual-review" | "pdf-page" | "ocr-page" | "manual" | "markdown-line";
  confidence: number;
  needsReview: boolean;
  reviewFlags: string[];
};

export type JuniorHighQuestion = {
  id: string;
  number: number;
  displayNumber?: string;
  sourceQuestionNumber?: string;
  partId?: string;
  sectionId?: string;
  groupId?: string;
  inputKind?: "choice" | "blank" | "text" | "writing";
  type: string;
  prompt: string;
  context: string;
  options: string[];
  sourceBlockIds?: string[];
  leadBlocks?: JuniorHighBlock[];
  image?: string;
  optionImages?: { label: string; src: string; alt?: string }[];
  answer: string;
  analysis: string;
  source?: JuniorHighSourceProvenance;
};

export type JuniorHighBlock = {
  id: string;
  kind: "paragraph" | "table" | "image" | "audio";
  text?: string;
  rows?: string[][];
  tableType?: JuniorHighTableType;
  src?: string;
  alt?: string;
};

export type JuniorHighSection = {
  id: string;
  title: string;
  instructions: string[];
  blocks: JuniorHighBlock[];
  displayBlocks?: JuniorHighBlock[];
  questionIds: string[];
};

export type JuniorHighQuestionGroup = {
  id: string;
  marker?: string;
  title: string;
  instructions: string[];
  blocks: JuniorHighBlock[];
  displayBlocks?: JuniorHighBlock[];
  questionIds: string[];
  audio?: string[];
  inputMode?: "choice" | "inline-blank" | "text";
  groupType?: JuniorHighGroupType;
  layoutFamily?: JuniorHighLayoutFamily;
  source?: JuniorHighSourceProvenance;
};

export type JuniorHighPart = {
  id: string;
  marker?: string;
  title: string;
  instructions: string[];
  groups: JuniorHighQuestionGroup[];
};

export type JuniorHighWritingTask = {
  id: string;
  number?: number;
  displayNumber?: string;
  sourceQuestionNumber?: string;
  label: string;
  prompt: string;
  requirements: string;
  analysis?: string;
  opening?: string;
  closing?: string;
  table?: string[][];
  image?: string;
  wordMin?: number;
  wordMax?: number;
  source?: JuniorHighSourceProvenance;
};

export type JuniorHighBook = {
  letter: string;
  title: string;
  description: string;
  image?: string;
  author?: string;
  site?: string;
  format?: string;
  price?: string;
};

export type JuniorHighWriting = {
  title?: string;
  promptA: string;
  requirementsA: string;
  openingA?: string;
  closingA?: string;
  tableA?: [string, string][];
  promptB: string;
  requirementsB: string;
  contentPointsB?: string;
  openingB?: string;
  closingB?: string;
  diagram?: string;
};

export type JuniorHighPaper = {
  schemaVersion?: string;
  year: number;
  region: string;
  label: string;
  layout?: "beijing" | "generic" | "structured" | "practice";
  /** Legacy scoped views may keep parent numbers; source practice cards always reset this to false. */
  preserveQuestionNumbers?: boolean;
  practiceAuditFlags?: string[];
  displayTitle?: string;
  durationMinutes: number;
  fileName: string;
  analysisFileName: string;
  sourceDirectory: string;
  questionType?: string;
  topicGroup?: string;
  sourceText?: string;
  questions: JuniorHighQuestion[];
  readingA: {
    instructions: string;
    books: JuniorHighBook[];
  };
  writing: JuniorHighWriting;
  sections?: JuniorHighSection[];
  parts?: JuniorHighPart[];
  writingTasks?: JuniorHighWritingTask[];
  sourceBlocks?: JuniorHighBlock[];
  assets?: {
    cloze?: string;
    readingA?: string | string[];
    readingB?: string | string[];
    readingC?: string | string[];
    readingD?: string | string[];
    readingResponse?: string | string[];
    all?: string[];
    audio?: string[];
  };
  provenance?: {
    schemaVersion: string;
    sources: Array<{
      role: "original" | "analysis" | "supplement";
      sourceFile: string;
      mimeType: string;
      pageCount: number | null;
      sha256?: string;
      extractionMethod: JuniorHighSourceProvenance["extractionMethod"];
    }>;
    reviewStatus: "verified" | "needs-review";
    reviewFlags: string[];
    notes?: string[];
  };
};
