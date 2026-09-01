"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { StudyAnnotationTools } from "@/components/study-annotation-tools";
import beijing2024Paper from "@/lib/junior-high/beijing-2024-simulation.json";
import type { JuniorHighBlock, JuniorHighBook, JuniorHighPaper, JuniorHighQuestion, JuniorHighQuestionGroup, JuniorHighPart, JuniorHighWritingTask } from "@/lib/junior-high/paper-types";
import { cleanQuestionDisplayText, classifyJuniorHighGroup, isAnswerOptionText, isNonQuestionInstruction, isPassageLabel, juniorHighTableColumnWidth, questionCanUseInlineBlankControl, questionUsesChoiceControl, shouldMergeJuniorHighTableCell, splitJuniorHighGroupTitle, splitJuniorHighTableCell, visibleGroupInstructions, visiblePartInstructions } from "@/lib/junior-high/render-rules";
import { isExamInstructionTitle, isSectionHeading, normalizeStructuredGroups } from "@/lib/junior-high/structured-layout";
import { loadJuniorHighQuestionOverrides, saveJuniorHighQuestionOverrides } from "@/lib/junior-high/question-overrides";
import { canonicalizeJuniorHighQuestionSequence, isPracticeItemReady, resolveJuniorHighLayoutFamily } from "@/lib/junior-high/practice-model.mjs";

const defaultPaper = beijing2024Paper as unknown as JuniorHighPaper;
type PaperQuestion = JuniorHighQuestion;
type BookCard = JuniorHighBook;
type JuniorHighAdminContextValue = { isAdmin: boolean; onSave: (question: PaperQuestion, patch: Partial<PaperQuestion>) => Promise<void>; onDelete: (question: PaperQuestion) => Promise<void> };
const JuniorHighAdminContext = createContext<JuniorHighAdminContextValue>({ isAdmin: false, onSave: async () => undefined, onDelete: async () => undefined });
type ClozeAnalysisContextValue = { mode: "show" | "hide"; menuOpen: boolean; submitted: boolean; setMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void; setMode: (value: "show" | "hide") => void; submit: () => void };
const ClozeAnalysisContext = createContext<ClozeAnalysisContextValue>({ mode: "show", menuOpen: false, submitted: false, setMenuOpen: () => undefined, setMode: () => undefined, submit: () => undefined });

const KNOWLEDGE_EXPLANATION_PATTERN = /真题透视|新题特训|知识|讲解|考向|专题|用法|分类|定义|概念|口诀|规律|辨析/;
const ANSWER_CUE_PATTERN = /[_＿]{2,}|\s{4,}|[?？]|[（(][^（）()]{1,80}[）)]|根据|请|填|补全|完成|改写|转换|翻译|回答|写出|指出|选出|选择|排序|连词|首字母|提示|所给|括号|适当形式|空白处|空格|横线|下列|下面|短文|句子|词语|单词|汉语|中文|英文/;
const SCORE_TEXT_PATTERN = /[（(][^（）()]*?(?:每题|每小题|共\s*\d|共[一二三四五六七八九十百]+|满分|分)[^（）()]*?[）)]/g;
const HEADING_ORDER_PATTERN = /^\s*(?:第?\s*[一二三四五六七八九十百千万]+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVX]+|\d{1,3})\s*[、.．:：]\s*/;
const QUESTION_SOURCE_CITATION_PATTERN = /^\s*[（(][^（）()]{0,100}(?:20\d{2}|中考|期中|期末|模拟|真题|统考|校考|联考|改编)[^（）()]{0,140}[）)]\s*/;
const PRACTICE_TYPE_ORDER = ["单项选择", "语法选择", "完形填空", "阅读理解", "阅读还原", "任务型阅读", "阅读表达", "语法填空", "短文填空", "选词填空", "用所给词适当形式填空", "单词拼写", "根据提示完成句子", "完成句子", "句型转换", "连词成句", "翻译", "补全对话", "句子成分", "填空题"];
const FAVORITE_QUESTIONS_STORAGE_KEY = "ielts-platform.favoriteQuestions";
const JUNIOR_HIGH_ATTEMPT_STORAGE_PREFIX = "ielts-platform.juniorHighAttempt";
const CHOICE_PRACTICE_TYPES = new Set(["单项选择", "语法选择", "完形填空", "阅读理解", "阅读还原"]);
const CLOZE_PRACTICE_CONTEXT_PATTERN = /完[形型]填空|阅读(?:下面)?短文|掌握其大意|根据短文内容|Passage\s*\d*/i;
const CLOZE_QUESTION_BLANK_PATTERN = /[_＿]{2,}|…|····|\.\.\.\./;
const SENTENCE_COMPONENT_PATTERN = /句子成分|句型|主语|谓语|宾语|定语|状语|补语|表语/;
const CLOZE_EXCLUDED_SOURCE_PATTERN = /解析方法|【透析】|透析|新题特训|真题透视|中考考向分析|考向(?:\d|[一二三四五六七八九十])|知识点|固定搭配|词义辨析|介词是|句子成分|基本句型/;
const CLOZE_PASSAGE_SOURCE_PATTERN = /阅读(?:下面)?短文|通读(?:下面)?短文|掌握其大意|根据短文内容|Passage\s*\d+|complete the passage/i;
const CLOZE_SOURCE_HEADING_PATTERN = /^第\s*\d+\s*讲\s*完[形型]填空/;
const MIN_CLOZE_PASSAGE_QUESTION_COUNT = 5;
const MIN_CLOZE_PASSAGE_WORD_COUNT = 50;
const CLOZE_SOURCE_LABEL_PATTERN = /^\s*(?:Passage\s*\d+|第\s*\d+\s*(?:讲|篇)|[A-Z])\s*$/i;
const CLOZE_SOURCE_INSTRUCTION_PATTERN = /^\s*(?:阅读|通读|根据短文内容|从题中所给|从A[、,，]?\s*B[、,，]?\s*C|完[形型]填空)/;
const CLOZE_SOURCE_NUMBERED_BLANK_PATTERN = /[_＿]{2,}\s*\d{1,3}\s*[_＿]{2,}|[_＿]{2,}|(?:^|[\s])\d{1,3}(?=\s*(?:[.,，。!?;；]|$))/g;
const ENGLISH_WORD_PATTERN = /\b[A-Za-z][A-Za-z'’-]*\b/g;
const ANSWER_REVIEW_FLAGS = new Set(["missing-answer", "answer-not-in-options", "bundled-answer", "analysis-scope-mismatch", "blank-position-unmapped"]);

function cleanAnalysisText(text: string) {
  return text.replace(/^\s*(?:第\s*)?\d{1,3}\s*(?:题)?\s*[.．、:：]\s*/, "").trim();
}

type JuniorHighWorkbenchSource = {
  id: string;
  mode: "mock" | "practice";
  questionType?: string;
  title?: string;
  topicGroup?: string;
};

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function PaperTimer({ running, seconds, onToggle }: { running: boolean; seconds: number; onToggle: () => void }) {
  const negative = seconds < 0;
  const absolute = Math.abs(seconds);
  const text = `${negative ? "-" : ""}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
  return <button aria-label="中考英语模拟卷计时器" className={`junior-high-timer ${negative ? "is-over" : ""}`} onClick={onToggle} type="button">{text} · {running ? "暂停" : "开始"}</button>;
}

function questionAnswerState(question: PaperQuestion, answers: Record<string, string>) {
  const value = answers[question.id] ?? "";
  if (!value.trim()) return "";
  if (!questionUsesChoiceControl(question) || questionAnswerNeedsReview(question) || !question.answer.trim() || question.inputKind === "writing") return "answered";
  return isCorrectObjectiveAnswer(question, value) || answerAlternatives(question.answer).some((answer) => normalizeObjectiveAnswer(value) === answer)
    ? "correct"
    : "wrong";
}

function questionAnswerNeedsReview(question: PaperQuestion) {
  return Boolean(question.source?.reviewFlags?.some((flag) => ANSWER_REVIEW_FLAGS.has(flag)));
}

function juniorHighAttemptStorageKey(paper: JuniorHighPaper, source?: JuniorHighWorkbenchSource) {
  const identity = source ? `${source.mode}:${source.id}` : `${paper.fileName}:${paper.displayTitle ?? ""}`;
  return `${JUNIOR_HIGH_ATTEMPT_STORAGE_PREFIX}:${identity}`;
}

function QuestionNavigation({ answers, writingAnswers, paper, current, onSelect, resultVisible = true }: { answers: Record<string, string>; writingAnswers: Record<string, string>; paper: JuniorHighPaper; current: number; onSelect: (index: number) => void; resultVisible?: boolean }) {
  const visibleQuestions = renderableQuestionsForPaper(paper);
  const writingTasks = paper.writingTasks ?? [];
  return <nav aria-label="试卷题号导航" className="junior-high-paper-nav">{visibleQuestions.map((question) => {
    const answerState = resultVisible ? questionAnswerState(question, answers) : answers[question.id] ? "answered" : "";
    const className = [
      paper.questions[current]?.id === question.id ? "selected" : "",
      answerState,
    ].filter(Boolean).join(" ");
    return <button className={className} key={question.id} onClick={() => onSelect(paper.questions.findIndex((item) => item.id === question.id))} type="button"><span>{questionDisplayNumber(question)}</span></button>;
  })}{writingTasks.map((task) => <button className={writingAnswers[task.id]?.trim() ? "answered" : ""} key={task.id} onClick={() => document.getElementById(`junior-high-question-${task.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} type="button"><span>{task.displayNumber ?? task.number}</span></button>)}</nav>;
}

function questionDisplayNumber(question: PaperQuestion) {
  return question.displayNumber ?? question.number;
}

function isSourceLeadText(text: string) {
  return /^\s*(?:来源|出处|source)\s*[:：]/i.test(text.trim());
}

function paperSourceTitle(paper: JuniorHighPaper, source?: JuniorHighWorkbenchSource) {
  return source?.title ?? paper.displayTitle ?? `中考英语 ${paper.year}年${paper.region}${paper.label}`;
}

