import sourceReadingTests from "./source-reading-tests.json";
import type { ReadingPartSource } from "./reading-source-model";
import { CAMBRIDGE4_TEST1_PARTS } from "./reading-cambridge4";
import { CAMBRIDGE4_TEST2_PARTS } from "./reading-cambridge4-test2";
import { CAMBRIDGE4_TEST3_PARTS } from "./reading-cambridge4-test3";
import { CAMBRIDGE4_TEST4_PARTS } from "./reading-cambridge4-test4";
import { CAMBRIDGE5_TEST1_PARTS } from "./reading-cambridge5-test1";
import { CAMBRIDGE5_TEST2_PARTS } from "./reading-cambridge5-test2";
import { CAMBRIDGE5_TEST3_PARTS } from "./reading-cambridge5-test3";
import { CAMBRIDGE5_TEST4_PARTS } from "./reading-cambridge5-test4";
import { CAMBRIDGE6_TEST1_PARTS } from "./reading-cambridge6-test1";
import { CAMBRIDGE6_TEST2_PARTS } from "./reading-cambridge6-test2";
import { CAMBRIDGE6_TEST3_PARTS } from "./reading-cambridge6-test3";
import { CAMBRIDGE6_TEST4_PARTS } from "./reading-cambridge6-test4";
import { CAMBRIDGE7_TEST1_PARTS } from "./reading-cambridge7-test1";
import { CAMBRIDGE7_TEST2_PARTS } from "./reading-cambridge7-test2";
import { CAMBRIDGE7_TEST3_PARTS } from "./reading-cambridge7-test3";
import { CAMBRIDGE7_TEST4_PARTS } from "./reading-cambridge7-test4";
import { CAMBRIDGE8_TEST1_PARTS } from "./reading-cambridge8-test1";
import { CAMBRIDGE8_TEST2_PARTS } from "./reading-cambridge8-test2";
import { CAMBRIDGE8_TEST3_PARTS } from "./reading-cambridge8-test3";
import { CAMBRIDGE8_TEST4_PARTS } from "./reading-cambridge8-test4";
import { CAMBRIDGE9_TEST1_PARTS } from "./reading-cambridge9-test1";
import { CAMBRIDGE9_TEST2_PARTS } from "./reading-cambridge9-test2";
import { CAMBRIDGE9_TEST3_PARTS } from "./reading-cambridge9-test3";
import { CAMBRIDGE9_TEST4_PARTS } from "./reading-cambridge9-test4";
import { CAMBRIDGE10_TEST1_PARTS } from "./reading-cambridge10-test1";
import { CAMBRIDGE10_TEST2_PARTS } from "./reading-cambridge10-test2";
import { CAMBRIDGE10_TEST3_PARTS } from "./reading-cambridge10-test3";
import { CAMBRIDGE10_TEST4_PARTS } from "./reading-cambridge10-test4";
import { CAMBRIDGE11_TEST1_PARTS } from "./reading-cambridge11-test1";
import { CAMBRIDGE11_TEST2_PARTS } from "./reading-cambridge11-test2";
import { CAMBRIDGE11_TEST3_PARTS } from "./reading-cambridge11-test3";
import { CAMBRIDGE11_TEST4_PARTS } from "./reading-cambridge11-test4";
import { CAMBRIDGE12_TEST1_PARTS } from "./reading-cambridge12-test1";
import { CAMBRIDGE12_TEST2_PARTS } from "./reading-cambridge12-test2";
import { CAMBRIDGE12_TEST3_PARTS } from "./reading-cambridge12-test3";
import { CAMBRIDGE12_TEST4_PARTS } from "./reading-cambridge12-test4";
import { CAMBRIDGE13_TEST1_PARTS } from "./reading-cambridge13-test1";
import { CAMBRIDGE13_TEST2_PARTS } from "./reading-cambridge13-test2";
import { CAMBRIDGE13_TEST3_PARTS } from "./reading-cambridge13-test3";
import { CAMBRIDGE13_TEST4_PARTS } from "./reading-cambridge13-test4";
import { CAMBRIDGE14_TEST1_PARTS } from "./reading-cambridge14-test1";
import { CAMBRIDGE14_TEST2_PARTS } from "./reading-cambridge14-test2";
import { CAMBRIDGE14_TEST3_PARTS } from "./reading-cambridge14-test3";
import { CAMBRIDGE14_TEST4_PARTS } from "./reading-cambridge14-test4";
import { CAMBRIDGE15_TEST1_PARTS } from "./reading-cambridge15-test1";
import { CAMBRIDGE15_TEST2_PARTS } from "./reading-cambridge15-test2";
import { CAMBRIDGE15_TEST3_PARTS } from "./reading-cambridge15-test3";
import { CAMBRIDGE15_TEST4_PARTS } from "./reading-cambridge15-test4";
import { CAMBRIDGE16_TEST1_PARTS } from "./reading-cambridge16-test1";
import { CAMBRIDGE16_TEST2_PARTS } from "./reading-cambridge16-test2";
import { CAMBRIDGE16_TEST3_PARTS } from "./reading-cambridge16-test3";
import { CAMBRIDGE16_TEST4_PARTS } from "./reading-cambridge16-test4";
import { CAMBRIDGE17_TEST1_PARTS } from "./reading-cambridge17-test1";
import { CAMBRIDGE17_TEST2_PARTS } from "./reading-cambridge17-test2";
import { CAMBRIDGE17_TEST3_PARTS } from "./reading-cambridge17-test3";
import { CAMBRIDGE17_TEST4_PARTS } from "./reading-cambridge17-test4";
import { CAMBRIDGE18_TEST1_PARTS } from "./reading-cambridge18-test1";
import { CAMBRIDGE18_TEST2_PARTS } from "./reading-cambridge18-test2";
import { CAMBRIDGE18_TEST3_PARTS } from "./reading-cambridge18-test3";
import { CAMBRIDGE18_TEST4_PARTS } from "./reading-cambridge18-test4";
import { CAMBRIDGE19_TEST1_PARTS } from "./reading-cambridge19-test1";
import { CAMBRIDGE19_TEST2_PARTS } from "./reading-cambridge19-test2";
import { CAMBRIDGE19_TEST3_PARTS } from "./reading-cambridge19-test3";
import { CAMBRIDGE19_TEST4_PARTS } from "./reading-cambridge19-test4";
import { CAMBRIDGE20_TEST1_PARTS } from "./reading-cambridge20-test1";
import { CAMBRIDGE20_TEST2_PARTS } from "./reading-cambridge20-test2";
import { CAMBRIDGE20_TEST3_PARTS } from "./reading-cambridge20-test3";
import { CAMBRIDGE20_TEST4_PARTS } from "./reading-cambridge20-test4";
import { CAMBRIDGE21_TEST1_PARTS } from "./reading-cambridge21-test1";
import { CAMBRIDGE21_TEST2_PARTS } from "./reading-cambridge21-test2";
import { CAMBRIDGE21_TEST3_PARTS } from "./reading-cambridge21-test3";
import { CAMBRIDGE21_TEST4_PARTS } from "./reading-cambridge21-test4";
import type { ReadingSource } from "./reading-source-model";

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
  inputCount?: number;
  joiners?: string[];
  number: number;
};

