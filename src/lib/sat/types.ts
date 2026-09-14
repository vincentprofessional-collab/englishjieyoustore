export type SatSourceRef = {
  role: "question" | "answer";
  path: string;
  sha256: string;
  pages: number[];
  extractionMethod: string;
};

export type SatParagraphBlock = { type: "paragraph" | "quote"; text: string };
export type SatNotesBlock = { type: "notes"; items: string[] };
export type SatTableBlock = {
  type: "table";
  title?: string;
  rows: string[][];
  rawText?: string;
  asset?: string;
};
export type SatFigureBlock = {
  type: "figure";
  title?: string;
  text: string;
  asset?: string;
};
export type SatTwoTextBlock = {
  type: "twoText";
  texts: Array<{ label: string; blocks: SatContentBlock[] }>;
};
export type SatContentBlock =
  | SatParagraphBlock
  | SatNotesBlock
  | SatTableBlock
  | SatFigureBlock
  | SatTwoTextBlock;

export type SatChoice = { id: "A" | "B" | "C" | "D"; text: string };

export type SatQuestion = {
  id: string;
  assessment: "SAT";
  test: "Reading and Writing";
  domain: string;
  skill: string;
  difficulty: "Easy" | "Medium" | "Hard";
  contentBlocks: SatContentBlock[];
  prompt: string;
  choices: SatChoice[];
  correctAnswer: SatChoice["id"];
  rationale: string;
  choiceRationales?: Partial<Record<SatChoice["id"], string>>;
  sourceRefs: SatSourceRef[];
  reviewStatus: "verified" | "review_required";
  reviewFlags: string[];
  contentDuplicateGroup?: string;
};

export type SatSet = {
  id: string;
  assessment: "SAT";
  test: "Reading and Writing";
  domain: string;
  skill: string;
  difficulty: "Easy" | "Medium" | "Hard";
  expectedCount: number;
  questionIds: string[];
  sourceRefs: Array<Pick<SatSourceRef, "role" | "path" | "sha256">>;
  questions: SatQuestion[];
};

export type SatSetSummary = Omit<SatSet, "questions" | "sourceRefs"> & {
  sourceRefs: Array<Pick<SatSourceRef, "role" | "path" | "sha256">>;
};

export type SatDomain = {
  id: string;
  label: string;
  skills: Array<{ id: string; label: string }>;
};

export type SatCatalogIndex = {
  generatedAt: string;
  assessment: "SAT";
  test: "Reading and Writing";
  totalQuestionCount: number;
  expectedQuestionCount: number;
  domains: SatDomain[];
  sets: SatSetSummary[];
};

export type SatProgress = {
  answers: Partial<Record<string, SatChoice["id"]>>;
  graded: Partial<Record<string, "correct" | "incorrect">>;
  submitted: Record<string, boolean>;
  currentIndex: number;
  expanded: Record<string, boolean>;
};
