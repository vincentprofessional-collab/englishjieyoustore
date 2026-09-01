import type { JuniorHighLayoutFamily, JuniorHighPaper, JuniorHighQuestion, JuniorHighQuestionGroup, JuniorHighWritingTask } from "./paper-types";

export const JUNIOR_HIGH_LAYOUT_FAMILIES: readonly JuniorHighLayoutFamily[];
export const JUNIOR_HIGH_PRACTICE_FAMILIES: readonly {
  readonly id: string;
  readonly title: string;
  readonly subtypes: readonly string[];
}[];
export type JuniorHighSourcePracticeCard = {
  id: string;
  baseTitle: string;
  title: string;
  year: number;
  region: string;
  examName: string;
  missingSource: boolean;
  sourceIndex: number;
  groupIds: string[];
  orderedQuestionIds: string[];
  writingTaskIds: string[];
  layoutFamily: JuniorHighLayoutFamily;
  sourceFile: string;
  sourceSection: string;
  auditFlags: string[];
  signature: string;
};
export function orderedJuniorHighQuestionIds(paper: Pick<JuniorHighPaper, "questions" | "parts" | "sections">): string[];
export function canonicalizeJuniorHighQuestionSequence<T extends Pick<JuniorHighPaper, "questions" | "parts" | "sections" | "writingTasks">>(paper: T): T;
export function parseJuniorHighPracticeSource(input?: { sourceSection?: string; groupTitle?: string; sourceFile?: string }): {
  title: string;
  year: number;
  region: string;
  examName: string;
  missing: boolean;
};
export function extractJuniorHighBlankSourceNumbers(text?: string): string[];
export function orderedJuniorHighSourceGroupQuestionIds(group: JuniorHighQuestionGroup, questions?: JuniorHighQuestion[]): {
  orderedQuestionIds: string[];
  auditFlags: string[];
};
export function buildJuniorHighSourcePracticeCards(paper: JuniorHighPaper): JuniorHighSourcePracticeCard[];
export function createJuniorHighSourcePracticePaper(paper: JuniorHighPaper, card: JuniorHighSourcePracticeCard): JuniorHighPaper;
export function resolveJuniorHighLayoutFamily(input: {
  questionType?: string;
  partTitle?: string;
  group?: Partial<JuniorHighQuestionGroup>;
  questions?: JuniorHighQuestion[];
}): JuniorHighLayoutFamily;
export function isPracticeItemReady(item: JuniorHighQuestion | JuniorHighWritingTask): boolean;