export type ReadingFillChart = {
  rows: { label?: string; percent: number; questionNumber?: number }[];
  scale: number;
  ticks: number[];
  title: string;
};

export type ReadingFillTableCell = {
  after?: string;
  before?: string;
  colSpan?: number;
  inputCount?: number;
  joiners?: string[];
  questionNumber?: number;
  rowSpan?: number;
  text?: string;
};

export type ReadingPassageFigure =
  | { afterParagraph: number; caption?: string; type: "wheel-motion" }
  | { afterParagraph: number; caption?: string; rows: { pair: string; agreement: number }[]; type: "word-pair-table" }
  | { afterParagraph: number; caption?: string; headers: string[]; rows: string[][]; type: "data-table" };

export type ReadingHeadingOption = {
  id: string;
  text: string;
};

export type ReadingPassageSection = {
  figures?: ReadingPassageFigure[];
  format?: "pre";
  heading?: string;
  headingQuestionNumber?: number;
  id: string;
  listItems?: string[];
  paragraphs: string[];
};

export type ReadingChoiceBlock = {
  id: string;
  instruction: string;
  questions: ReadingChoiceQuestion[];
  sharedOptions?: boolean;
  type: "choice";
};

export type ReadingFillBlock = {
  chart?: ReadingFillChart;
  id: string;
  instruction: string;
  questions: ReadingFillQuestion[];
  rawAnswerText?: string;
  rawText?: string;
  table?: { headers: string[]; rows: ReadingFillTableCell[][] };
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
  byline?: string;
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

function expandOptionalReadingAnswer(value: string): string[] {
  const optional = /\(([^)]+)\)/.exec(value);
  if (!optional) return [value.trim()];
  return [
    ...expandOptionalReadingAnswer(value.replace(optional[0], "")),
    ...expandOptionalReadingAnswer(value.replace(optional[0], optional[1])),
  ];
}