function normalizeObjectiveAnswer(value: string) {
  return value
    .replace(/[。.,，;；、\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function answerAlternatives(answer: string) {
  return answer
    .split(/\s*(?:\/|或|;|；)\s*/g)
    .map(normalizeObjectiveAnswer)
    .filter(Boolean);
}

function normalizeOptionText(value: string) {
  return normalizeObjectiveAnswer(value.replace(/^\s*[A-GＡ-Ｇ]\s*[．.、)]\s*/, ""));
}

function correctChoiceAnswerValues(question: PaperQuestion) {
  const correctAnswers = answerAlternatives(question.answer);
  const values = new Set<string>();
  const optionAnswers = [
    ...question.options.map((option) => ({
      content: normalizeOptionText(option),
      label: normalizeObjectiveAnswer(optionLabel(option)),
      text: normalizeObjectiveAnswer(option),
    })),
    ...(question.optionImages ?? []).map((option) => ({
      content: normalizeObjectiveAnswer(option.label),
      label: normalizeObjectiveAnswer(option.label),
      text: normalizeObjectiveAnswer(option.label),
    })),
  ];
  for (const answer of correctAnswers) {
    const answerLabel = normalizeObjectiveAnswer(optionLabel(answer));
    const answerText = normalizeOptionText(answer);
    const option = optionAnswers.find((candidate) => candidate.label === answer || candidate.text === answer || candidate.content === answer || candidate.label === answerLabel || candidate.content === answerText);
    if (!option) continue;
    values.add(option.label);
    values.add(option.text);
    values.add(option.content);
  }
  return values;
}

function isCorrectObjectiveAnswer(question: PaperQuestion, value: string) {
  const userAnswers = [
    normalizeObjectiveAnswer(value),
    normalizeObjectiveAnswer(optionLabel(value)),
    normalizeOptionText(value),
  ];
  if (!userAnswers.some(Boolean) || !question.answer.trim()) return false;
  const correctAnswers = correctChoiceAnswerValues(question);
  return userAnswers.some((answer) => {
    return answer && correctAnswers.has(answer);
  });
}

function choiceAnswerMatchesOptions(question: PaperQuestion) {
  return questionUsesChoiceControl(question) && correctChoiceAnswerValues(question).size > 0;
}

function isWrongAnsweredQuestion(question: PaperQuestion, answers: Record<string, string>) {
  const userAnswer = normalizeObjectiveAnswer(answers[question.id] ?? "");
  if (!userAnswer || question.inputKind === "writing" || !question.answer.trim()) return false;
  return !isCorrectObjectiveAnswer(question, userAnswer);
}

function juniorHighQuestionType(paper: JuniorHighPaper, question: PaperQuestion, source?: JuniorHighWorkbenchSource) {
  if (source?.questionType && source.questionType !== "专项综合") return source.questionType;
  if (paper.questionType && paper.questionType !== "专项综合") return paper.questionType;
  if (question.options.length || questionUsesChoiceControl(question)) return "选择题";
  if (question.inputKind === "writing") return "写作";
  return "填空题";
}

function juniorHighQuestionKnowledge(paper: JuniorHighPaper, question: PaperQuestion, source?: JuniorHighWorkbenchSource) {
  return source?.topicGroup ?? (question as PaperQuestion & { topicLabel?: string }).topicLabel ?? paper.topicGroup ?? "";
}

function juniorHighQuestionHref(paper: JuniorHighPaper, question: PaperQuestion, source?: JuniorHighWorkbenchSource) {
  const hash = `#junior-high-question-${question.id}`;
  if (!source) return `/junior-high${hash}`;
  const key = source.mode === "practice" ? "id" : "paper";
  return `/junior-high?mode=${source.mode}&${key}=${encodeURIComponent(source.id)}${hash}`;
}

function juniorHighWrongQuestionSourceId(paper: JuniorHighPaper, source?: JuniorHighWorkbenchSource) {
  return source ? `${source.mode}:${source.id}` : `paper:${paper.year}-${paper.region}-${paper.label}`;
}

function syncWrongQuestionFavorite(paper: JuniorHighPaper, question: PaperQuestion, userAnswer: string, source?: JuniorHighWorkbenchSource) {
  if (!questionUsesChoiceControl(question) || questionAnswerNeedsReview(question) || question.inputKind === "writing" || !question.answer.trim()) return;
  try {
    const parsedItems = JSON.parse(window.localStorage.getItem(FAVORITE_QUESTIONS_STORAGE_KEY) || "[]");
    const currentItems = Array.isArray(parsedItems) ? parsedItems as Array<{ id: string }> : [];
    const sourceId = juniorHighWrongQuestionSourceId(paper, source);
    const id = `junior-high-wrong:${sourceId}:${question.id}`;
    const remainingItems = currentItems.filter((item) => item.id !== id);
    if (!userAnswer.trim() || !isWrongAnsweredQuestion(question, { [question.id]: userAnswer })) {
      window.localStorage.setItem(FAVORITE_QUESTIONS_STORAGE_KEY, JSON.stringify(remainingItems));
      return;
    }
    const savedAt = new Date().toISOString();
    const sourceTitle = paperSourceTitle(paper, source);
    window.localStorage.setItem(FAVORITE_QUESTIONS_STORAGE_KEY, JSON.stringify([
      {
        category: "wrong",
        correctAnswer: question.answer,
        href: juniorHighQuestionHref(paper, question, source),
        id,
        knowledgePoint: juniorHighQuestionKnowledge(paper, question, source),
        origin: "junior-high",
        prompt: question.prompt,
        questionNumber: String(questionDisplayNumber(question)),
        questionType: juniorHighQuestionType(paper, question, source),
        savedAt,
        sourceTitle,
        title: `错题 · 第 ${questionDisplayNumber(question)} 题`,
        userAnswer,
      },
      ...remainingItems,
    ]));
  } catch {
    // 收藏夹只依赖本地存储，失败时不阻断交卷。
  }
}

function cleanDisplayHeading(text: string) {
  return cleanQuestionDisplayText(text)
    .replace(SCORE_TEXT_PATTERN, "")
    .replace(HEADING_ORDER_PATTERN, "")
    .replace(/\s+/g, " ")
    .replace(/[。；;:：,，]+$/g, "")
    .trim();
}

function clozeSourceCitation(text: string) {
  return text.match(/[（(]\s*20\d{2}[^）)]{0,100}[）)]/)?.[0].replace(/^[（(]\s*|[）)]\s*$/g, "").trim() ?? "";
}

function removeClozeSourceCitation(text: string) {
  return text.replace(/[（(]\s*20\d{2}[^）)]{0,100}[）)]\s*/, "").trim();
}

function cleanPracticeQuestionText(text: string) {
  return cleanQuestionDisplayText(text)
    .replace(QUESTION_SOURCE_CITATION_PATTERN, "")
    .replace(SCORE_TEXT_PATTERN, "")
    .replace(/^\s*第\s*\d{1,3}\s*题\s*[:：.．、)]?\s*/, "")
    .replace(/^\s*\d{1,3}\s*[.．、)]\s*/, "")
    .trim();
}

function practiceTypeOrderIndex(label: string) {
  const index = PRACTICE_TYPE_ORDER.indexOf(label);
  return index < 0 ? PRACTICE_TYPE_ORDER.length : index;
}

function practiceQuestionTypeLabel(partTitle: string, group: JuniorHighQuestionGroup, question: PaperQuestion) {
  const scope = cleanDisplayHeading(`${partTitle} ${group.title} ${group.instructions.join(" ")}`);
  if (/语法选择/.test(scope)) return "语法选择";
  if (/完形填空/.test(scope)) return "完形填空";
  if (/阅读表达/.test(scope)) return "阅读表达";
  if (/任务型阅读/.test(scope)) return "任务型阅读";
  if (/阅读还原/.test(scope)) return "阅读还原";
  if (/阅读理解/.test(scope)) return "阅读理解";
  if (/补全对话|口语应用|口语交际|情景交际|完成对话/.test(scope)) return "补全对话";
  if (/选词填空/.test(scope)) return "选词填空";
  if (/短文填空|短文语境|综合填空/.test(scope)) return "短文填空";
  if (/语法填空|语篇填空|语篇要求填空|空白处填入|空白处/.test(scope)) return "语法填空";
  if (/单词拼写|填写单词|根据提示写单词/.test(scope)) return "单词拼写";
  if (/根据提示(?:词)?完成句子|根据.*提示.*完成句子/.test(scope)) return "根据提示完成句子";
  if (/完成句子|完成译句/.test(scope)) return "完成句子";
  if (/句型转换|改写句子/.test(scope)) return "句型转换";
  if (/连词成句/.test(scope)) return "连词成句";
  if (/翻译/.test(scope)) return "翻译";
  if (/句子成分/.test(scope)) return "句子成分";
  if (/用所给|所给单词|用括号|适当形式|正确形式/.test(scope)) return "用所给词适当形式填空";
  if (/单项选择|选择题|选择/.test(scope) || questionUsesChoiceControl(question)) return "单项选择";
  return "填空题";
}

function normalizedTopicPracticePaper(paper: JuniorHighPaper) {
  if (paper.layout !== "practice" || !paper.topicGroup) return paper;
  const questionsById = new Map(paper.questions.map((question) => [question.id, question]));
  const seenQuestionIds = new Set<string>();
  const items: { id: string; label: string; order: number }[] = [];
  for (const part of paper.parts ?? []) {
    for (const group of part.groups ?? []) {
      for (const questionId of group.questionIds ?? []) {
        const question = questionsById.get(questionId);
        if (!question || seenQuestionIds.has(question.id)) continue;
        seenQuestionIds.add(question.id);
        if (!shouldRenderTypePracticeQuestion(paper, question, part.title, group.title, group.instructions)) continue;
        const label = practiceQuestionTypeLabel(part.title, group, question);
        if (label !== "单项选择" || !questionUsesChoiceControl(question) || !choiceAnswerMatchesOptions(question)) continue;
        items.push({ id: question.id, label, order: items.length });
      }
    }
  }
  for (const question of paper.questions) {
    if (seenQuestionIds.has(question.id)) continue;
    if (!shouldRenderPaperQuestion(question)) continue;
    if (!questionUsesChoiceControl(question) || !choiceAnswerMatchesOptions(question)) continue;
    items.push({ id: question.id, label: "单项选择", order: items.length });
  }
  const sortedItems = [...items].sort((a, b) => practiceTypeOrderIndex(a.label) - practiceTypeOrderIndex(b.label) || a.order - b.order);
  const displayQuestions = sortedItems.map((item) => {
    const question = questionsById.get(item.id)!;
    return {
      ...question,
      context: cleanPracticeQuestionText(question.context ?? ""),
      leadBlocks: question.leadBlocks?.map((block) => block.text ? { ...block, text: cleanPracticeQuestionText(block.text) } : block),
      prompt: cleanPracticeQuestionText(question.prompt),
    };
  });
  const groupedQuestionIds = new Map<string, string[]>();
  for (const item of sortedItems) groupedQuestionIds.set(item.label, [...(groupedQuestionIds.get(item.label) ?? []), item.id]);
  const parts: JuniorHighPart[] = [...groupedQuestionIds.entries()].map(([label, questionIds], index) => ({
    id: `practice-type-${index + 1}`,
    title: label,
    instructions: [],
    groups: [{
      id: `practice-type-${index + 1}-group`,
      title: label,
      instructions: [],
      blocks: [],
      displayBlocks: [],
      questionIds,
      groupType: "choice",
    }],
  }));
  return { ...paper, questions: displayQuestions, parts, sections: [], sourceBlocks: [], writingTasks: [] };
}

function practiceScopeText(partTitle: string, group: JuniorHighQuestionGroup) {
  return [
    partTitle,
    group.title,
    ...group.instructions,
    ...group.blocks.map((block) => block.text ?? ""),
    ...((group.displayBlocks ?? []).map((block) => block.text ?? "")),
  ].join(" ");
}

function isBinaryTrueFalseChoice(question: PaperQuestion) {
  const options = question.options.map((option) => option.replace(/^\s*[A-GＡ-Ｇ]\s*[．.、)]\s*/, "").trim());
  return options.length === 2 && options.some((option) => /正确|对|true/i.test(option)) && options.some((option) => /错误|错|false/i.test(option));
}

function isValidTypePracticeQuestion(paper: JuniorHighPaper, question: PaperQuestion, scope: string) {
  const questionType = paper.questionType ?? "";
  if (questionUsesChoiceControl(question) && !choiceAnswerMatchesOptions(question)) return false;
  if (CHOICE_PRACTICE_TYPES.has(questionType) && !questionUsesChoiceControl(question)) return false;
  if (questionType === "完形填空") {
    const questionText = `${question.prompt} ${question.context}`;
    if (!CLOZE_QUESTION_BLANK_PATTERN.test(questionText) && !question.sourceBlockIds?.length) return false;
    if (SENTENCE_COMPONENT_PATTERN.test(`${questionText} ${question.options.join(" ")} ${question.analysis}`)) return false;
    if (KNOWLEDGE_EXPLANATION_PATTERN.test(scope) && !CLOZE_PRACTICE_CONTEXT_PATTERN.test(scope)) return false;
  }
  if (questionType === "阅读还原") {
    if (!CLOZE_QUESTION_BLANK_PATTERN.test(`${question.prompt} ${question.context}`)) return false;
    if (isBinaryTrueFalseChoice(question)) return false;
  }
  return true;
}

function clozeGroupSourceText(group: JuniorHighQuestionGroup) {
  const blocks = group.displayBlocks?.length ? group.displayBlocks : group.blocks;
  return blocks.map((block) => cleanQuestionDisplayText(block.text ?? "").trim()).filter((text) => {
    if (!text) return false;
    if (CLOZE_SOURCE_LABEL_PATTERN.test(text) || CLOZE_SOURCE_INSTRUCTION_PATTERN.test(text)) return false;
    return true;
  }).join(" ");
}

function isValidClozePracticeGroup(group: JuniorHighQuestionGroup, scope: string, validQuestionCount: number) {
  if (validQuestionCount < MIN_CLOZE_PASSAGE_QUESTION_COUNT) return false;
  if (CLOZE_EXCLUDED_SOURCE_PATTERN.test(scope)) return false;
  if (!CLOZE_PASSAGE_SOURCE_PATTERN.test(scope)) return false;
  const sourceText = clozeGroupSourceText(group);
  const wordCount = sourceText.match(ENGLISH_WORD_PATTERN)?.length ?? 0;
  const blankCount = sourceText.match(CLOZE_SOURCE_NUMBERED_BLANK_PATTERN)?.length ?? 0;
  return wordCount >= MIN_CLOZE_PASSAGE_WORD_COUNT && blankCount >= 3;
}

function cleanPracticeQuestion(question: PaperQuestion) {
  return {
    ...question,
    context: cleanPracticeQuestionText(question.context ?? ""),
    leadBlocks: question.leadBlocks?.map((block) => block.text ? { ...block, text: cleanPracticeQuestionText(block.text) } : block),
    prompt: cleanPracticeQuestionText(question.prompt),
  };
}

