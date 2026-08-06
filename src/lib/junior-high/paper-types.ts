export type JuniorHighQuestion = {
  id: string;
  number: number;
  type: string;
  prompt: string;
  context: string;
  options: string[];
  image?: string;
  answer: string;
  analysis: string;
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
  layout?: "beijing" | "generic";
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
  assets?: {
    cloze?: string;
    readingA?: string | string[];
    readingB?: string | string[];
    readingC?: string | string[];
    readingD?: string | string[];
    readingResponse?: string | string[];
    all?: string[];
  };
};