function sourceFillAnswerAlternatives(values: string[]) {
  return [...new Set(values.flatMap((value) => value
    .split(/\s*\/\s*/)
    .flatMap(expandOptionalReadingAnswer)
    .map((alternative) => alternative.trim())
    .filter(Boolean)))];
}

const REVIEWED_READING_PARTS: Record<string, ReadingPart[]> = {
  "cambridge-4-test-1": CAMBRIDGE4_TEST1_PARTS,
  "cambridge-4-test-2": CAMBRIDGE4_TEST2_PARTS,
  "cambridge-4-test-3": CAMBRIDGE4_TEST3_PARTS,
  "cambridge-4-test-4": CAMBRIDGE4_TEST4_PARTS,
  "cambridge-5-test-1": CAMBRIDGE5_TEST1_PARTS,
  "cambridge-5-test-2": CAMBRIDGE5_TEST2_PARTS,
  "cambridge-5-test-3": CAMBRIDGE5_TEST3_PARTS,
  "cambridge-5-test-4": CAMBRIDGE5_TEST4_PARTS,
  "cambridge-6-test-1": CAMBRIDGE6_TEST1_PARTS,
  "cambridge-6-test-2": CAMBRIDGE6_TEST2_PARTS,
  "cambridge-6-test-3": CAMBRIDGE6_TEST3_PARTS,
  "cambridge-6-test-4": CAMBRIDGE6_TEST4_PARTS,
  "cambridge-7-test-1": CAMBRIDGE7_TEST1_PARTS,
  "cambridge-7-test-2": CAMBRIDGE7_TEST2_PARTS,
  "cambridge-7-test-3": CAMBRIDGE7_TEST3_PARTS,
  "cambridge-7-test-4": CAMBRIDGE7_TEST4_PARTS,
  "cambridge-8-test-1": CAMBRIDGE8_TEST1_PARTS,
  "cambridge-8-test-2": CAMBRIDGE8_TEST2_PARTS,
  "cambridge-8-test-3": CAMBRIDGE8_TEST3_PARTS,
  "cambridge-8-test-4": CAMBRIDGE8_TEST4_PARTS,
  "cambridge-9-test-1": CAMBRIDGE9_TEST1_PARTS,
  "cambridge-9-test-2": CAMBRIDGE9_TEST2_PARTS,
  "cambridge-9-test-3": CAMBRIDGE9_TEST3_PARTS,
  "cambridge-9-test-4": CAMBRIDGE9_TEST4_PARTS,
  "cambridge-10-test-1": CAMBRIDGE10_TEST1_PARTS,
  "cambridge-10-test-2": CAMBRIDGE10_TEST2_PARTS,
  "cambridge-10-test-3": CAMBRIDGE10_TEST3_PARTS,
  "cambridge-10-test-4": CAMBRIDGE10_TEST4_PARTS,
  "cambridge-11-test-1": CAMBRIDGE11_TEST1_PARTS,
  "cambridge-11-test-2": CAMBRIDGE11_TEST2_PARTS,
  "cambridge-11-test-3": CAMBRIDGE11_TEST3_PARTS,
  "cambridge-11-test-4": CAMBRIDGE11_TEST4_PARTS,
  "cambridge-12-test-1": CAMBRIDGE12_TEST1_PARTS,
  "cambridge-12-test-2": CAMBRIDGE12_TEST2_PARTS,
  "cambridge-12-test-3": CAMBRIDGE12_TEST3_PARTS,
  "cambridge-12-test-4": CAMBRIDGE12_TEST4_PARTS,
  "cambridge-13-test-1": CAMBRIDGE13_TEST1_PARTS,
  "cambridge-13-test-2": CAMBRIDGE13_TEST2_PARTS,
  "cambridge-13-test-3": CAMBRIDGE13_TEST3_PARTS,
  "cambridge-13-test-4": CAMBRIDGE13_TEST4_PARTS,
  "cambridge-14-test-1": CAMBRIDGE14_TEST1_PARTS,
  "cambridge-14-test-2": CAMBRIDGE14_TEST2_PARTS,
  "cambridge-14-test-3": CAMBRIDGE14_TEST3_PARTS,
  "cambridge-14-test-4": CAMBRIDGE14_TEST4_PARTS,
  "cambridge-15-test-1": CAMBRIDGE15_TEST1_PARTS,
  "cambridge-15-test-2": CAMBRIDGE15_TEST2_PARTS,
  "cambridge-15-test-3": CAMBRIDGE15_TEST3_PARTS,
  "cambridge-15-test-4": CAMBRIDGE15_TEST4_PARTS,
  "cambridge-16-test-1": CAMBRIDGE16_TEST1_PARTS,
  "cambridge-16-test-2": CAMBRIDGE16_TEST2_PARTS,
  "cambridge-16-test-3": CAMBRIDGE16_TEST3_PARTS,
  "cambridge-16-test-4": CAMBRIDGE16_TEST4_PARTS,
  "cambridge-17-test-1": CAMBRIDGE17_TEST1_PARTS,
  "cambridge-17-test-2": CAMBRIDGE17_TEST2_PARTS,
  "cambridge-17-test-3": CAMBRIDGE17_TEST3_PARTS,
  "cambridge-17-test-4": CAMBRIDGE17_TEST4_PARTS,
  "cambridge-18-test-1": CAMBRIDGE18_TEST1_PARTS,
  "cambridge-18-test-2": CAMBRIDGE18_TEST2_PARTS,
  "cambridge-18-test-3": CAMBRIDGE18_TEST3_PARTS,
  "cambridge-18-test-4": CAMBRIDGE18_TEST4_PARTS,
  "cambridge-19-test-1": CAMBRIDGE19_TEST1_PARTS,
  "cambridge-19-test-2": CAMBRIDGE19_TEST2_PARTS,
  "cambridge-19-test-3": CAMBRIDGE19_TEST3_PARTS,
  "cambridge-19-test-4": CAMBRIDGE19_TEST4_PARTS,
  "cambridge-20-test-1": CAMBRIDGE20_TEST1_PARTS,
  "cambridge-20-test-2": CAMBRIDGE20_TEST2_PARTS,
  "cambridge-20-test-3": CAMBRIDGE20_TEST3_PARTS,
  "cambridge-20-test-4": CAMBRIDGE20_TEST4_PARTS,
  "cambridge-21-test-1": CAMBRIDGE21_TEST1_PARTS,
  "cambridge-21-test-2": CAMBRIDGE21_TEST2_PARTS,
  "cambridge-21-test-3": CAMBRIDGE21_TEST3_PARTS,
  "cambridge-21-test-4": CAMBRIDGE21_TEST4_PARTS,
};

