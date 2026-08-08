export type JuniorHighQuestion = {
  id: string;
  number: number;
  displayNumber?: string;
  partId?: string;
  sectionId?: string;
  groupId?: string;
  inputKind?: "choice" | "blank" | "text" | "writing";
  type: string;
  prompt: string;
  context: string;
  options: string[];
  sourceBlockIds?: string[];
  image?: string;
  answer: string;
  analysis: string;
};

export type JuniorHighBlock = {
  id: string;
  kind: "paragraph" | "table" | "image" | "audio";
  text?: string;
  rows?: string[][];
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
  label: string;
  prompt: string;
  requirements: string;
  opening?: string;
  closing?: string;
  table?: string[][];
  image?: string;
  wordMin?: number;
  wordMax?: number;
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
  year: number;
  region: string;
  label: string;
  layout?: "beijing" | "generic" | "structured";
  displayTitle?: string;
  durationMinutes: number;
  fileName: string;
  analysisFileName: string;
  sourceDirectory: string;
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
};