function normalizedTypePracticePaper(paper: JuniorHighPaper) {
  if (paper.layout !== "practice" || paper.topicGroup) return paper;
  const questionsById = new Map(paper.questions.map((question) => [question.id, question]));
  const orderedQuestionIds: string[] = [];
  const seenQuestionIds = new Set<string>();
  const parts: JuniorHighPart[] = [];
  for (const part of paper.parts ?? []) {
    const groups: JuniorHighQuestionGroup[] = [];
    for (const group of part.groups ?? []) {
      const scope = practiceScopeText(part.title, group);
      const questionIds: string[] = [];
      for (const questionId of group.questionIds ?? []) {
        const question = questionsById.get(questionId);
        if (!question || seenQuestionIds.has(question.id)) continue;
        if (!isPracticeItemReady(question)) continue;
        if (!shouldRenderTypePracticeQuestion(paper, question, part.title, group.title, group.instructions)) continue;
        if (!isValidTypePracticeQuestion(paper, question, scope)) continue;
        questionIds.push(question.id);
      }
      if (paper.questionType === "完形填空" && !isValidClozePracticeGroup(group, scope, questionIds.length)) continue;
      for (const questionId of questionIds) {
        seenQuestionIds.add(questionId);
        orderedQuestionIds.push(questionId);
      }
      if (questionIds.length) {
        const selectedBlockIds = new Set(questionIds.flatMap((id) => questionsById.get(id)?.sourceBlockIds ?? []));
        const shouldLimitInlineBlocks = group.groupType === "inline-blank" && questionIds.length < group.questionIds.length && selectedBlockIds.size > 0;
        groups.push({
          ...group,
          blocks: shouldLimitInlineBlocks ? group.blocks.filter((block) => selectedBlockIds.has(block.id)) : group.blocks,
          displayBlocks: shouldLimitInlineBlocks ? group.displayBlocks?.filter((block) => selectedBlockIds.has(block.id)) : group.displayBlocks,
          questionIds,
        });
      }
    }
    if (groups.length) parts.push({ ...part, groups });
  }
  if (!paper.parts?.length) {
    for (const question of paper.questions) {
      if (!isPracticeItemReady(question)) continue;
      if (!shouldRenderTypePracticeQuestion(paper, question)) continue;
      if (!isValidTypePracticeQuestion(paper, question, "")) continue;
      orderedQuestionIds.push(question.id);
    }
  }
  const questions = orderedQuestionIds.map((id) => cleanPracticeQuestion(questionsById.get(id)!));
  const writingTasks = (paper.writingTasks ?? []).filter(isPracticeItemReady);
  return { ...paper, questions, parts, sections: [], sourceBlocks: [], writingTasks };
}

function normalizedPracticePaper(paper: JuniorHighPaper) {
  if (paper.layout !== "practice") return paper;
  return paper.topicGroup ? normalizedTopicPracticePaper(paper) : normalizedTypePracticePaper(paper);
}

function questionHasAnswerCue(question: PaperQuestion, scope = "") {
  if (questionUsesChoiceControl(question) || question.inputKind === "writing") return true;
  return ANSWER_CUE_PATTERN.test(`${scope} ${question.prompt} ${question.context}`);
}

function shouldRenderPaperQuestion(question: PaperQuestion, partTitle = "", groupTitle = "", instructions: string[] = []) {
  if (questionUsesChoiceControl(question) || question.inputKind === "writing") return true;
  const scope = `${partTitle} ${groupTitle} ${instructions.join(" ")}`;
  if (/补全对话/.test(scope)) return true;
  const hasAnswerCue = questionHasAnswerCue(question, scope);
  if (KNOWLEDGE_EXPLANATION_PATTERN.test(scope) && !hasAnswerCue) return false;
  return hasAnswerCue;
}

function shouldRenderTypePracticeQuestion(paper: JuniorHighPaper, question: PaperQuestion, partTitle = "", groupTitle = "", instructions: string[] = []) {
  const questionType = paper.questionType ?? "";
  if (paper.layout === "practice" && !paper.topicGroup && questionType && !CHOICE_PRACTICE_TYPES.has(questionType)) return true;
  return shouldRenderPaperQuestion(question, partTitle, groupTitle, instructions);
}

function renderableQuestionsForPaper(paper: JuniorHighPaper) {
  const questionsById = new Map(paper.questions.map((question) => [question.id, question]));
  const scopedQuestionIds = new Set<string>();
  const visibleQuestionIds = new Set<string>();
  for (const part of paper.parts ?? []) {
    for (const group of part.groups ?? []) {
      for (const questionId of group.questionIds ?? []) {
        scopedQuestionIds.add(questionId);
        const question = questionsById.get(questionId);
        if (question && shouldRenderTypePracticeQuestion(paper, question, part.title, group.title, group.instructions)) visibleQuestionIds.add(question.id);
      }
    }
  }
  if (!scopedQuestionIds.size) return paper.questions.filter((question) => shouldRenderPaperQuestion(question));
  return paper.questions.filter((question) => visibleQuestionIds.has(question.id) || !scopedQuestionIds.has(question.id));
}

