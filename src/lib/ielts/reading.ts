import sourceReadingTests from "./source-reading-tests.json";
import type { ReadingPartSource, ReadingSource } from "./reading-source-model";

export type ReadingPartId = string;

export type ReadingDiagramKind = "curved-spokes" | "dashed-spokes" | "extended-spokes";

export type ReadingOption = {
  letter: string;
  text: string;
};

export type ReadingChoiceQuestion = {
  answer?: string | string[];
  diagram?: ReadingDiagramKind;
  instruction?: string;
  questionNumbers: number[];
  options: ReadingOption[];
  prompt: string;
  selectCount?: number;
};

export type ReadingFillQuestion = {
  after?: string;
  answer?: string | string[];
  answerMode?: "all" | "any";
  before: string;
  number: number;
};

export type ReadingHeadingOption = {
  id: string;
  text: string;
};

export type ReadingPassageSection = {
  format?: "pre";
  headingQuestionNumber?: number;
  id: string;
  paragraphs: string[];
};

export type ReadingChoiceBlock = {
  id: string;
  instruction: string;
  questions: ReadingChoiceQuestion[];
  type: "choice";
};

export type ReadingFillBlock = {
  id: string;
  instruction: string;
  questions: ReadingFillQuestion[];
  rawAnswerText?: string;
  rawText?: string;
  title: string;
  type: "fill";
  wordBank?: string[];
};

export type ReadingHeadingsBlock = {
  answers?: Record<number, string>;
  id: string;
  instruction: string;
  options: ReadingHeadingOption[];
  questionNumbers: number[];
  title: string;
  type: "headings";
};

export type ReadingQuestionBlock = ReadingChoiceBlock | ReadingFillBlock | ReadingHeadingsBlock;

export type ReadingPart = {
  id: ReadingPartId;
  intro: string;
  label: string;
  questionBlocks: ReadingQuestionBlock[];
  questionRange: string;
  sections: ReadingPassageSection[];
  subtitle?: string;
  title: string;
  source?: ReadingPartSource;
};

export type ReadingTest = {
  bookCode: string;
  bookTitle: string;
  id: string;
  parts: ReadingPart[];
  testNo: number;
  displayTestNo?: number;
  title: string;
  source?: ReadingSource;
};

// Every published question is backed by an original, sanitized PDF page and a reviewed key.
export const READING_TESTS = (sourceReadingTests as ReadingTest[])
  .filter((test) => test.source?.verified && test.source.sanitized)
  .sort((a, b) => Number(a.bookCode.replace("cambridge-", "")) - Number(b.bookCode.replace("cambridge-", "")) || a.testNo - b.testNo);

export const DEFAULT_READING_TEST = READING_TESTS[0];
export const READING_PARTS: ReadingPart[] = DEFAULT_READING_TEST?.parts ?? [];

export function getReadingTest(id: string) {
  return READING_TESTS.find((test) => test.id === id);
}

export function getReadingPart(id: ReadingPartId, parts: ReadingPart[] = READING_PARTS) {
  return parts.find((part) => part.id === id) ?? parts[0];
}

export function getReadingQuestionNumbers(part: ReadingPart) {
  return part.questionBlocks
    .flatMap((block) => {
      if (block.type === "headings") return block.questionNumbers;
      if (block.type === "fill") return block.questions.map((question) => question.number);
      return block.questions.flatMap((question) => question.questionNumbers);
    })
    .sort((a, b) => a - b);
}