// Every published question is backed by an original, sanitized PDF page and a reviewed key.
function attachReviewedReadingText(test: ReadingTest): ReadingTest {
  const reviewedParts = REVIEWED_READING_PARTS[test.id];
  if (!reviewedParts) return test;

  return {
    ...test,
    parts: reviewedParts.map((part, index) => {
      const reviewedPart = test.parts[index];
      const questionBlocks = part.questionBlocks.map((block) => {
        if (block.type === "headings") {
          return {
            ...block,
            answers: Object.fromEntries(block.questionNumbers.flatMap((number) => {
              const answer = test.source?.answers[number]?.values[0];
              return answer ? [[number, answer]] : [];
            })),
          };
        }
        if (block.type === "fill") {
          return {
            ...block,
            questions: block.questions.map((question) => {
              const answer = test.source?.answers[question.number];
              return answer?.values.length ? {
                ...question,
                answer: answer.mode === "all"
                  ? answer.values.map((value) => sourceFillAnswerAlternatives([value]).join(" / "))
                  : sourceFillAnswerAlternatives(answer.values),
                answerMode: answer.mode === "all" ? "all" as const : "any" as const,
              } : question;
            }),
          };
        }
        return {
          ...block,
          questions: block.questions.map((question) => {
            const number = question.questionNumbers[0];
            const answer = test.source?.answers[number];
            const answerGroup = test.source?.groups.find((group) =>
              group.mode === "unordered" &&
              group.numbers.length === question.questionNumbers.length &&
              group.numbers.every((groupNumber) => question.questionNumbers.includes(groupNumber)),
            );
            const groupedChoiceAnswers = question.selectCount && question.questionNumbers.length > 1
              ? question.questionNumbers.flatMap((questionNumber) => test.source?.answers[questionNumber]?.values ?? [])
              : undefined;
            const answerValues = answerGroup?.values ?? groupedChoiceAnswers ?? answer?.values;
            return answer?.values.length && answerValues?.length
              ? {
                  ...question,
                  answer: answerValues.length === 1 ? answerValues[0] : answerValues,
                  ...(answerGroup ? { selectCount: answerValues.length } : {}),
                }
              : question;
          }),
        };
      });

      return {
        ...part,
        questionBlocks,
        source: {
          ...(reviewedPart.source ?? { passagePages: [], questionPages: [], answerPages: [] }),
          textVerified: true,
        },
      };
    }),
  };
}

export const READING_TESTS = (sourceReadingTests as ReadingTest[])
  .map(attachReviewedReadingText)
  .filter((test) => test.source?.verified && test.source.sanitized && Number(test.bookCode.replace("cambridge-", "")) >= 4)
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