function renderContext(text: string): ReactNode {
  return text.split(/(?<!\d)(13|14|15|16|17|18|19|20)(?!\d)/g).map((part, index) => {
    if (/^(13|14|15|16|17|18|19|20)$/.test(part)) {
      return <span className="junior-high-inline-blank" key={`${part}-${index}`}>{part}</span>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderInlineBlanks(text: string): ReactNode {
  const blankPattern = /([_＿]{2,}\s*\d{0,3}\s*[_＿]{2,}|\s{2,}\d{1,3}(?=\s|[.,!?;:)”'’]|$))/g;
  return text.split(blankPattern).map((part, index) => {
    if (!part) return null;
    if (/^\s{2,}\d{1,3}/.test(part)) {
      const questionNumber = part.match(/\d{1,3}/)?.[0];
      return <span className="junior-high-table-blank" key={`${part}-${index}`}>
        {questionNumber ? <span className="junior-high-inline-answer-number-prefix">{questionNumber}</span> : null}
        <span className="junior-high-inline-blank"> </span>
      </span>;
    }
    if (/[_＿]{2,}/.test(part)) {
      const blankClassName = part.replace(/[_＿]/g, "").trim().length >= 8 ? "junior-high-inline-blank junior-high-inline-blank-wide" : "junior-high-inline-blank";
      const questionNumber = part.match(/\d{1,3}/)?.[0];
      return questionNumber ? <span className="junior-high-table-blank" key={`${part}-${index}`}>
        <span className="junior-high-inline-answer-number-prefix">{questionNumber}</span>
        <span className={blankClassName}> </span>
      </span> : <span className={blankClassName} key={`${part}-${index}`}> </span>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

type ClozeBlankCursor = { index: number; usedQuestionIds: Set<string> };

function renderNumberedClozeText(text: string, questionsBySourceNumber: Map<number, PaperQuestion>, orderedQuestions: PaperQuestion[], cursor: ClozeBlankCursor): ReactNode {
  const pattern = /(?:[_＿]{2,}\s*(\d{1,3})\s*[_＿]{2,}|\.{4,}\s*(\d{1,3})\s*\.{4,}|[_＿]{2,}|\.{4,})/g;
  const nodes: ReactNode[] = [];
  let textCursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    nodes.push(<span key={`cloze-text-${start}`}>{text.slice(textCursor, start)}</span>);
    const explicitNumber = Number(match[1] ?? match[2] ?? 0);
    let question = explicitNumber ? questionsBySourceNumber.get(explicitNumber) : undefined;
    if (!explicitNumber) {
      while (orderedQuestions[cursor.index] && cursor.usedQuestionIds.has(orderedQuestions[cursor.index].id)) cursor.index += 1;
      question = orderedQuestions[cursor.index];
    }
    if (question) {
      cursor.usedQuestionIds.add(question.id);
      const questionIndex = orderedQuestions.findIndex((candidate) => candidate.id === question?.id);
      if (questionIndex >= cursor.index) cursor.index = questionIndex + 1;
      nodes.push(<span className="junior-high-table-blank" key={`cloze-blank-${start}`}><span className="junior-high-inline-answer-number-prefix">{questionDisplayNumber(question)}</span><span className="junior-high-inline-blank"> </span></span>);
    } else {
      nodes.push(<span key={`cloze-raw-${start}`}>{match[0]}</span>);
    }
    textCursor = start + match[0].length;
  }
  nodes.push(<span key={`cloze-text-${textCursor}`}>{text.slice(textCursor)}</span>);
  return nodes;
}

const QUESTION_BLANK_PATTERN = /[_＿]{2,}\s*\d{0,3}\s*[_＿]{2,}|[_＿]{2,}\s*\d{1,3}\s*[_＿]{2,}|\s{2,}\d{1,3}\s{2,}/g;
const INLINE_NUMBER_PATTERN = /(?<!\d)(\d{1,3})(?!\d)/g;
const ANSWER_BLANK_TEST_PATTERN = /[_＿]{2,}|\s{4,}/;
const ANSWER_BLANK_SPLIT_PATTERN = /([_＿]{2,}|\s{4,})/g;
const QUESTION_LINE_START_PATTERN = /^(\s*\d{1,3}\s*[．.、)]\s*)/;
const SPELLING_PROMPT_PATTERN = /\b[A-Za-z]\s*[（(][^（）()]+[）)]/;

type InlineQuestionContext = {
  answers: Record<string, string>;
  mode: "text" | "choice-text";
  onAnswer: (question: PaperQuestion, value: string) => void;
  onFocusQuestion?: (question: PaperQuestion) => void;
  leadingBlankBlockIds?: Set<string>;
  forceNumberMarkers?: boolean;
  explicitNumberMarkers?: Set<number>;
  questionsByBlockId?: Map<string, PaperQuestion>;
  questionsByNumber: Map<number, PaperQuestion>;
  submitted: boolean;
};

function optionLabel(option: string) {
  return option.trim().match(/^([A-GＡ-Ｇ])/)?.[1]?.replace(/[Ａ-Ｇ]/, (value) => String.fromCharCode(value.charCodeAt(0) - 65248)) ?? option.trim().charAt(0);
}

function InlineAnswerBox({ ariaLabel, className = "", maxLength, onChange, onFocus, transform, value }: { ariaLabel: string; className?: string; maxLength?: number; onChange: (value: string) => void; onFocus?: () => void; transform?: (value: string) => string; value: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) ref.current.textContent = value;
  }, [value]);
  return <span
    aria-label={ariaLabel}
    className={`junior-high-inline-answer junior-high-inline-answer-editable ${className}`}
    contentEditable
    data-1p-ignore="true"
    data-form-type="other"
    data-lpignore="true"
    onInput={(event) => {
      let next = event.currentTarget.textContent ?? "";
      if (maxLength) next = next.slice(0, maxLength);
      if (transform) next = transform(next);
      if (event.currentTarget.textContent !== next) event.currentTarget.textContent = next;
      onChange(next);
    }}
    onFocus={onFocus}
    ref={ref}
    role="textbox"
    spellCheck={false}
    suppressContentEditableWarning
  />;
}

function renderQuestionPrompt(text: string, value: string, onAnswer: (value: string) => void): ReactNode {
  const parts = text.split(QUESTION_BLANK_PATTERN);
  const blanks = text.match(QUESTION_BLANK_PATTERN) ?? [];
  if (!blanks.length) return text;
  return parts.flatMap((part, index) => [
    <span key={`prompt-${index}`}>{part}</span>,
    index < blanks.length ? <input aria-label="填空答案" autoComplete="off" className="junior-high-inline-answer" key={`blank-${index}`} onChange={(event) => onAnswer(event.target.value)} spellCheck={false} value={value} /> : null,
  ]);
}

function inferMissingBlankPrompt(question: PaperQuestion) {
  if (question.inputKind !== "blank" || question.options.length || QUESTION_BLANK_PATTERN.test(question.prompt)) return question.prompt;
  if (!/^[A-Za-z]+(?:[- ][A-Za-z]+)?$/.test(question.answer.trim())) return question.prompt;
  return question.prompt.replace(
    /\b(want|wants|wanted|need|needs|needed|try|tries|tried|hope|hopes|hoped|plan|plans|planned|decide|decides|decided|agree|agrees|agreed|learn|learns|learned)\s+to\s+(?=(?:in|at|on|for|from|with|by|about|through|over|after|before)\b)/i,
    "$1 to ________ ",
  );
}

function compactBlankPrompt(text: string): string {
  const marker = text.search(/[_＿]{2,}/);
  if (marker < 0 || text.length <= 180) return text;
  const start = Math.max(0, marker - 78);
  const end = Math.min(text.length, marker + 100);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function spellingMarker(text: string, answer: string) {
  const initial = answer.trim().match(/^\(([A-Za-z])\)/)?.[1];
  if (!initial) return undefined;
  const match = new RegExp(`\\b${initial.toLowerCase()}\\b(?=\\s)`).exec(text);
  return match?.index === undefined ? undefined : { end: match.index + match[0].length };
}

function renderSpellingPrompt(text: string, value: string, onAnswer: (value: string) => void, answer = ""): ReactNode {
  const match = text.match(/\b([A-Za-z])\s*([（(][^（）()]+[）)])/);
  const sourceMarker = spellingMarker(text, answer);
  if ((!match || match.index === undefined) && !sourceMarker) return text;
  const before = match && match.index !== undefined ? `${text.slice(0, match.index)}${match[1]}` : text.slice(0, sourceMarker!.end);
  const after = match && match.index !== undefined ? `${match[2]}${text.slice(match.index + match[0].length)}` : text.slice(sourceMarker!.end);
  return <>
    <span>{before}</span>
    <input aria-label="填空答案" autoComplete="off" className="junior-high-inline-answer junior-high-spelling-answer" onChange={(event) => onAnswer(event.target.value)} spellCheck={false} value={value} />
    <span>{after}</span>
  </>;
}

function renderSourceSpellingText(text: string, question: PaperQuestion, context: InlineQuestionContext): ReactNode | undefined {
  const marker = spellingMarker(text, question.answer);
  if (!marker) return undefined;
  const splitIndex = marker.end;
  return <>
    <span>{text.slice(0, splitIndex)}</span>
    <InlineAnswerBox ariaLabel={`第 ${questionDisplayNumber(question)} 题答案`} className="junior-high-spelling-answer" onChange={(value) => context.onAnswer(question, value)} value={context.answers[question.id] || ""} />
    <span>{text.slice(splitIndex)}</span>
  </>;
}

function renderInlineQuestionControl(question: PaperQuestion, context: InlineQuestionContext) {
  const value = context.answers[question.id] || "";
  const questionNumber = questionDisplayNumber(question);
  const isChoiceText = context.mode === "choice-text";
  return <span className={`junior-high-table-blank ${isChoiceText ? "junior-high-dialogue-answer" : ""}`} id={`junior-high-question-${question.id}`} key={`inline-${question.id}`}>
    <span className="junior-high-inline-answer-wrap">
      <span className="junior-high-inline-answer-number-prefix">{questionNumber}</span>
      <InlineAnswerBox
        ariaLabel={`第 ${questionNumber} 题答案`}
        className={isChoiceText ? "junior-high-choice-inline-answer" : ""}
        maxLength={isChoiceText ? 1 : undefined}
        onChange={(nextValue) => context.onAnswer(question, nextValue)}
        onFocus={() => context.onFocusQuestion?.(question)}
        transform={isChoiceText ? (nextValue) => nextValue.toUpperCase() : undefined}
        value={value}
      />
    </span>
    {context.submitted ? <span className="junior-high-inline-correct">{questionAnswerNeedsReview(question) ? "待校对" : question.answer || "—"}</span> : null}
  </span>;
}

function answerWordCount(question: PaperQuestion) {
  return question.answer?.trim().split(/\s+/).filter(Boolean).length ?? 0;
}

function estimatedBlankSlotCount(blank: string, question: PaperQuestion, blankCount: number) {
  const answerSlots = blankCount === 1 ? answerWordCount(question) : 0;
  const visualSlots = blank.length >= 16 ? 2 : 1;
  return Math.max(1, answerSlots, visualSlots);
}

function renderBlankSlots(question: PaperQuestion, context: InlineQuestionContext, slotCount: number, keyPrefix: string, includeAnswerControl = true): ReactNode[] {
  return Array.from({ length: slotCount }).map((_, index) => index === 0
    ? includeAnswerControl ? renderInlineQuestionControl(question, context) : <span className="junior-high-inline-blank junior-high-inline-blank-wide" key={`${keyPrefix}-${index}`}> </span>
    : <span className="junior-high-inline-blank junior-high-inline-blank-wide" key={`${keyPrefix}-${index}`}> </span>);
}

function renderAnswerBlankText(text: string, question: PaperQuestion, context: InlineQuestionContext): ReactNode {
  const parts = text.split(ANSWER_BLANK_SPLIT_PATTERN);
  const blanks = text.match(ANSWER_BLANK_SPLIT_PATTERN) ?? [];
  let answerControlRendered = false;
  return parts.flatMap((part, index) => {
    const includeAnswerControl = !answerControlRendered;
    if (index < blanks.length) answerControlRendered = true;
    return [
      <span key={`answer-blank-text-${index}`}>{part}</span>,
      index < blanks.length ? renderBlankSlots(question, context, estimatedBlankSlotCount(blanks[index], question, blanks.length), `answer-blank-${index}`, includeAnswerControl) : null,
    ];
  });
}

function inlineBlankQuestionForPart(part: string, parts: string[], index: number, context: InlineQuestionContext) {
  if (!/^\d{1,3}$/.test(part)) return undefined;
  const question = context.questionsByNumber.get(Number(part));
  if (!question) return undefined;
  const previous = parts[index - 1] ?? "";
  const next = parts[index + 1] ?? "";
  const standaloneAtEnd = !next && /\s/.test(previous.slice(-1));
  const surroundedByUnderscores = /_{2,}\s*$/.test(previous) && /^\s*_{2,}/.test(next);
  if (context.forceNumberMarkers && context.explicitNumberMarkers?.has(Number(part))) return question;
  if (context.forceNumberMarkers && !previous && !next) return question;
  if (!surroundedByUnderscores && !/\s{2,}$/.test(previous) && !/^\s{2,}/.test(next) && !standaloneAtEnd) return undefined;
  return question;
}

function renderInteractiveInlineText(text: string, context?: InlineQuestionContext, blockId?: string): ReactNode {
  if (!context) return renderInlineBlanks(text);
  const explicitNumberMarkers = new Set<number>([
    ...Array.from(text.matchAll(/[_＿]{2,}\s*(\d{1,3})\s*[_＿]{2,}/g), (match) => Number(match[1])),
    ...Array.from(text.matchAll(/\.{4,}\s*(\d{1,3})\s*\.{4,}/g), (match) => Number(match[1])),
  ].filter(Number.isFinite));
  const normalizedText = context.forceNumberMarkers
    ? text.replace(/[_＿]{2,}\s*(\d{1,3})\s*[_＿]{2,}/g, " $1 ").replace(/\.{4,}\s*(\d{1,3})\s*\.{4,}/g, " $1 ")
    : text;
  const blockQuestion = blockId ? context.questionsByBlockId?.get(blockId) : undefined;
  const inlineNumberParts = normalizedText.split(INLINE_NUMBER_PATTERN);
  const blockQuestionMarkerNumber = Number(blockQuestion?.source?.originalNumber ?? blockQuestion?.displayNumber ?? blockQuestion?.number);
  const hasBlockQuestionMarker = Boolean(blockQuestion) && inlineNumberParts.some((part) => /^\d{1,3}$/.test(part) && Number(part) === blockQuestionMarkerNumber);
  const hasInlineQuestionNumber = hasBlockQuestionMarker || inlineNumberParts.some((part, index) => Boolean(inlineBlankQuestionForPart(part, inlineNumberParts, index, context)));
  if (blockQuestion && ANSWER_BLANK_TEST_PATTERN.test(normalizedText) && !hasInlineQuestionNumber) return renderAnswerBlankText(normalizedText, blockQuestion, context);
  const sourceSpellingText = blockQuestion ? renderSourceSpellingText(normalizedText, blockQuestion, context) : undefined;
  if (sourceSpellingText) return sourceSpellingText;
  if (blockQuestion && blockId && context.leadingBlankBlockIds?.has(blockId)) {
    return <>
      {renderBlankSlots(blockQuestion, context, Math.max(1, answerWordCount(blockQuestion)), `leading-blank-${blockId}`)}
      <span>{text ? ` ${text}` : ""}</span>
    </>;
  }
  const marker = normalizedText.match(QUESTION_LINE_START_PATTERN);
  if (marker) {
    const rest = normalizedText.slice(marker[0].length);
    const displayMarker = blockQuestion ? "" : marker[0];
    return <>
      <span>{displayMarker}</span>
      <span>{renderInteractiveInlineText(rest, context, blockId)}</span>
    </>;
  }
  return inlineNumberParts.map((part, index) => {
    if (blockQuestion && /^\d{1,3}$/.test(part) && Number(part) === blockQuestionMarkerNumber) return renderInlineQuestionControl(blockQuestion, context);
    const question = inlineBlankQuestionForPart(part, inlineNumberParts, index, { ...context, explicitNumberMarkers });
    if (question) return renderInlineQuestionControl(question, context);
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function InlineAnswerFeedback({ questions, answers, submitted }: { questions: PaperQuestion[]; answers: Record<string, string>; submitted: boolean }) {
  if (!submitted) return null;
  return <div className="junior-high-inline-blank-feedback">{questions.map((question) => <span key={question.id}>第 {questionDisplayNumber(question)} 题：你的答案 {answers[question.id] || "未作答"}；{questionAnswerNeedsReview(question) ? "参考答案正在校对" : `参考答案 ${question.answer || "—"}`}</span>)}</div>;
}

function StandaloneBlankAnswer({ question, value, onAnswer }: { question: PaperQuestion; value: string; onAnswer: (value: string) => void }) {
  return <div className="junior-high-standalone-blank-answer">
    <InlineAnswerBox ariaLabel={`第 ${questionDisplayNumber(question)} 题答案`} className="junior-high-standalone-blank-input" onChange={onAnswer} value={value} />
  </div>;
}

function PaperQuestionCard({ question, value, submitted, onAnswer, cloze }: { question: PaperQuestion; value: string; submitted: boolean; onAnswer: (value: string) => void; cloze?: boolean }) {
  const admin = useContext(JuniorHighAdminContext);
  const [adminEditing, setAdminEditing] = useState(false);
  const [adminDraft, setAdminDraft] = useState({ answer: question.answer, analysis: question.analysis, options: question.options.join("\n"), prompt: question.prompt });
  const [analysisCollapsed, setAnalysisCollapsed] = useState(false);
  const hasOptionImages = Boolean(question.optionImages?.length);
  const displayPrompt = inferMissingBlankPrompt(question);
  const usesPromptBlank = question.inputKind === "blank" && Boolean(displayPrompt.match(QUESTION_BLANK_PATTERN));
  const usesSpellingPrompt = question.inputKind === "text" && (SPELLING_PROMPT_PATTERN.test(question.prompt) || Boolean(spellingMarker(question.prompt, question.answer)));
  const usesChoiceControl = questionUsesChoiceControl(question);
  const isWritingResponse = !usesChoiceControl && question.inputKind === "writing";
  const isOpenResponse = !usesChoiceControl && (question.inputKind === "blank" || question.inputKind === "text" || question.inputKind === "writing" || !question.inputKind);
  const hasChoiceAnswer = usesChoiceControl && Boolean(value);
  const answerNeedsReview = questionAnswerNeedsReview(question);
  const isCorrect = hasChoiceAnswer && !answerNeedsReview && isCorrectObjectiveAnswer(question, value);
  const canShowAnalysis = !answerNeedsReview && (submitted || hasChoiceAnswer);
  const showAnalysisPanel = canShowAnalysis && !analysisCollapsed;
  const optionStateClassName = (label: string) => {
    if (value !== label) return "";
    if (answerNeedsReview) return "selected";
    return isCorrect ? "selected correct-choice" : "selected wrong-choice";
  };
  const optionResultIcon = (label: string) => {
    if (value !== label || answerNeedsReview) return null;
    return <span aria-label={isCorrect ? "正确" : "错误"} className="junior-high-option-result">{isCorrect ? "✅" : "❌"}</span>;
  };
  return (
    <article className={`junior-high-question-card ${cloze ? "junior-high-cloze-question" : ""}`} data-question-number={question.number} id={`junior-high-question-${question.id}`}>
      {question.leadBlocks?.map((block) => block.text && !isSourceLeadText(block.text) ? <p className="junior-high-question-lead" key={block.id}>{block.text}</p> : null)}
      <div className="junior-high-question-heading"><strong>第 {questionDisplayNumber(question)} 题</strong>{admin.isAdmin ? <button type="button" onClick={() => { setAdminDraft({ answer: question.answer, analysis: question.analysis, options: question.options.join("\n"), prompt: question.prompt }); setAdminEditing(true); }}>编辑</button> : null}</div>
      {question.image ? <img alt="题目配图" className="junior-high-question-image" src={question.image} /> : null}{cloze && question.options.length ? null : <p className="junior-high-question-prompt">{usesPromptBlank ? renderQuestionPrompt(compactBlankPrompt(displayPrompt), value, onAnswer) : usesSpellingPrompt ? renderSpellingPrompt(question.prompt, value, onAnswer, question.answer) : renderDialogueText(question.prompt)}</p>}
      {isWritingResponse ? <textarea value={value} onChange={(event) => onAnswer(event.target.value)} placeholder="请输入答案……" rows={question.number === 37 ? 4 : 2} /> : isOpenResponse && !usesPromptBlank && !usesSpellingPrompt ? <StandaloneBlankAnswer onAnswer={onAnswer} question={question} value={value} /> : isOpenResponse ? null : hasOptionImages ? <div className="junior-high-image-options">{question.optionImages?.map((option) => <button className={optionStateClassName(option.label)} key={`${question.id}-${option.label}`} onClick={() => { setAnalysisCollapsed(false); onAnswer(option.label); }} type="button"><span>{option.label}.</span><img alt={option.alt ?? `选项 ${option.label}`} src={option.src} />{optionResultIcon(option.label)}</button>)}</div> : <div className="junior-high-options">{question.options.map((option) => { const label = optionLabel(option); return <button className={optionStateClassName(label)} key={option} onClick={() => { setAnalysisCollapsed(false); onAnswer(label); }} type="button"><span className="junior-high-option-text">{option}</span>{optionResultIcon(label)}</button>; })}</div>}
      <div className={`junior-high-feedback ${submitted ? "" : "junior-high-feedback-analysis-only"}`}>
        {submitted ? <span>你的答案：{value || "未作答"}</span> : null}
        {submitted ? <span>{answerNeedsReview ? "参考答案正在校对" : `${isOpenResponse ? "参考答案" : "正确答案"}：${question.answer || "—"}`}</span> : null}
        {submitted ? <span className={answerNeedsReview || isOpenResponse ? "manual" : isCorrect ? "correct" : "incorrect"}>{answerNeedsReview ? "待人工校对" : isOpenResponse ? "人工复核" : isCorrect ? "✓ 正确" : "✕ 请查看解析"}</span> : null}
        {canShowAnalysis ? <button onClick={() => setAnalysisCollapsed(!analysisCollapsed)} type="button">{showAnalysisPanel ? "收起解析" : "查看解析"}</button> : null}
        {showAnalysisPanel ? <div className="junior-high-analysis"><strong>解析</strong><p>{cleanAnalysisText(question.analysis) || "原解析文件未提供本题的独立解析。"}</p></div> : null}
      </div>
      {admin.isAdmin && adminEditing ? <div className="junior-high-inline-admin-editor"><label>题干<textarea value={adminDraft.prompt} onChange={(event) => setAdminDraft((current) => ({ ...current, prompt: event.target.value }))} /></label><label>选项<textarea value={adminDraft.options} onChange={(event) => setAdminDraft((current) => ({ ...current, options: event.target.value }))} /></label><label>答案<input value={adminDraft.answer} onChange={(event) => setAdminDraft((current) => ({ ...current, answer: event.target.value }))} /></label><label>解析<textarea value={adminDraft.analysis} onChange={(event) => setAdminDraft((current) => ({ ...current, analysis: event.target.value }))} /></label><div><button type="button" onClick={() => { void admin.onSave(question, { answer: adminDraft.answer, analysis: adminDraft.analysis, options: adminDraft.options.split("\n").map((item) => item.trim()).filter(Boolean), prompt: adminDraft.prompt }); setAdminEditing(false); }}>保存</button><button type="button" onClick={() => { void admin.onDelete(question); setAdminEditing(false); }}>删除</button></div></div> : null}
    </article>
  );
}

function ClozeOptionsPanel({ questions, answers, submitted, onAnswer, isAdmin, onAdminSave, onAdminDelete }: { questions: PaperQuestion[]; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void; isAdmin?: boolean; onAdminSave?: (question: PaperQuestion, patch: Partial<PaperQuestion>) => Promise<void>; onAdminDelete?: (question: PaperQuestion) => Promise<void> }) {
  const admin = useContext(JuniorHighAdminContext);
  const cloze = useContext(ClozeAnalysisContext);
  const adminEnabled = admin.isAdmin || Boolean(isAdmin);
  const [openAnalyses, setOpenAnalyses] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ answer: "", analysis: "", options: "", prompt: "" });
  const analysisMode = cloze.mode;
  const hasSubmitted = submitted || cloze.submitted;
  return <div className="junior-high-cloze-options-panel">
    {questions.map((question) => {
      const value = answers[question.id] || "";
      const hasChoiceAnswer = Boolean(value);
      const answerNeedsReview = questionAnswerNeedsReview(question);
      const isCorrect = hasChoiceAnswer && !answerNeedsReview && isCorrectObjectiveAnswer(question, value);
      const canShowAnalysis = !answerNeedsReview && (hasSubmitted || hasChoiceAnswer);
      const showAnalysisPanel = canShowAnalysis && openAnalyses[question.id] !== false;
      const analysisPanelVisible = hasSubmitted || (showAnalysisPanel && analysisMode === "show");
      const resultVisible = analysisMode === "show" || hasSubmitted;
      return <section className="junior-high-cloze-option-row" data-question-number={question.number} id={`junior-high-question-${question.id}`} key={question.id}>
        <div className="junior-high-cloze-option-heading"><strong>第 {questionDisplayNumber(question)} 空</strong>{adminEnabled ? <button type="button" onClick={() => { setEditingId(question.id); setDraft({ answer: question.answer, analysis: question.analysis, options: question.options.join("\n"), prompt: question.prompt }); }}>编辑</button> : null}</div>
        <div className="junior-high-options">{question.options.map((option) => {
          const label = optionLabel(option);
          const selected = value === label;
          const className = selected ? answerNeedsReview || !resultVisible ? "selected" : (isCorrect ? "selected correct-choice" : "selected wrong-choice") : "";
          return <button className={className} key={option} onClick={() => { setOpenAnalyses((current) => ({ ...current, [question.id]: true })); if (analysisMode === "hide") setOpenAnalyses((current) => ({ ...current, [question.id]: false })); onAnswer(question, label); }} type="button"><span className="junior-high-option-text">{option}</span>{selected && resultVisible && !answerNeedsReview ? <span aria-label={isCorrect ? "正确" : "错误"} className="junior-high-option-result">{isCorrect ? "✅" : "❌"}</span> : null}</button>;
        })}</div>
        <div className="junior-high-cloze-analysis-control">
          {answerNeedsReview && hasSubmitted ? <span>答案正在校对</span> : null}
          {canShowAnalysis ? <button onClick={() => setOpenAnalyses((current) => ({ ...current, [question.id]: !analysisPanelVisible }))} type="button">{analysisPanelVisible ? "收起解析" : "查看解析"}</button> : null}
        </div>
        {analysisPanelVisible ? <div className="junior-high-analysis"><strong>解析</strong><p>{cleanAnalysisText(question.analysis) || "原解析文件未提供本题的独立解析。"}</p></div> : null}
        {adminEnabled && editingId === question.id ? <div className="junior-high-inline-admin-editor"><label>题干<textarea value={draft.prompt} onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))} /></label><label>选项<textarea value={draft.options} onChange={(event) => setDraft((current) => ({ ...current, options: event.target.value }))} /></label><label>答案<input value={draft.answer} onChange={(event) => setDraft((current) => ({ ...current, answer: event.target.value }))} /></label><label>解析<textarea value={draft.analysis} onChange={(event) => setDraft((current) => ({ ...current, analysis: event.target.value }))} /></label><div><button type="button" onClick={() => { void (onAdminSave ?? admin.onSave)(question, { answer: draft.answer, analysis: draft.analysis, options: draft.options.split("\n").map((item) => item.trim()).filter(Boolean), prompt: draft.prompt }); setEditingId(""); }}>保存</button><button type="button" onClick={() => { void (onAdminDelete ?? admin.onDelete)(question); setEditingId(""); }}>删除</button></div></div> : null}
      </section>;
    })}
  </div>;
}

function BookTable({ books }: { books: BookCard[] }) {
  return <div className="junior-high-book-table" aria-label="阅读理解 A 课程或书籍介绍">{books.map((book: BookCard) => <article className="junior-high-book-card" key={book.letter}><div className="junior-high-book-letter">{book.letter}</div>{book.image ? <img alt={`${book.title} 配图`} src={book.image} /> : null}<div className="junior-high-book-copy"><h3>{book.title}</h3>{book.author || book.site ? <p className="junior-high-book-meta">{book.author}{book.author && book.site ? <br /> : null}{book.site}</p> : null}{book.format || book.price ? <p className="junior-high-book-meta">{book.format}{book.format && book.price ? <br /> : null}{book.price}</p> : null}<p>{book.description}</p></div></article>)}</div>;
}

function PassageGroup({ title, context, questions, answers, submitted, onAnswer, variant = "text", image, books }: { title: string; context: string; questions: PaperQuestion[]; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void; variant?: "text" | "cloze" | "readingA" | "readingResponse"; image?: string | string[]; books?: BookCard[] }) {
  const images = image ? (Array.isArray(image) ? image : [image]) : [];
  const questionPanel = variant === "cloze"
    ? <ClozeOptionsPanel answers={answers} onAnswer={onAnswer} questions={questions} submitted={submitted} />
    : questions.map((question) => <PaperQuestionCard key={question.id} onAnswer={(value) => onAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />);
  return <section className="junior-high-passage-layout"><div className="junior-high-passage-column"><h3>{title}</h3>{variant === "readingA" ? <><>{images.map((src) => <img alt={`${title} 原文配图`} className="junior-high-context-image" key={src} src={src} />)}</><BookTable books={books ?? []} /></> : <><>{images.map((src) => <img alt={`${title} 原文配图`} className="junior-high-context-image" key={src} src={src} />)}</><div className="junior-high-passage-text">{variant === "cloze" ? renderContext(context) : context}</div></>}{variant === "cloze" ? <p className="junior-high-passage-note">文中题号后的虚线为填空位置，请结合上下文选择答案。</p> : null}</div><div className="junior-high-passage-questions">{questionPanel}</div></section>;
}

function WritingTask({ id, label, prompt, requirements, opening, closing, value, onChange, children }: { id?: string; label: string; prompt: string; requirements: string; opening?: string; closing?: string; value: string; onChange: (value: string) => void; children?: ReactNode }) {
  const wordCount = countWords(value);
  const cleanPrompt = cleanWritingPrompt(prompt, requirements);
  return <section className="junior-high-writing-task" id={id}><h3>{label}</h3>{cleanPrompt ? <p className="junior-high-writing-prompt">{cleanPrompt}</p> : null}{children}<p className="junior-high-writing-requirements">{requirements}</p>{opening ? <p className="junior-high-writing-opening">{opening}</p> : null}<textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="请在此处完成作文……" rows={9} /><div className="junior-high-writing-word-count">字数：{wordCount}</div>{closing ? <p className="junior-high-writing-closing">{closing}</p> : null}</section>;
}

function cleanWritingPrompt(prompt: string, requirements = "") {
  const requirementLines = new Set(requirements.split("\n").map((line) => line.trim()).filter(Boolean));
  return prompt
    .split("\n")
    .filter((line) => !/^_+\s*$/.test(line.trim()) && !requirementLines.has(line.trim()))
    .join("\n")
    .trim();
}

function renderDialogueText(text: string): ReactNode {
  const speakerPattern = /(?=[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*:\s)/g;
  const speakerLabels = text.match(/[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*:\s/g) ?? [];
  const lines = text.includes("—")
    ? text.split(/(?=—)/g)
    : speakerLabels.length > 1
      ? text.split(speakerPattern)
      : [text];
  if (lines.length === 1) return text;
  return <>{lines.map((line, index) => <span className="junior-high-dialogue-line" key={`${line}-${index}`}>{line.trim()}</span>)}</>;
}

function GenericPaperContent({ paper, answers, submitted, onAnswer, writingA, writingB, onWritingA, onWritingB }: { paper: JuniorHighPaper; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void; writingA: string; writingB: string; onWritingA: (value: string) => void; onWritingB: (value: string) => void }) {
  return <>
    <section className="junior-high-paper-section"><h2>原卷内容</h2><div className="junior-high-generic-source">{paper.assets?.audio?.length ? <div className="junior-high-audio-list"><strong>听力音频</strong>{paper.assets.audio.map((src, index) => <label key={src}>音频 {index + 1}<audio controls preload="metadata" src={src} /></label>)}</div> : null}{paper.assets?.all?.map((src) => <img alt="原卷配图" className="junior-high-context-image" key={src} src={src} />)}<p>该试卷正在转换为结构化版式，请稍后查看分节内容。</p></div></section>
    <section className="junior-high-paper-section"><h2>题目</h2><div className="junior-high-question-stack">{paper.questions.map((question) => <PaperQuestionCard key={question.id} onAnswer={(value) => onAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div></section>
    <section className="junior-high-paper-section"><h2>{paper.writing.title ?? "写作"}</h2><div className="junior-high-paper-writing"><WritingTask label="A." prompt={paper.writing.promptA} requirements={paper.writing.requirementsA} value={writingA} onChange={onWritingA} /><WritingTask label="B." prompt={paper.writing.promptB} requirements={paper.writing.requirementsB} value={writingB} onChange={onWritingB} />{submitted ? <div className="junior-high-feedback"><span>作文：已提交</span><span className="manual">人工评分</span></div> : null}</div></section>
  </>;
}

function PracticePaperContent({ paper, answers, submitted, onAnswer, writingAnswers, onWritingAnswer }: { paper: JuniorHighPaper; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void; writingAnswers: Record<string, string>; onWritingAnswer: (taskId: string, value: string) => void }) {
  if (paper.parts?.length || paper.sections?.length || paper.writingTasks?.length) {
    return <StructuredPaperContent answers={answers} onAnswer={onAnswer} onWritingAnswer={onWritingAnswer} paper={paper} submitted={submitted} writingAnswers={writingAnswers} />;
  }
  return <section className="junior-high-paper-section"><h2>题目</h2><div className="junior-high-question-stack">{paper.questions.map((question) => <PaperQuestionCard key={question.id} onAnswer={(value) => onAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div></section>;
}

function renderStructuredTableCell(cell: string, inlineContext?: InlineQuestionContext) {
  const lines = splitJuniorHighTableCell(cell);
  if (lines.length === 1) return inlineContext ? renderInteractiveInlineText(lines[0], inlineContext) : lines[0];
  return <>{lines.map((line, index) => <span className="junior-high-source-table-line" key={`${line}-${index}`}>{inlineContext ? renderInteractiveInlineText(line, inlineContext) : line}</span>)}</>;
}

function renderStructuredBlock(block: JuniorHighBlock, section: { title: string }, inlineContext?: InlineQuestionContext): ReactNode {
  if (block.kind === "paragraph") {
    const text = cleanQuestionDisplayText(block.text ?? "");
    if (!text || text === section.title) return null;
    return <p className="junior-high-source-paragraph">{text.includes("—") && !inlineContext ? renderDialogueText(text) : renderInteractiveInlineText(text, inlineContext, block.id)}</p>;
  }
  if (block.kind === "image" && block.src) {
    return <img alt={block.alt ?? `${section.title} 原卷图片`} className="junior-high-source-image" src={block.src} />;
  }
  if (block.kind === "audio" && block.src) {
    return <audio className="junior-high-source-audio" controls preload="metadata" src={block.src} />;
  }
  if (block.kind === "table" && block.rows?.length) {
    const columnCount = Math.max(...block.rows.map((row) => row.length));
    return <div className="junior-high-source-table-wrap"><table className="junior-high-source-table"><colgroup>{Array.from({ length: columnCount }).map((_, index) => <col key={`${block.id}-col-${index}`} style={{ width: juniorHighTableColumnWidth(columnCount, index, block.tableType) }} />)}</colgroup><tbody>{block.rows.map((row, rowIndex) => {
      const shouldMerge = row.length === 1 && columnCount > 1 && shouldMergeJuniorHighTableCell(row[0], rowIndex, block.tableType);
      const cells = shouldMerge ? row : [...row, ...Array.from({ length: Math.max(0, columnCount - row.length) }, () => "")];
      return <tr key={`${block.id}-${rowIndex}`}>{cells.map((cell, cellIndex) => <td className={shouldMerge ? "junior-high-source-table-merged" : undefined} colSpan={shouldMerge && cellIndex === 0 ? columnCount : 1} key={`${block.id}-${rowIndex}-${cellIndex}`}>{renderStructuredTableCell(cell, inlineContext)}</td>)}</tr>;
    })}</tbody></table></div>;
  }
  return null;
}

function structuredBlockSearchText(block: JuniorHighBlock) {
  return [block.text ?? "", ...(block.rows?.flat() ?? [])].join(" ");
}

function sourceCanRenderInlineQuestion(question: PaperQuestion, blocks: JuniorHighBlock[], forceNumberMarkers: boolean, groupTitle: string) {
  if (/完成句子/.test(groupTitle)) return true;
  const sourceBlockIds = new Set(question.sourceBlockIds ?? []);
  const originalNumber = Number(question.source?.originalNumber ?? question.displayNumber ?? question.number);
  return blocks.some((block) => {
    const text = structuredBlockSearchText(block);
    const belongsToQuestion = sourceBlockIds.has(block.id);
    if (!belongsToQuestion && !forceNumberMarkers) return false;
    if (belongsToQuestion && (ANSWER_BLANK_TEST_PATTERN.test(text) || Boolean(spellingMarker(text, question.answer)) || Boolean(spellingMarker(question.prompt, question.answer)))) return true;
    return forceNumberMarkers && Number.isFinite(originalNumber) && new RegExp(`_{2,}\\s*${originalNumber}\\s*_{2,}`).test(text);
  });
}

function DialogueCompletionGroup({ group, questions, answers, submitted, onAnswer }: { group: JuniorHighQuestionGroup; questions: PaperQuestion[]; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void }) {
  const [activeQuestionId, setActiveQuestionId] = useState(() => questions.find((question) => !answers[question.id])?.id ?? questions[0]?.id ?? "");
  const questionsByNumber = new Map(questions.flatMap((question) => [
    [question.number, question] as const,
    [Number(questionDisplayNumber(question)), question] as const,
    [Number(question.sourceQuestionNumber), question] as const,
    [Number(question.source?.originalNumber), question] as const,
  ]).filter(([number]) => Number.isFinite(number)));
  const questionsByBlockId = new Map(questions.flatMap((question) => (question.sourceBlockIds ?? []).map((sourceBlockId) => [sourceBlockId, question] as const)));
  const inlineContext: InlineQuestionContext = { answers, forceNumberMarkers: true, mode: "choice-text", onAnswer, onFocusQuestion: (question) => setActiveQuestionId(question.id), questionsByBlockId, questionsByNumber, submitted };
  const instructionSet = new Set(group.instructions.map(cleanQuestionDisplayText).map((instruction) => instruction.trim()));
  const dialogueBlocks = group.blocks.filter((block) => {
    const text = cleanQuestionDisplayText(block.text ?? "").trim();
    if (!text || text === group.title.trim() || instructionSet.has(text)) return false;
    if (isNonQuestionInstruction(text)) return false;
    if (block.kind === "paragraph" && isAnswerOptionText(text)) return false;
    return true;
  });
  const blockOptions = group.blocks
    .map((block) => (block.text ?? "").trim())
    .filter(isAnswerOptionText)
    .map((text) => {
      const match = text.match(/^\s*([A-GＡ-Ｇ])\s*[．.、)]\s*(.+)$/);
      if (!match) return text;
      const label = match[1].replace(/[Ａ-Ｇ]/, (value) => String.fromCharCode(value.charCodeAt(0) - 65248));
      return `${label}. ${match[2].trim()}`;
    });
  const options = questions[0]?.options.length ? questions[0].options : blockOptions;
  const activeQuestion = questions.find((question) => question.id === activeQuestionId) ?? questions.find((question) => !answers[question.id]) ?? questions[0];
  return <div className="junior-high-dialogue-match-layout">
    <div className="junior-high-dialogue-source">{dialogueBlocks.map((block) => <div className="junior-high-structured-block" key={block.id}>{renderStructuredBlock(block, group, inlineContext)}</div>)}</div>
    <div aria-label="补全对话备选选项" className="junior-high-dialogue-option-bank">
      {activeQuestion ? <p className="junior-high-dialogue-active-hint">正在填写第 {questionDisplayNumber(activeQuestion)} 空；也可先点击左侧其他空位。</p> : null}
      {options.map((option) => {
        const label = optionLabel(option);
        return <button className={activeQuestion && answers[activeQuestion.id] === label ? "selected" : ""} disabled={!activeQuestion} key={option} onClick={() => {
          if (!activeQuestion) return;
          onAnswer(activeQuestion, label);
          const nextQuestion = questions.find((question) => question.id !== activeQuestion.id && !answers[question.id]);
          if (nextQuestion) setActiveQuestionId(nextQuestion.id);
        }} type="button">{option}</button>;
      })}
    </div>
    <InlineAnswerFeedback answers={answers} questions={questions} submitted={submitted} />
  </div>;
}

function StructuredPaperContent({ paper, answers, submitted, onAnswer, writingAnswers, onWritingAnswer }: { paper: JuniorHighPaper; answers: Record<string, string>; submitted: boolean; onAnswer: (question: PaperQuestion, value: string) => void; writingAnswers: Record<string, string>; onWritingAnswer: (taskId: string, value: string) => void }) {
  const parts = paper.parts ?? [];
  const sections = paper.sections ?? [];
  const questionsById = new Map(paper.questions.map((question) => [question.id, question]));
  const fallbackWritingTask: JuniorHighWritingTask[] = paper.writing.promptA.trim() || paper.writing.requirementsA.trim()
    ? [{ id: "writing-1", label: "写作", prompt: paper.writing.promptA, requirements: paper.writing.requirementsA }]
    : [];
  const writingTasks = paper.writingTasks?.length ? paper.writingTasks : (paper.layout === "practice" ? [] : fallbackWritingTask);
  const detectedWritingSectionTitle = paper.parts?.find((part) => /书面表达|写作|作文/.test(part.title))?.title
    ?? paper.parts?.flatMap((part) => part.groups).find((group) => group.questionIds.length === 0 && /书面表达|写作|作文/.test(group.title) && isSectionHeading(group.title))?.title
    ?? paper.writing.title?.trim();
  const writingSectionTitle = detectedWritingSectionTitle || "书面表达";
  const isTypePracticePaper = paper.layout === "practice" && !paper.topicGroup && Boolean(paper.questionType);
  return <>
    {(parts.length ? parts : sections.map((section) => ({ id: section.id, title: section.title, instructions: section.instructions, groups: [{ id: `${section.id}-group-1`, title: section.title, instructions: section.instructions, blocks: section.blocks, displayBlocks: section.displayBlocks, questionIds: section.questionIds }] } as JuniorHighPart))).map((part) => {
      const renderGroups = normalizeStructuredGroups(part.groups, questionsById);
      if (!renderGroups.length) return null;
      const displayPartTitle = cleanDisplayHeading(part.title);
      const isClozeTypePractice = isTypePracticePaper && paper.questionType === "完形填空";
      const showPartTitle = Boolean(displayPartTitle) && !isExamInstructionTitle(part.title) && displayPartTitle !== "试卷正文" && !isClozeTypePractice;
      const partInstructions = visiblePartInstructions(part.title, part.instructions).map(cleanDisplayHeading).filter(Boolean);
      return <section className="junior-high-paper-section junior-high-structured-part" key={part.id}>
      {showPartTitle ? <h2>{displayPartTitle}</h2> : null}
      {showPartTitle ? partInstructions.slice(0, 2).map((instruction) => <p className="junior-high-paper-intro" key={`${part.id}-${instruction}`}>{instruction}</p>) : null}
      {renderGroups.map((group: JuniorHighQuestionGroup & { sourceOnly?: boolean }) => {
        const rawGroupQuestions = group.questionIds.map((id) => questionsById.get(id)).filter((question): question is PaperQuestion => Boolean(question));
        const groupQuestions = rawGroupQuestions.filter((question) => shouldRenderTypePracticeQuestion(paper, question, part.title, group.title, group.instructions));
        const initialDisplayBlocks = group.displayBlocks?.length ? group.displayBlocks : group.blocks;
        const groupType = classifyJuniorHighGroup({ partTitle: part.title, group, questions: groupQuestions, displayBlocks: initialDisplayBlocks });
        const layoutFamily = resolveJuniorHighLayoutFamily({ questionType: paper.questionType, partTitle: part.title, group: { ...group, groupType }, questions: groupQuestions });
        const hasDialogueOptions = groupQuestions.some((question) => question.options.length > 0)
          || group.blocks.some((block) => isAnswerOptionText((block.text ?? "").trim()));
        const useDialogueMatchLayout = layoutFamily === "dialogue-completion" && hasDialogueOptions;
        const isInlineBlankGroup = layoutFamily === "inline-blank" || layoutFamily === "table-fill" || (layoutFamily === "dialogue-completion" && !hasDialogueOptions);
        const isClozeGroup = groupType === "cloze";
        const isClozeSourceGroup = isClozeGroup || (isClozeTypePractice && groupQuestions.length > 0 && initialDisplayBlocks.some((block) => /[_＿]{2,}|\.{4,}/.test(block.text ?? "")));
        const isDialogueCompletionGroup = layoutFamily === "dialogue-completion";
        const isPlainChoiceGroup = layoutFamily === "standalone-choice";
        const displayBlocks = isInlineBlankGroup || isDialogueCompletionGroup ? group.blocks : initialDisplayBlocks;
        const useReadingLayout = (layoutFamily === "passage-choice" || layoutFamily === "short-answer") && groupQuestions.length > 0 && displayBlocks.length > 0;
        const canRenderInlineSource = isInlineBlankGroup && displayBlocks.length > 0;
        const splitGroupTitle = isTypePracticePaper ? splitJuniorHighGroupTitle(group.title) : { title: group.title, instruction: "" };
        const groupInstructionSet = new Set([...group.instructions, ...(splitGroupTitle.instruction ? [splitGroupTitle.instruction] : [])].map(cleanQuestionDisplayText).map((instruction) => instruction.trim()));
        const visibleBlocks = displayBlocks.filter((block) => {
          const text = cleanQuestionDisplayText(block.text ?? "").trim();
          if (isClozeSourceGroup && /^[\d\s._-]{1,16}$/.test(text)) return false;
          if (block.kind !== "paragraph") return true;
          if (groupInstructionSet.has(text) || text === part.title.trim() || isNonQuestionInstruction(text) || isSourceLeadText(text)) return false;
          if (isClozeSourceGroup && (CLOZE_SOURCE_HEADING_PATTERN.test(text) || CLOZE_SOURCE_LABEL_PATTERN.test(text))) return false;
          if ((isClozeSourceGroup || useReadingLayout) && isAnswerOptionText(text)) return false;
          return true;
        });
        const forceNumberMarkers = isDialogueCompletionGroup || displayBlocks.some((block) => block.kind === "table" && block.tableType === "info-conversion");
        const inlineQuestions = canRenderInlineSource ? groupQuestions.filter((question) => questionCanUseInlineBlankControl(question) && sourceCanRenderInlineQuestion(question, displayBlocks, forceNumberMarkers, `${part.title} ${group.title}`)) : [];
        const inlineQuestionIds = new Set(inlineQuestions.map((question) => question.id));
        const cardQuestions = canRenderInlineSource ? groupQuestions.filter((question) => !inlineQuestionIds.has(question.id)) : groupQuestions;
        const hiddenCardSourceBlockIds = new Set(canRenderInlineSource ? cardQuestions.flatMap((question) => question.sourceBlockIds ?? []) : []);
        const sourceAnswerQuestions = canRenderInlineSource ? inlineQuestions : groupQuestions;
        const questionsByNumber = new Map(sourceAnswerQuestions.flatMap((question) => [
          [question.number, question] as const,
          [Number(questionDisplayNumber(question)), question] as const,
          [Number(question.sourceQuestionNumber), question] as const,
          [Number(question.source?.originalNumber), question] as const,
        ]).filter(([number]) => Number.isFinite(number)));
        const clozeQuestionsBySourceNumber = new Map(sourceAnswerQuestions.map((question) => [
          Number(question.sourceQuestionNumber ?? question.source?.originalNumber),
          question,
        ] as const).filter(([number]) => Number.isFinite(number)));
        const questionsByBlockId = new Map(sourceAnswerQuestions.flatMap((question) => (question.sourceBlockIds ?? []).map((sourceBlockId) => [sourceBlockId, question] as const)));
        const leadingBlankBlockIds = new Set<string>();
        if (isInlineBlankGroup && /完成句子/.test(group.title)) {
          let activeQuestion: PaperQuestion | undefined;
          for (const block of displayBlocks) {
            const text = (block.text ?? "").trim();
            const marker = text.match(QUESTION_LINE_START_PATTERN);
            const markerNumber = marker?.[0].match(/\d{1,3}/)?.[0];
            const markerQuestion = markerNumber ? questionsByNumber.get(Number(markerNumber)) : undefined;
            if (markerQuestion) {
              activeQuestion = markerQuestion;
              continue;
            }
            if (!activeQuestion || block.kind !== "paragraph" || !text || groupInstructionSet.has(text) || isNonQuestionInstruction(text)) continue;
            if (!questionsByBlockId.has(block.id)) questionsByBlockId.set(block.id, activeQuestion);
            if (!ANSWER_BLANK_TEST_PATTERN.test(block.text ?? "")) leadingBlankBlockIds.add(block.id);
          }
        }
        const inlineContext = canRenderInlineSource ? { answers, forceNumberMarkers, mode: "text" as const, onAnswer, leadingBlankBlockIds, questionsByBlockId, questionsByNumber, submitted } : undefined;
        const sourceCitation = isClozeSourceGroup ? clozeSourceCitation(visibleBlocks[0]?.text ?? "") : "";
        const clozeBlankCursor: ClozeBlankCursor = { index: 0, usedQuestionIds: new Set<string>() };
        const sourceBlocks = <div className="junior-high-structured-blocks">{sourceCitation ? <p className="junior-high-source-citation">{sourceCitation}</p> : null}{visibleBlocks.map((block, index) => { if (block.kind === "paragraph" && hiddenCardSourceBlockIds.has(block.id)) return null; const baseText = sourceCitation && index === 0 && block.kind === "paragraph" ? removeClozeSourceCitation(block.text ?? "") : block.text ?? ""; const cleanedText = isClozeSourceGroup ? baseText.replace(/\s+\d{1,3}\s*$/, "") : baseText; const mappedQuestion = questionsByBlockId.get(block.id); const restoredText = mappedQuestion && spellingMarker(mappedQuestion.prompt, mappedQuestion.answer) && !spellingMarker(cleanedText, mappedQuestion.answer) ? mappedQuestion.prompt : cleanedText; const displayBlock = block.kind === "paragraph" ? { ...block, text: restoredText } : block; return <div className="junior-high-structured-block" key={block.id}>{isClozeSourceGroup && block.kind === "paragraph" ? renderNumberedClozeText(restoredText, clozeQuestionsBySourceNumber, groupQuestions, clozeBlankCursor) : renderStructuredBlock(displayBlock, group, inlineContext)}</div>; })}</div>;
        const mediaBlocks = visibleBlocks.filter((block) => block.kind === "image" || block.kind === "audio" || block.kind === "table");
        const mediaSourceBlocks = mediaBlocks.length ? <div className="junior-high-structured-blocks">{mediaBlocks.map((block) => <div className="junior-high-structured-block" key={block.id}>{renderStructuredBlock(block, group, inlineContext)}</div>)}</div> : null;
        const isWritingLikeSourceGroup = /书面表达|写作|作文/.test(`${part.title} ${group.title}`);
        if (!groupQuestions.length) return null;
        if (group.sourceOnly && isWritingLikeSourceGroup) return null;
        const useSourceQuestionLayout = useReadingLayout || (
          isTypePracticePaper
          && !isDialogueCompletionGroup
          && !canRenderInlineSource
          && !isPlainChoiceGroup
          && cardQuestions.length > 0
          && visibleBlocks.length > 0
        );
        const shouldRenderSourceBlocks = isClozeSourceGroup || (!isPlainChoiceGroup && groupQuestions.length > 0 && ((canRenderInlineSource && inlineQuestions.length > 0) || useSourceQuestionLayout));
        const shouldRenderMediaBlocks = Boolean(mediaSourceBlocks) && (!shouldRenderSourceBlocks && (groupQuestions.length > 0 || Boolean(group.sourceOnly)));
        const questionBlocks = cardQuestions.length ? isClozeSourceGroup
          ? <ClozeOptionsPanel answers={answers} onAnswer={onAnswer} questions={cardQuestions} submitted={submitted} />
          : <div className="junior-high-question-stack">{cardQuestions.map((question) => <PaperQuestionCard key={question.id} onAnswer={(value) => onAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div>
          : null;
        const titleIsPassageLabel = isPassageLabel(splitGroupTitle.title);
        const displayGroupTitle = cleanDisplayHeading(splitGroupTitle.title);
        const showGroupTitle = Boolean(displayGroupTitle) && !titleIsPassageLabel && displayGroupTitle !== displayPartTitle && isSectionHeading(group.title) && !isClozeTypePractice;
        const showGroupInstructionTitle = Boolean(displayGroupTitle) && !titleIsPassageLabel && displayGroupTitle !== displayPartTitle && !showGroupTitle && !isClozeTypePractice;
        const groupInstructions = visibleGroupInstructions({ includeTitleInstruction: isTypePracticePaper, partTitle: part.title, group, groupType }).map(cleanDisplayHeading).filter(Boolean);
        const passageLabel = titleIsPassageLabel && !isClozeTypePractice ? <h3 className="junior-high-passage-label">{splitGroupTitle.title}</h3> : null;
        return <section className={`junior-high-question-group ${group.sourceOnly ? "junior-high-source-only-group" : ""} ${useSourceQuestionLayout ? "junior-high-reading-question-group" : ""}`} data-layout-family={layoutFamily} key={group.id}>
          {showGroupTitle ? <h3>{displayGroupTitle}</h3> : null}
          {showGroupInstructionTitle ? <p className="junior-high-paper-intro junior-high-group-instruction">{displayGroupTitle}</p> : null}
          {groupInstructions.map((instruction) => <p className="junior-high-paper-intro" key={`${group.id}-${instruction}`}>{instruction}</p>)}
          {group.audio?.map((src, index) => <label className="junior-high-inline-audio" key={src}>听力音频 {index + 1}<audio controls preload="metadata" src={src} /></label>)}
          {useDialogueMatchLayout ? <DialogueCompletionGroup answers={answers} group={group} onAnswer={onAnswer} questions={groupQuestions} submitted={submitted} /> : useSourceQuestionLayout ? <div className="junior-high-passage-layout junior-high-structured-reading-layout"><div className="junior-high-passage-column">{passageLabel}{sourceBlocks}</div><div className="junior-high-passage-questions">{questionBlocks}</div></div> : <>{shouldRenderSourceBlocks ? sourceBlocks : shouldRenderMediaBlocks ? mediaSourceBlocks : null}{canRenderInlineSource ? <InlineAnswerFeedback answers={answers} questions={inlineQuestions} submitted={submitted} /> : null}{cardQuestions.length && questionBlocks ? questionBlocks : null}</>}
        </section>;
      })}
    </section>})}
    {writingTasks.length ? <section className="junior-high-paper-section" data-layout-family="writing"><h2>{writingSectionTitle}</h2><div className="junior-high-paper-writing">{writingTasks.map((task) => {
      const value = writingAnswers[task.id] || "";
      return <WritingTask closing={task.closing} id={`junior-high-question-${task.id}`} key={task.id} label={`第 ${task.displayNumber ?? task.number} 题 · ${task.label}`} opening={task.opening} prompt={task.prompt} requirements={task.requirements} value={value} onChange={(nextValue) => onWritingAnswer(task.id, nextValue)}>{task.table?.length ? <table className="junior-high-writing-table"><tbody>{task.table.map((row, rowIndex) => <tr key={`${task.id}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${task.id}-${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table> : null}{task.image ? <img alt={`${task.label} 写作配图`} className="junior-high-writing-diagram" src={task.image} /> : null}{submitted && task.analysis ? <details className="junior-high-writing-reference"><summary>查看参考范文与解析</summary><p>{task.analysis}</p></details> : null}</WritingTask>;
    })}{submitted ? <div className="junior-high-feedback"><span>作文：已提交</span><span className="manual">人工评分</span></div> : null}</div></section> : null}
  </>;
}

export function JuniorHighPaperWorkbench({ paper, onBack, autoStart = true, timerMode = "countdown", source, isAdmin = false, adminUserId = "" }: { paper: JuniorHighPaper; onBack: () => void; autoStart?: boolean; timerMode?: "countdown" | "stopwatch"; source?: JuniorHighWorkbenchSource; isAdmin?: boolean; adminUserId?: string }) {
  const displayPaper = canonicalizeJuniorHighQuestionSequence(normalizedPracticePaper(paper));
  const displayTitle = (displayPaper.displayTitle ?? `中考英语 ${displayPaper.year}年${displayPaper.region}${displayPaper.label}`).replace(/\s*[·•]\s*可审计样本/g, "");
  const attemptStorageKey = juniorHighAttemptStorageKey(displayPaper, source);
  const [running, setRunning] = useState(autoStart);
  const [seconds, setSeconds] = useState(autoStart ? paper.durationMinutes * 60 : 0);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [writingA, setWritingA] = useState("");
  const [writingB, setWritingB] = useState("");
  const [writingAnswers, setWritingAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [clozeAnalysisMode, setClozeAnalysisMode] = useState<"show" | "hide">("show");
  const [clozeAnalysisMenuOpen, setClozeAnalysisMenuOpen] = useState(false);
  const [clozeSubmitted, setClozeSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pageRef = useRef<HTMLElement | null>(null);
  const skipAttemptPersistRef = useRef(false);

  useEffect(() => {
    skipAttemptPersistRef.current = true;
    try {
      const saved = JSON.parse(window.localStorage.getItem(attemptStorageKey) || "null") as {
        answers?: Record<string, string>;
        writingAnswers?: Record<string, string>;
        writingA?: string;
        writingB?: string;
        current?: number;
        submitted?: boolean;
        clozeSubmitted?: boolean;
      } | null;
      setAnswers(saved?.answers && typeof saved.answers === "object" ? saved.answers : {});
      setWritingAnswers(saved?.writingAnswers && typeof saved.writingAnswers === "object" ? saved.writingAnswers : {});
      setWritingA(typeof saved?.writingA === "string" ? saved.writingA : "");
      setWritingB(typeof saved?.writingB === "string" ? saved.writingB : "");
      setSubmitted(Boolean(saved?.submitted));
      setClozeSubmitted(Boolean(saved?.clozeSubmitted));
      if (typeof saved?.current === "number" && saved.current >= 0 && saved.current < displayPaper.questions.length) setCurrent(saved.current);
    } catch {
      setAnswers({});
      setWritingAnswers({});
      setWritingA("");
      setWritingB("");
      setSubmitted(false);
      setClozeSubmitted(false);
    }
  }, [attemptStorageKey, displayPaper.questions.length]);

  useEffect(() => {
    if (skipAttemptPersistRef.current) {
      skipAttemptPersistRef.current = false;
      return;
    }
    try {
      const writingTasks = displayPaper.writingTasks ?? [];
      const responseCount = displayPaper.questions.length + writingTasks.length;
      const completed = responseCount > 0
        && displayPaper.questions.every((question) => Boolean(answers[question.id]?.trim()))
        && writingTasks.every((task) => Boolean(writingAnswers[task.id]?.trim()));
      const previous = JSON.parse(window.localStorage.getItem(attemptStorageKey) || "null") as { completedAt?: string } | null;
      window.localStorage.setItem(attemptStorageKey, JSON.stringify({ answers, current, writingA, writingB, writingAnswers, submitted, clozeSubmitted, completedAt: previous?.completedAt || (completed ? new Date().toISOString() : undefined) }));
    } catch {
      // Local persistence is best-effort and must not block answering.
    }
  }, [answers, attemptStorageKey, clozeSubmitted, current, displayPaper.questions.length, displayPaper.writingTasks?.length, submitted, writingA, writingB, writingAnswers]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => timerMode === "countdown" ? value - 1 : value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running, timerMode]);

  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId.startsWith("junior-high-question-")) return;
    const questionId = targetId.replace("junior-high-question-", "");
    const targetIndex = displayPaper.questions.findIndex((question) => question.id === questionId);
    if (targetIndex >= 0) setCurrent(targetIndex);
    window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }, [displayPaper.fileName]);

  useEffect(() => {
    document.documentElement.classList.toggle("ielts-fullscreen-active", isFullscreen);
    return () => document.documentElement.classList.remove("ielts-fullscreen-active");
  }, [isFullscreen]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) setIsFullscreen(false);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function selectQuestion(index: number) {
    const question = displayPaper.questions[index];
    if (!question) return;
    setCurrent(index);
    document.getElementById(`junior-high-question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function toggleFullscreen() {
    if (isFullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setIsFullscreen(false);
      return;
    }
    setIsFullscreen(true);
    if (!document.fullscreenElement && pageRef.current?.requestFullscreen) await pageRef.current.requestFullscreen().catch(() => undefined);
  }

  const beijingRange = (from: number, to: number) => displayPaper.questions.filter((question) => question.number >= from && question.number <= to);
  const handleAnswer = (question: PaperQuestion, value: string) => {
    setAnswers((previous) => ({ ...previous, [question.id]: value }));
    syncWrongQuestionFavorite(displayPaper, question, value, source);
  };
  const handleWritingAnswer = (taskId: string, value: string) => setWritingAnswers((previous) => ({ ...previous, [taskId]: value }));
  const resetAttempt = () => {
    setAnswers({});
    setWritingAnswers({});
    setWritingA("");
    setWritingB("");
    setCurrent(0);
    setSubmitted(false);
    setClozeSubmitted(false);
    try {
      window.localStorage.removeItem(attemptStorageKey);
    } catch {
      // Resetting the visible attempt must still work when storage is unavailable.
    }
  };
  async function handleAdminSave(question: PaperQuestion, patch: Partial<PaperQuestion>) {
    if (!isAdmin || !adminUserId) return;
    const overrides = await loadJuniorHighQuestionOverrides();
    const error = await saveJuniorHighQuestionOverrides(adminUserId, { ...overrides, [question.id]: { patch } });
    if (error) window.alert(`保存失败：${error.message}`);
    else window.location.reload();
  }
  async function handleAdminDelete(question: PaperQuestion) {
    if (!isAdmin || !adminUserId) return;
    if (!window.confirm(`确定删除第 ${questionDisplayNumber(question)} 题吗？`)) return;
    const overrides = await loadJuniorHighQuestionOverrides();
    const error = await saveJuniorHighQuestionOverrides(adminUserId, { ...overrides, [question.id]: { deleted: true } });
    if (error) window.alert(`删除失败：${error.message}`);
    else window.location.reload();
  }

  const clozeAnalysisContextValue: ClozeAnalysisContextValue = { mode: clozeAnalysisMode, menuOpen: clozeAnalysisMenuOpen, submitted: clozeSubmitted, setMenuOpen: setClozeAnalysisMenuOpen, setMode: setClozeAnalysisMode, submit: () => setClozeSubmitted(true) };
  return <JuniorHighAdminContext.Provider value={{ isAdmin, onDelete: handleAdminDelete, onSave: handleAdminSave }}><ClozeAnalysisContext.Provider value={clozeAnalysisContextValue}><section className={`stack junior-high-page junior-high-exam-page ${isFullscreen ? "fullscreen" : ""}`} data-local-selection-actions="true" ref={pageRef}>
    <div className="junior-high-exam-toolbar"><button className="junior-high-back" onClick={onBack} type="button">← 返回选择</button><div className="junior-high-exam-toolbar-title"><strong>{displayTitle}</strong></div><PaperTimer onToggle={() => setRunning(!running)} running={running} seconds={seconds} /><div className="junior-high-toolbar-actions">{displayPaper.questionType === "完形填空" ? <div className="junior-high-toolbar-analysis-menu"><button type="button" onClick={() => setClozeAnalysisMenuOpen((value) => !value)}>解析设置 ▾</button>{clozeAnalysisMenuOpen ? <div className="junior-high-toolbar-analysis-menu-popover"><button type="button" onClick={() => { setClozeAnalysisMode("show"); setClozeAnalysisMenuOpen(false); }}>显示解析</button><button type="button" onClick={() => { setClozeAnalysisMode("hide"); setClozeSubmitted(false); setClozeAnalysisMenuOpen(false); }}>隐藏解析</button></div> : null}</div> : null}<button className={`annotation-toggle ielts-exam-action ielts-fullscreen-toggle ${isFullscreen ? "active" : ""}`} onClick={() => void toggleFullscreen()} type="button">{isFullscreen ? "退出全屏" : "全屏"}</button><StudyAnnotationTools buttonClassName="annotation-toggle ielts-exam-action" sourceHref="/junior-high" sourceId={`junior-high:${displayPaper.year}-${displayPaper.region}-${displayPaper.label}`} sourceTitle={displayPaper.fileName} surfaceRef={pageRef} /></div></div>
    <QuestionNavigation answers={answers} writingAnswers={writingAnswers} paper={displayPaper} current={current} onSelect={selectQuestion} resultVisible={displayPaper.questionType !== "完形填空" || clozeAnalysisMode === "show" || clozeSubmitted} />
    <div className="junior-high-paper-content">
      {displayPaper.layout === "generic" ? <GenericPaperContent answers={answers} onAnswer={handleAnswer} onWritingA={setWritingA} onWritingB={setWritingB} paper={displayPaper} submitted={submitted} writingA={writingA} writingB={writingB} /> : displayPaper.layout === "practice" ? <PracticePaperContent answers={answers} onAnswer={handleAnswer} onWritingAnswer={handleWritingAnswer} paper={displayPaper} submitted={submitted} writingAnswers={writingAnswers} /> : displayPaper.layout === "structured" ? <StructuredPaperContent answers={answers} onAnswer={handleAnswer} onWritingAnswer={handleWritingAnswer} paper={displayPaper} submitted={submitted} writingAnswers={writingAnswers} /> : <>
      <section className="junior-high-paper-section"><h2>第一部分</h2><p className="junior-high-paper-intro">本部分共33题，共40分。在每题列出的四个选项中，选出最符合题目要求的一项。</p><h3 className="junior-high-section-subtitle">一、单项填空（每题0. 5分，共6分）</h3><p className="junior-high-paper-intro">从下面各题所给的A、B、C、D四个选项中，选择可以填入空白处的最佳选项。</p><div className="junior-high-question-stack">{beijingRange(1, 12).map((question) => <PaperQuestionCard key={question.id} onAnswer={(value) => handleAnswer(question, value)} question={question} submitted={submitted} value={answers[question.id] || ""} />)}</div></section>
      <section className="junior-high-paper-section"><h2>二、完形填空（每题1分，共8分）</h2><p className="junior-high-paper-intro">阅读下面的短文，掌握其大意，然后从短文后各题所给的A、B、C、D四个选项中，选择最佳选项。</p><PassageGroup context={displayPaper.questions.find((question) => question.number === 13)?.context ?? ""} image={displayPaper.assets?.cloze} questions={beijingRange(13, 20)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="完形填空原文" variant="cloze" /></section>
      <section className="junior-high-paper-section"><h2>三、阅读理解（每题2分，共26分）</h2><p className="junior-high-paper-intro">阅读下列短文或课程介绍，根据题目要求选择最佳选项。</p><p className="junior-high-paper-intro junior-high-paper-intro-muted">{displayPaper.readingA.instructions}</p><PassageGroup books={displayPaper.readingA.books} context={displayPaper.questions.find((question) => question.number === 21)?.context ?? ""} image={displayPaper.assets?.readingA} questions={beijingRange(21, 23)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · A" variant="readingA" /><PassageGroup context={displayPaper.questions.find((question) => question.number === 24)?.context ?? ""} image={displayPaper.assets?.readingB} questions={beijingRange(24, 26)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · B" /><PassageGroup context={displayPaper.questions.find((question) => question.number === 27)?.context ?? ""} image={displayPaper.assets?.readingC} questions={beijingRange(27, 29)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · C" /><PassageGroup context={displayPaper.questions.find((question) => question.number === 30)?.context ?? ""} image={displayPaper.assets?.readingD} questions={beijingRange(30, 33)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读理解 · D" /></section>
      <section className="junior-high-paper-section junior-high-reading-response-section"><h2>第二部分</h2><p className="junior-high-paper-intro">本部分共5题，共20分。根据题目要求，完成相应任务。</p><h3 className="junior-high-section-subtitle">四、阅读表达（第34—36题每题2分，第37题4分，共10分）</h3><p className="junior-high-paper-intro">阅读短文，根据短文内容回答问题。</p><PassageGroup context={displayPaper.questions.find((question) => question.number === 34)?.context ?? ""} image={displayPaper.assets?.readingResponse} questions={beijingRange(34, 37)} answers={answers} onAnswer={handleAnswer} submitted={submitted} title="阅读表达原文" variant="readingResponse" /></section>
      <section className="junior-high-paper-section"><h2>{displayPaper.writing.title ?? "五、文段表达（10分）"}</h2><div className="junior-high-paper-writing"><WritingTask label="A." closing={displayPaper.writing.closingA} opening={displayPaper.writing.openingA} prompt={displayPaper.writing.promptA} requirements={displayPaper.writing.requirementsA} value={writingA} onChange={setWritingA}>{displayPaper.writing.tableA?.length ? <table className="junior-high-writing-table"><tbody>{displayPaper.writing.tableA.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table> : null}</WritingTask><WritingTask label="B." closing={displayPaper.writing.closingB} opening={displayPaper.writing.openingB} prompt={displayPaper.writing.promptB} requirements={`${displayPaper.writing.contentPointsB ? `${displayPaper.writing.contentPointsB}\n` : ""}${displayPaper.writing.requirementsB}`} value={writingB} onChange={setWritingB}>{displayPaper.writing.diagram ? <img alt="写作任务图示" className="junior-high-writing-diagram" src={displayPaper.writing.diagram} /> : null}</WritingTask>{submitted ? <div className="junior-high-feedback"><span>作文：已提交</span><span className="manual">人工评分</span></div> : null}</div></section>
      </>}
    </div>
    <div className="junior-high-bottom-nav-row"><QuestionNavigation answers={answers} writingAnswers={writingAnswers} paper={displayPaper} current={current} onSelect={selectQuestion} resultVisible={displayPaper.questionType !== "完形填空" || clozeAnalysisMode === "show" || clozeSubmitted} /><button className="junior-high-bottom-submit-button" type="button" onClick={() => displayPaper.questionType === "完形填空" ? setClozeSubmitted(true) : setSubmitted(true)}>{(displayPaper.questionType === "完形填空" ? clozeSubmitted : submitted) ? "已提交" : "提交"}</button>{submitted || clozeSubmitted ? <button className="junior-high-bottom-submit-button junior-high-bottom-reset-button" type="button" onClick={resetAttempt}>重做</button> : null}</div>
  </section></ClozeAnalysisContext.Provider></JuniorHighAdminContext.Provider>;
}

export function BeijingPaperWorkbench({ onBack }: { onBack: () => void }) {
  return <JuniorHighPaperWorkbench onBack={onBack} paper={defaultPaper} />;
}
