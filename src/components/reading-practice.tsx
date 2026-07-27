"use client";

import Link from "next/link";
import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_READING_TEST,
  getReadingPart,
  getReadingQuestionNumbers,
  type ReadingChoiceQuestion,
  type ReadingDiagramKind,
  type ReadingFillQuestion,
  type ReadingPart,
  type ReadingPartId,
  type ReadingTest,
} from "@/lib/ielts/reading";

type AnswerMap = Record<number, string[]>;
type FillMap = Record<number, string>;
type HeadingAssignments = Record<number, string>;
type ReadingPracticeProps = {
  mode?: "mock" | "practice";
  test?: ReadingTest;
};

type AnnotationItem = {
  id: number;
  kind: "note" | "highlight";
  note: string;
  text: string;
};
type FavoriteAnnotationItem = {
  excerpt: string;
  href: string;
  id: string;
  savedAt: string;
  sourceTitle: string;
  title: string;
};
type FavoriteQuestionItem = {
  href: string;
  id: string;
  savedAt: string;
  sourceTitle: string;
  title: string;
};
type ReadingNavigationItem = { label: string; questionNumbers: number[] };
type ReadingReviewRow = {
  correctAnswer: string;
  firstQuestionNo: number;
  hasCorrectAnswer: boolean;
  isCorrect: boolean;
  label: string;
  partLabel: string;
  userAnswer: string;
};

const FAVORITE_ANNOTATIONS_STORAGE_KEY = "ielts-platform.favoriteAnnotations";
const FAVORITE_QUESTIONS_STORAGE_KEY = "ielts-platform.favoriteQuestions";
const CHOICE_TEXT_AS_ANSWER_KEY = new Set(["TRUE", "FALSE", "NOT GIVEN", "YES", "NO"]);

function formatReadingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatQuestionNumbers(questionNumbers: number[]) {
  if (questionNumbers.length === 1) return String(questionNumbers[0]);
  return `${questionNumbers[0]}–${questionNumbers.at(-1)}`;
}

function getPartNavigation(part: ReadingPart): ReadingNavigationItem[] {
  return part.questionBlocks
    .flatMap<ReadingNavigationItem>((block) => {
      if (block.type === "headings") {
        return block.questionNumbers.map((number) => ({
          label: String(number),
          questionNumbers: [number],
        }));
      }
      if (block.type === "fill") {
        return block.questions.map((question) => ({
          label: String(question.number),
          questionNumbers: [question.number],
        }));
      }
      return block.questions.map((question) => ({
        label: formatQuestionNumbers(question.questionNumbers),
        questionNumbers: question.questionNumbers,
      }));
    })
    .sort((a, b) => a.questionNumbers[0] - b.questionNumbers[0]);
}

function ReadingMotionDiagram({ kind }: { kind: ReadingDiagramKind }) {
  const spokes =
    kind === "curved-spokes"
      ? (
        <g className="reading-diagram-curved">
          {Array.from({ length: 6 }, (_, index) => (
            <path
              d="M50 50 C54 31, 66 23, 78 19"
              key={index}
              transform={`rotate(${index * 60} 50 50)`}
            />
          ))}
        </g>
      )
      : (
        <g className={kind === "dashed-spokes" ? "reading-diagram-dashed" : ""}>
          {Array.from({ length: 6 }, (_, index) => (
            <line
              key={index}
              x1="50"
              x2={kind === "extended-spokes" ? "88" : "82"}
              y1="50"
              y2="50"
              transform={`rotate(${index * 60} 50 50)`}
            />
          ))}
        </g>
      );

  return (
    <div className="reading-motion-diagram" aria-hidden="true">
      <svg viewBox="0 0 100 100" role="img">
        <circle cx="50" cy="50" r="32" />
        {spokes}
      </svg>
    </div>
  );
}

function normalizeAnswerValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getAnswerValues(answer: string | string[] | undefined) {
  if (!answer) return [];
  return Array.isArray(answer) ? answer : [answer];
}

function splitAnswerAlternatives(value: string) {
  return value
    .split(/\s*\/\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getComparableAnswerValues(value: string) {
  const trimmed = value.trim();
  const values = new Set([trimmed]);
  const compact = trimmed.replace(/\s+/g, "");

  if (compact) {
    values.add(compact);
  }

  if (trimmed.includes("(s)")) {
    values.add(trimmed.replace(/\(s\)/g, ""));
    values.add(trimmed.replace(/\(s\)/g, "s"));
  }

  return [...values].map(normalizeAnswerValue);
}

function answerValueMatches(userValue: string, correctValue: string) {
  const normalizedUserValue = normalizeAnswerValue(userValue);
  return getComparableAnswerValues(correctValue).includes(normalizedUserValue);
}

function getFillAnswerGroups(question: ReadingFillQuestion) {
  const values = getAnswerValues(question.answer);
  if (question.answerMode === "all") {
    return values.map((value) => splitAnswerAlternatives(value)).filter((group) => group.length > 0);
  }

  const alternatives = values.flatMap((value) => splitAnswerAlternatives(value));
  return alternatives.length > 0 ? [alternatives] : [];
}

function getFillCorrectValues(question: ReadingFillQuestion) {
  return getFillAnswerGroups(question).flat();
}

function formatFillCorrectAnswer(question: ReadingFillQuestion) {
  const groups = getFillAnswerGroups(question);
  if (groups.length === 0) return "未录入";
  if (question.answerMode === "all") {
    return `${groups.map((group) => group.join(" / ")).join(" + ")}（顺序不限，全部需要）`;
  }
  return groups[0].join(" / ");
}

function cleanRawReadingLine(value: string) {
  return value.replace(/[|]+/g, " ").replace(/\s+/g, " ").trim();
}

function isRawReadingInstructionLine(value: string) {
  return (
    /^READING\s+PASSAGE\s+\d/i.test(value) ||
    /^R\s*E\s*A\s*D\s*I\s*N\s*G$/i.test(value) ||
    /^Reading$/i.test(value) ||
    /^Test\s+\d$/i.test(value) ||
    /^You should spend about 20 minutes/i.test(value) ||
    /^should spend about 20 minutes/i.test(value) ||
    /^Reading Passage \d below\.?$/i.test(value) ||
    /^Passage\s+\d\s+(?:below|on\s+(?:the\s+)?(?:following|fo\s*llowing)\s+pages?|on\s+pages?\s+\d{1,3})/i.test(value) ||
    /^below\.[\s·]*$/i.test(value) ||
    /^on the following pages?\.?$/i.test(value) ||
    /^=== (?:PDF|OCR) PAGE \d+ ===$/i.test(value)
  );
}

function getRawReadingParagraphs(value: string, title: string) {
  const titleLine = cleanRawReadingLine(title).toLowerCase();
  const paragraphs: string[] = [];
  let current: string[] = [];
  let skippedTitle = false;

  function flush() {
    if (current.length > 0) {
      paragraphs.push(current.join(" "));
      current = [];
    }
  }

  for (const rawLine of value.split("\n")) {
    const line = cleanRawReadingLine(rawLine);

    if (!line) {
      flush();
      continue;
    }

    if (isRawReadingInstructionLine(line)) {
      continue;
    }

    if (!skippedTitle && titleLine && line.toLowerCase() === titleLine) {
      skippedTitle = true;
      continue;
    }

    if (/^[A-Z]$/.test(line) && current.length > 0) {
      flush();
    }

    current.push(line);
  }

  flush();
  return paragraphs.length > 0 ? paragraphs : [value];
}

function cleanRawQuestionLine(value: string) {
  return value.replace(/[|]+/g, " ").replace(/\s+/g, " ").trim();
}

function getRawQuestionLineKind(value: string) {
  if (/^Questions?\s+\d{1,2}/i.test(value)) return "heading";
  if (/^(?:[A-P]|8)\s+.+/.test(value)) return "option";
  if (/^\d{1,2}(?:\s|[).>])/.test(value)) return "question";
  if (
    /^(?:Choose|Complete|Do the following|Write|Which|Match|Label|Look at|The text has|Reading Passage|In boxes|TRUE|FALSE|NOT GIVEN|YES|NO)\b/i.test(
      value,
    )
  ) {
    return "instruction";
  }
  return "text";
}

function getRawQuestionLines(value: string) {
  return value
    .split("\n")
    .map(cleanRawQuestionLine)
    .filter((line) => line && !/^=== (?:PDF|OCR) PAGE \d+ ===$/i.test(line))
    .filter((line) => !/^Test\s*\d+$/i.test(line))
    .filter((line) => !/^R?\s*E?~?ADING$/i.test(line))
    .map((line) => ({
      kind: getRawQuestionLineKind(line),
      text: line,
    }));
}

type RawQuestionOption = {
  letter: string;
  text: string;
};

type RawQuestionItem = {
  number: number;
  options: RawQuestionOption[];
  text: string;
};

type RawQuestionSection = {
  heading: string;
  instructions: string[];
  mode: "choice" | "fill" | "option-bank" | "plain" | "tfng" | "ynng";
  options: RawQuestionOption[];
  questionNumbers: number[];
  questions: RawQuestionItem[];
  textLines: string[];
};

function getQuestionNumbersFromHeading(value: string) {
  const match = /^Questions?\s+(\d{1,2})(?:\s*(?:and|[-–])\s*(\d{1,2}))?/i.exec(value);
  if (!match) return [];

  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function parseRawOption(value: string): RawQuestionOption | null {
  const match = /^([A-P]|8)\s+(.+)$/.exec(value);
  if (!match) return null;

  return {
    letter: match[1] === "8" ? "B" : match[1],
    text: match[2].trim(),
  };
}

function parseRawQuestion(value: string, validQuestionNumbers: Set<number>) {
  const match = /^(\d{1,2})(?:\s|[).>])\s*(.*)$/.exec(value);
  if (!match) return null;

  const number = Number(match[1]);
  if (!validQuestionNumbers.has(number)) return null;

  return {
    number,
    text: match[2].trim(),
  };
}

function shouldHideRawInstruction(value: string) {
  return (
    /^Write your answers? in boxes/i.test(value) ||
    /^Write the appropriate letter/i.test(value) ||
    /^In boxes \d/i.test(value) ||
    /on your answer sheet\.?$/i.test(value) ||
    /^(?:TRUE|FALSE|NOT GIVEN|YES|NO)\s+if\b/i.test(value)
  );
}

function getRawQuestionMode(section: Omit<RawQuestionSection, "mode">): RawQuestionSection["mode"] {
  const text = [
    section.heading,
    ...section.instructions,
    ...section.textLines,
    ...section.questions.map((question) => question.text),
  ].join(" ");

  if (/YES\b[\s\S]*NO\b[\s\S]*NOT GIVEN/i.test(text)) return "ynng";
  if (/TRUE\b[\s\S]*FALSE\b[\s\S]*NOT GIVEN/i.test(text)) return "tfng";
  if (/Do the following statements agree/i.test(text)) {
    return /views|claims|writer thinks|opinion/i.test(text) ? "ynng" : "tfng";
  }
  if (section.options.length > 0) return "option-bank";
  if (section.questions.some((question) => question.options.length > 0)) return "choice";
  if (/Complete|NO MORE THAN|ONE WORD|summary|table|notes|sentence|diagram|axis/i.test(text)) return "fill";
  return "plain";
}

function getRawQuestionSections(text: string, questionNumbers: number[]) {
  const validQuestionNumbers = new Set(questionNumbers);
  const sections: Array<Omit<RawQuestionSection, "mode">> = [];
  let current: Omit<RawQuestionSection, "mode"> | null = null;

  function ensureSection() {
    current ??= {
      heading: "",
      instructions: [],
      options: [],
      questionNumbers: [],
      questions: [],
      textLines: [],
    };
    return current;
  }

  function pushSection() {
    if (!current) return;
    if (
      current.heading ||
      current.instructions.length ||
      current.options.length ||
      current.questions.length ||
      current.textLines.length
    ) {
      sections.push(current);
    }
    current = null;
  }

  for (const line of getRawQuestionLines(text)) {
    if (line.kind === "heading") {
      pushSection();
      current = {
        heading: line.text,
        instructions: [],
        options: [],
        questionNumbers: getQuestionNumbersFromHeading(line.text),
        questions: [],
        textLines: [],
      };
      continue;
    }

    const section = ensureSection();
    const option = line.kind === "option" ? parseRawOption(line.text) : null;

    if (option) {
      const bankLike =
        section.questions.length > 1 ||
        /Match|list of|correct person|correct response|correct heading|Which paragraph/i.test(
          [section.heading, ...section.instructions, ...section.textLines].join(" "),
        );

      if (bankLike) {
        section.options.push(option);
      } else {
        const lastQuestion = section.questions.at(-1);
        if (lastQuestion) {
          lastQuestion.options.push(option);
        } else {
          section.options.push(option);
        }
      }
      continue;
    }

    const rawQuestion = parseRawQuestion(line.text, validQuestionNumbers);
    if (rawQuestion) {
      section.questions.push({
        number: rawQuestion.number,
        options: [],
        text: rawQuestion.text,
      });
      continue;
    }

    if (line.kind === "instruction") {
      if (!shouldHideRawInstruction(line.text)) {
        section.instructions.push(line.text);
      }
      continue;
    }

    const lastQuestion = section.questions.at(-1);
    const isFillSection = /Complete|NO MORE THAN|ONE WORD|summary|table|notes|sentence|diagram|axis/i.test(
      [section.heading, ...section.instructions].join(" "),
    );

    if (lastQuestion && !isFillSection && lastQuestion.options.length === 0 && section.options.length === 0) {
      lastQuestion.text = `${lastQuestion.text} ${line.text}`.trim();
    } else {
      section.textLines.push(line.text);
    }
  }

  pushSection();

  return sections.map((section) => ({
    ...section,
    mode: getRawQuestionMode(section),
  }));
}

function getRawDragPayload(event: ReactDragEvent<HTMLElement>) {
  const raw = event.dataTransfer.getData("application/x-reading-option");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { letter: string; sourceQuestion?: number };
  } catch {
    return null;
  }
}

function setRawDragPayload(
  event: ReactDragEvent<HTMLElement>,
  payload: { letter: string; sourceQuestion?: number },
) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-reading-option", JSON.stringify(payload));
}

function RawQuestionText({
  fillAnswers,
  onAnswerChange,
  questions,
  text,
}: {
  fillAnswers: FillMap;
  onAnswerChange: (number: number, value: string) => void;
  questions: ReadingFillQuestion[];
  text: string;
}) {
  const questionNumbers = questions.map((question) => question.number);
  const sections = getRawQuestionSections(text, questionNumbers);

  function renderFillInput(number: number) {
    return (
      <span className="reading-fill-input-wrap reading-raw-inline-input" id={`reading-question-${number}`}>
        <b>{number}</b>
        <input
          aria-label={`Question ${number}`}
          autoComplete="off"
          value={fillAnswers[number] ?? ""}
          onChange={(event) => onAnswerChange(number, event.target.value)}
        />
      </span>
    );
  }

  function renderFillLine(value: string, key: string) {
    const pieces: ReactNode[] = [];
    const pattern = /\b(\d{1,2})\b\s*(?:[._·•\-–—]{2,}|…+)?/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(value))) {
      const number = Number(match[1]);
      if (!questionNumbers.includes(number)) continue;

      pieces.push(value.slice(lastIndex, match.index));
      pieces.push(renderFillInput(number));
      lastIndex = match.index + match[0].length;
    }

    pieces.push(value.slice(lastIndex));
    return <p className="reading-raw-fill-line" key={key}>{pieces}</p>;
  }

  function renderBinaryChoices(number: number, options: string[]) {
    const selected = fillAnswers[number] ?? "";
    return (
      <div className="reading-raw-binary-options">
        {options.map((option) => (
          <label className={selected === option ? "selected" : ""} key={option}>
            <input
              checked={selected === option}
              name={`reading-raw-question-${number}`}
              type="radio"
              value={option}
              onChange={() => onAnswerChange(number, option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  function renderOptionBank(options: RawQuestionOption[], sectionKey: string) {
    return (
      <div
        className="reading-raw-option-bank"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const payload = getRawDragPayload(event);
          if (payload?.sourceQuestion) {
            onAnswerChange(payload.sourceQuestion, "");
          }
        }}
      >
        <small>拖动选项到题号后的虚线处作答；把已选选项拖回这里可取消。</small>
        {options.map((option) => (
          <button
            draggable
            key={`${sectionKey}-${option.letter}`}
            type="button"
            onDragStart={(event) => setRawDragPayload(event, { letter: option.letter })}
          >
            <span>{option.letter}</span>
            {option.text}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="reading-raw-question-flow">
      {sections.map((section, sectionIndex) => {
        const sectionKey = `${section.heading || "section"}-${sectionIndex}`;
        const binaryOptions = section.mode === "ynng"
          ? ["YES", "NO", "NOT GIVEN"]
          : ["TRUE", "FALSE", "NOT GIVEN"];

        if (section.mode === "option-bank") {
          return (
            <section className="reading-raw-question-group" key={sectionKey}>
              {section.heading ? <h2>{section.heading}</h2> : null}
              {section.instructions.map((instruction) => (
                <p className="reading-raw-question-instruction" key={instruction}>{instruction}</p>
              ))}
              {section.textLines.map((line, index) => (
                <p className="reading-raw-question-copy" key={`${sectionKey}-text-${index}`}>{line}</p>
              ))}
              {(section.questions.length > 0 ? section.questions : section.questionNumbers.map((number) => ({
                number,
                options: [],
                text: `Question ${number}`,
              }))).map((question) => {
                const selectedLetter = fillAnswers[question.number] ?? "";
                const selectedOption = section.options.find((option) => option.letter === selectedLetter);

                return (
                  <article className="reading-raw-drag-question" id={`reading-question-${question.number}`} key={question.number}>
                    <div className="reading-raw-drag-prompt">
                      <b>{question.number}</b>
                      <span>{question.text}</span>
                    </div>
                    <div
                      className={`reading-raw-drop-slot ${selectedOption ? "filled" : ""}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const payload = getRawDragPayload(event);
                        if (payload?.letter) {
                          onAnswerChange(question.number, payload.letter);
                        }
                      }}
                    >
                      {selectedOption ? (
                        <button
                          draggable
                          type="button"
                          onDragStart={(event) =>
                            setRawDragPayload(event, {
                              letter: selectedOption.letter,
                              sourceQuestion: question.number,
                            })}
                        >
                          <span>{selectedOption.letter}</span>
                          {selectedOption.text}
                        </button>
                      ) : (
                        <span>拖到这里</span>
                      )}
                    </div>
                  </article>
                );
              })}
              {renderOptionBank(section.options, sectionKey)}
            </section>
          );
        }

        if (section.mode === "tfng" || section.mode === "ynng") {
          return (
            <section className="reading-raw-question-group" key={sectionKey}>
              {section.heading ? <h2>{section.heading}</h2> : null}
              {section.instructions.map((instruction) => (
                <p className="reading-raw-question-instruction" key={instruction}>{instruction}</p>
              ))}
              {section.questions.map((question) => (
                <article className="reading-raw-binary-question" id={`reading-question-${question.number}`} key={question.number}>
                  <div className="reading-question-prompt">
                    <strong>{question.number}</strong>
                    <span>{question.text}</span>
                  </div>
                  {renderBinaryChoices(question.number, binaryOptions)}
                </article>
              ))}
            </section>
          );
        }

        return (
          <section className="reading-raw-question-group" key={sectionKey}>
            {section.heading ? <h2>{section.heading}</h2> : null}
            {section.instructions.map((instruction) => (
              <p className="reading-raw-question-instruction" key={instruction}>{instruction}</p>
            ))}
            {section.textLines.map((line, index) =>
              section.mode === "fill" ? renderFillLine(line, `${sectionKey}-fill-${index}`) : (
                <p className="reading-raw-question-copy" key={`${sectionKey}-text-${index}`}>{line}</p>
              ),
            )}
            {section.questions.map((question) => (
              <article className="reading-raw-numbered-line" id={`reading-question-${question.number}`} key={question.number}>
                <b>{question.number}</b>
                <span>{question.text}</span>
                {section.mode === "choice" && question.options.length > 0 ? (
                  <div className="reading-raw-binary-options reading-raw-letter-options">
                    {question.options.map((option) => (
                      <label className={fillAnswers[question.number] === option.letter ? "selected" : ""} key={option.letter}>
                        <input
                          checked={fillAnswers[question.number] === option.letter}
                          name={`reading-raw-question-${question.number}`}
                          type="radio"
                          value={option.letter}
                          onChange={() => onAnswerChange(question.number, option.letter)}
                        />
                        <span>{option.letter}</span>
                        <strong>{option.text}</strong>
                      </label>
                    ))}
                  </div>
                ) : renderFillInput(question.number)}
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function splitUserRequiredAnswers(value: string, requiredAnswers: string[]) {
  const normalizedValue = value.trim();
  if (!normalizedValue) return [];

  const separated = normalizedValue
    .split(/\s*(?:\/|,|;|\n|\band\b)\s*/i)
    .map((item) => item.trim())
    .filter(Boolean);

  if (separated.length > 1) return separated;

  if (requiredAnswers.every((answer) => !/\s/.test(answer.trim()))) {
    return normalizedValue.split(/\s+/).map((item) => item.trim()).filter(Boolean);
  }

  return separated;
}

function isFillAnswerCorrect(userAnswer: string, question: ReadingFillQuestion) {
  const correctGroups = getFillAnswerGroups(question);
  const correctValues = correctGroups.flat();
  if (!userAnswer.trim() || correctGroups.length === 0) return false;

  if (question.answerMode === "all") {
    const userValues = splitUserRequiredAnswers(userAnswer, correctValues);
    if (userValues.length !== correctGroups.length) return false;

    const unmatchedUserValues = [...userValues];
    return correctGroups.every((group) => {
      const matchIndex = unmatchedUserValues.findIndex((userValue) =>
        group.some((correctValue) => answerValueMatches(userValue, correctValue)),
      );
      if (matchIndex === -1) return false;
      unmatchedUserValues.splice(matchIndex, 1);
      return true;
    });
  }

  return correctValues.some((correctAnswer) =>
    answerValueMatches(userAnswer, correctAnswer),
  );
}

function getChoiceOption(question: ReadingChoiceQuestion, value: string) {
  const normalized = normalizeAnswerValue(value);
  return question.options.find((option) =>
    normalizeAnswerValue(option.letter) === normalized ||
    normalizeAnswerValue(option.text) === normalized,
  );
}

function shouldDisplayChoiceText(question: ReadingChoiceQuestion) {
  return question.options.every((option) =>
    CHOICE_TEXT_AS_ANSWER_KEY.has(option.text.trim().toUpperCase()),
  );
}

function formatChoiceAnswerKey(question: ReadingChoiceQuestion, values: string[]) {
  if (values.length === 0) return "未作答";
  const useText = shouldDisplayChoiceText(question);

  return values
    .map((value) => {
      const option = getChoiceOption(question, value);
      if (!option) return value;
      return useText ? option.text : option.letter;
    })
    .join(", ");
}

function getChoiceCorrectLetters(question: ReadingChoiceQuestion) {
  return getAnswerValues(question.answer).map((value) => {
    const option = getChoiceOption(question, value);
    return option?.letter ?? value;
  });
}

function formatHeadingAnswer(
  block: Extract<ReadingPart["questionBlocks"][number], { type: "headings" }>,
  headingId: string,
) {
  return block.options.find((option) => option.id === headingId)?.text ?? headingId;
}

function compareAnswerLists(userValues: string[], correctValues: string[]) {
  if (userValues.length !== correctValues.length) return false;
  const user = userValues.map(normalizeAnswerValue).sort();
  const correct = correctValues.map(normalizeAnswerValue).sort();
  return user.every((value, index) => value === correct[index]);
}

function buildReadingReviewRows({
  choiceAnswers,
  fillAnswers,
  headingAssignments,
  parts,
}: {
  choiceAnswers: AnswerMap;
  fillAnswers: FillMap;
  headingAssignments: HeadingAssignments;
  parts: ReadingPart[];
}): ReadingReviewRow[] {
  return parts.flatMap((part) =>
    part.questionBlocks.flatMap<ReadingReviewRow>((block) => {
      if (block.type === "fill") {
        return block.questions.map((question) => {
          const userAnswer = fillAnswers[question.number]?.trim() ?? "";
          const correctValues = getFillCorrectValues(question);
          return {
            correctAnswer: formatFillCorrectAnswer(question),
            firstQuestionNo: question.number,
            hasCorrectAnswer: correctValues.length > 0,
            isCorrect: isFillAnswerCorrect(userAnswer, question),
            label: String(question.number),
            partLabel: part.label,
            userAnswer: userAnswer || "未作答",
          };
        });
      }

      if (block.type === "choice") {
        return block.questions.map((question) => {
          const key = question.questionNumbers[0];
          const userLetters = choiceAnswers[key] ?? [];
          const correctLetters = getChoiceCorrectLetters(question);
          return {
            correctAnswer: formatChoiceAnswerKey(question, getAnswerValues(question.answer)),
            firstQuestionNo: key,
            hasCorrectAnswer: correctLetters.length > 0,
            isCorrect: correctLetters.length > 0 && compareAnswerLists(userLetters, correctLetters),
            label: formatQuestionNumbers(question.questionNumbers),
            partLabel: part.label,
            userAnswer: formatChoiceAnswerKey(question, userLetters),
          };
        });
      }

      return block.questionNumbers.map((questionNo) => {
        const userHeadingId = headingAssignments[questionNo] ?? "";
        const correctHeadingId = block.answers?.[questionNo] ?? "";
        return {
          correctAnswer: correctHeadingId ? formatHeadingAnswer(block, correctHeadingId) : "未录入",
          firstQuestionNo: questionNo,
          hasCorrectAnswer: Boolean(correctHeadingId),
          isCorrect: Boolean(correctHeadingId) && userHeadingId === correctHeadingId,
          label: String(questionNo),
          partLabel: part.label,
          userAnswer: userHeadingId ? formatHeadingAnswer(block, userHeadingId) : "未作答",
        };
      });
    }),
  ).sort((a, b) => a.firstQuestionNo - b.firstQuestionNo);
}

function ReadingChoiceBlock({
  answers,
  onChange,
  question,
}: {
  answers: AnswerMap;
  onChange: (question: ReadingChoiceQuestion, letter: string) => void;
  question: ReadingChoiceQuestion;
}) {
  const questionKey = question.questionNumbers[0];
  const selected = answers[questionKey] ?? [];
  const isMultiple = (question.selectCount ?? 1) > 1;
  const numberLabel = question.questionNumbers.join("–");

  return (
    <article className="reading-choice-question" id={`reading-question-${questionKey}`}>
      <div className="reading-question-prompt">
        <strong>{numberLabel}</strong>
        <span>{question.prompt}</span>
        {isMultiple ? <small>已选 {selected.length}/{question.selectCount}</small> : null}
      </div>
      {question.diagram ? <ReadingMotionDiagram kind={question.diagram} /> : null}
      <div className="reading-choice-options">
        {question.options.map((option) => {
          const isSelected = selected.includes(option.letter);
          return (
            <label className={`reading-choice-option ${isSelected ? "selected" : ""}`} key={option.letter}>
              <input
                checked={isSelected}
                name={`reading-question-${questionKey}`}
                type={isMultiple ? "checkbox" : "radio"}
                value={option.letter}
                onChange={() => onChange(question, option.letter)}
              />
              <span className={`reading-choice-mark ${isMultiple ? "multiple" : "single"}`} aria-hidden="true" />
              <span className="reading-choice-letter">{option.letter}</span>
              <span>{option.text}</span>
            </label>
          );
        })}
      </div>
    </article>
  );
}

export function ReadingPractice({ mode = "mock", test = DEFAULT_READING_TEST }: ReadingPracticeProps) {
  const parts = test.parts;
  const firstPart = parts[0];
  const firstQuestion = getReadingQuestionNumbers(firstPart)[0];
  const [activePartId, setActivePartId] = useState<ReadingPartId>(firstPart.id);
  const [activeQuestion, setActiveQuestion] = useState(firstQuestion);
  const [choiceAnswers, setChoiceAnswers] = useState<AnswerMap>({});
  const [fillAnswers, setFillAnswers] = useState<FillMap>({});
  const [headingAssignments, setHeadingAssignments] = useState<HeadingAssignments>({});
  const [selectedHeadingId, setSelectedHeadingId] = useState<string | null>(null);
  const [splitPercent, setSplitPercent] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [selectionActionPosition, setSelectionActionPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [notePanelPosition, setNotePanelPosition] = useState({ left: 0, top: 0 });
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);
  const [seconds, setSeconds] = useState(60 * 60);
  const pageRef = useRef<HTMLElement | null>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const selectedRangeRef = useRef<Range | null>(null);
  const isResizingRef = useRef(false);
  const noticeTimerRef = useRef<number | null>(null);

  const allChoiceQuestions = useMemo(
    () => parts.flatMap((part) =>
      part.questionBlocks.flatMap((block) => block.type === "choice" ? block.questions : []),
    ),
    [parts],
  );
  const activePart = getReadingPart(activePartId, parts);
  const headingBlocks = activePart.questionBlocks.filter((block) => block.type === "headings");
  const headingById = useMemo(
    () => new Map(headingBlocks.flatMap((block) => block.options).map((heading) => [heading.id, heading])),
    [headingBlocks],
  );
  const assignedHeadingIds = new Set(Object.values(headingAssignments));
  const isUrgent = seconds <= 600;
  const isCritical = seconds <= 300;
  const reviewRows = useMemo(
    () => buildReadingReviewRows({ choiceAnswers, fillAnswers, headingAssignments, parts }),
    [choiceAnswers, fillAnswers, headingAssignments, parts],
  );
  const reviewGroups = useMemo(
    () =>
      parts.map((part) => ({
        label: part.label,
        rows: reviewRows.filter((row) => row.partLabel === part.label),
      })),
    [parts, reviewRows],
  );
  const rawAnswerBlocks = useMemo(
    () =>
      parts.flatMap((part) =>
        part.questionBlocks.flatMap((block) =>
          block.type === "fill" && block.rawAnswerText
            ? [{ label: part.label, text: block.rawAnswerText }]
            : [],
        ),
      ),
    [parts],
  );
  const correctCount = reviewRows.filter((row) => row.isCorrect).length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setNotePanelPosition({
      left: Math.max(16, window.innerWidth - 370),
      top: 132,
    });
  }, []);

  useEffect(() => {
    if (!selectedText || !selectionActionPosition) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.getSelection()?.removeAllRanges();
      selectedRangeRef.current = null;
      setSelectedText("");
      setSelectionActionPosition(null);
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [selectedText, selectionActionPosition]);

  useEffect(() => {
    if (!isNotesOpen) {
      return;
    }

    function handleOutsidePointer(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          ".notes-panel, [data-study-annotation-toggle], .selection-action-popover, .word-tooltip-floating",
        )
      ) {
        return;
      }

      setIsNotesOpen(false);
    }

    document.addEventListener("mousedown", handleOutsidePointer);
    return () => document.removeEventListener("mousedown", handleOutsidePointer);
  }, [isNotesOpen]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("reading-fullscreen-active", isFullscreen);
    document.documentElement.classList.toggle("ielts-fullscreen-active", isFullscreen);

    return () => {
      document.documentElement.classList.remove("reading-fullscreen-active");
      document.documentElement.classList.remove("ielts-fullscreen-active");
    };
  }, [isFullscreen]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const answeredNumbers = useMemo(() => {
    const answered = new Set<number>();
    Object.entries(choiceAnswers).forEach(([questionNo, values]) => {
      const number = Number(questionNo);
      const question = allChoiceQuestions.find(
        (item) => item.questionNumbers[0] === number,
      );
      if (!question) return;
      const needed = question.selectCount ?? 1;
      if (values.length >= needed) {
        question.questionNumbers.forEach((item) => answered.add(item));
      }
    });
    Object.entries(fillAnswers).forEach(([questionNo, value]) => {
      if (value.trim()) answered.add(Number(questionNo));
    });
    Object.keys(headingAssignments).forEach((questionNo) => answered.add(Number(questionNo)));
    return answered;
  }, [allChoiceQuestions, choiceAnswers, fillAnswers, headingAssignments]);

  function setPart(partId: ReadingPartId) {
    const nextPart = getReadingPart(partId, parts);
    const nextFirstQuestion = getPartNavigation(nextPart)[0].questionNumbers[0];
    setActivePartId(partId);
    setActiveQuestion(nextFirstQuestion);
    setSelectedHeadingId(null);
    window.requestAnimationFrame(() => {
      document.querySelector(".reading-passage-pane")?.scrollTo({ top: 0, behavior: "smooth" });
      document.querySelector(".reading-question-pane")?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function scrollToQuestion(questionNo: number) {
    setActiveQuestion(questionNo);
    window.requestAnimationFrame(() => {
      document.getElementById(`reading-question-${questionNo}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function updateChoice(question: ReadingChoiceQuestion, letter: string) {
    const key = question.questionNumbers[0];
    const selectCount = question.selectCount ?? 1;
    setChoiceAnswers((current) => {
      const existing = current[key] ?? [];
      if (selectCount === 1) return { ...current, [key]: [letter] };
      if (existing.includes(letter)) {
        return { ...current, [key]: existing.filter((item) => item !== letter) };
      }
      if (existing.length >= selectCount) return current;
      return { ...current, [key]: [...existing, letter] };
    });
  }

  function assignHeading(questionNo: number, headingId: string) {
    setHeadingAssignments((current) => {
      const next = { ...current };
      Object.entries(next).forEach(([assignedQuestion, assignedHeading]) => {
        if (assignedHeading === headingId) delete next[Number(assignedQuestion)];
      });
      next[questionNo] = headingId;
      return next;
    });
    setSelectedHeadingId(null);
  }

  function removeHeading(headingId: string) {
    setHeadingAssignments((current) => {
      const next = { ...current };
      Object.entries(next).forEach(([questionNo, assignedHeading]) => {
        if (assignedHeading === headingId) delete next[Number(questionNo)];
      });
      return next;
    });
    setSelectedHeadingId(null);
  }

  function getDraggedHeading(event: ReactDragEvent<HTMLElement>) {
    return event.dataTransfer.getData("application/x-reading-heading");
  }

  function startHeadingDrag(event: ReactDragEvent<HTMLElement>, headingId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-reading-heading", headingId);
    event.dataTransfer.setData("text/plain", headingId);
  }

  function dropHeadingInSlot(event: ReactDragEvent<HTMLDivElement>, questionNo: number) {
    event.preventDefault();
    const headingId = getDraggedHeading(event) || event.dataTransfer.getData("text/plain");
    if (headingId) assignHeading(questionNo, headingId);
  }

  function dropHeadingInPool(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    const headingId = getDraggedHeading(event) || event.dataTransfer.getData("text/plain");
    if (headingId) removeHeading(headingId);
  }

  function updateSplitFromPointer(clientX: number) {
    const split = splitRef.current;
    if (!split) return;
    const bounds = split.getBoundingClientRect();
    const nextPercent = ((clientX - bounds.left) / bounds.width) * 100;
    setSplitPercent(Math.min(68, Math.max(32, nextPercent)));
  }

  function startSplitResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    isResizingRef.current = true;
    setIsResizing(true);
    updateSplitFromPointer(event.clientX);
  }

  function moveSplitResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (isResizingRef.current) updateSplitFromPointer(event.clientX);
  }

  function stopSplitResize(event: ReactPointerEvent<HTMLDivElement>) {
    isResizingRef.current = false;
    setIsResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function resizeSplitWithKeyboard(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setSplitPercent((current) =>
      Math.min(68, Math.max(32, current + (event.key === "ArrowLeft" ? -2 : 2))),
    );
  }

  function getCurrentReadingHref() {
    return mode === "mock" ? `/reading/mock/${test.id}` : `/reading/practice/${test.id}`;
  }

  function getPartSlug(partLabel: string) {
    return partLabel.toLowerCase().replace(/\s+/g, "");
  }

  function readFavoriteQuestions() {
    try {
      const rawValue = window.localStorage.getItem(FAVORITE_QUESTIONS_STORAGE_KEY);
      return rawValue ? (JSON.parse(rawValue) as FavoriteQuestionItem[]) : [];
    } catch {
      return [];
    }
  }

  function writeFavoriteQuestions(items: FavoriteQuestionItem[]) {
    const sortedItems = [...items].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );

    window.localStorage.setItem(FAVORITE_QUESTIONS_STORAGE_KEY, JSON.stringify(sortedItems));
  }

  function formatFavoriteQuestionTitle(row: ReadingReviewRow) {
    return `reading ${test.id}-${getPartSlug(row.partLabel)}-question${row.label}`;
  }

  function syncWrongReadingQuestionFavorites(rows: ReadingReviewRow[]) {
    const currentFavorites = readFavoriteQuestions();
    const existingIds = new Set(currentFavorites.map((item) => item.id));
    const now = new Date().toISOString();
    const nextFavorites = [...currentFavorites];

    rows.forEach((row) => {
      if (!row.hasCorrectAnswer || row.isCorrect) {
        return;
      }

      const id = `reading:${test.id}:${getPartSlug(row.partLabel)}:question-${row.label}`;

      if (existingIds.has(id)) {
        return;
      }

      nextFavorites.push({
        href: `${getCurrentReadingHref()}#reading-question-${row.firstQuestionNo}`,
        id,
        savedAt: now,
        sourceTitle: `reading ${test.bookTitle} Test ${test.testNo} ${row.partLabel}`,
        title: formatFavoriteQuestionTitle(row),
      });
      existingIds.add(id);
    });

    writeFavoriteQuestions(nextFavorites);
  }

  function readFavoriteAnnotations() {
    try {
      const rawValue = window.localStorage.getItem(FAVORITE_ANNOTATIONS_STORAGE_KEY);
      return rawValue ? (JSON.parse(rawValue) as FavoriteAnnotationItem[]) : [];
    } catch {
      return [];
    }
  }

  function writeFavoriteAnnotations(items: FavoriteAnnotationItem[]) {
    const sortedItems = [...items].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );
    window.localStorage.setItem(FAVORITE_ANNOTATIONS_STORAGE_KEY, JSON.stringify(sortedItems));
  }

  function removeFavoriteAnnotation(itemId: number) {
    const id = `reading:${test.id}:annotation:${itemId}`;
    writeFavoriteAnnotations(readFavoriteAnnotations().filter((item) => item.id !== id));
  }

  function removeFavoriteAnnotations(items: AnnotationItem[]) {
    const ids = new Set(items.map((item) => `reading:${test.id}:annotation:${item.id}`));
    writeFavoriteAnnotations(readFavoriteAnnotations().filter((item) => !ids.has(item.id)));
  }

  function saveFavoriteAnnotation(item: AnnotationItem) {
    if (item.kind !== "note") {
      return;
    }

    const noteText = item.note.trim();
    const sourceText = item.text.trim();

    if (!noteText || !sourceText) {
      removeFavoriteAnnotation(item.id);
      return;
    }

    const currentFavorites = readFavoriteAnnotations();
    const id = `reading:${test.id}:annotation:${item.id}`;
    const nextItem: FavoriteAnnotationItem = {
      excerpt: noteText,
      href: getCurrentReadingHref(),
      id,
      savedAt: new Date(item.id).toISOString(),
      sourceTitle: `reading ${test.bookTitle} Test ${test.testNo} ${activePart.label}`,
      title: sourceText,
    };

    writeFavoriteAnnotations([nextItem, ...currentFavorites.filter((favorite) => favorite.id !== id)]);
  }

  function handleReadingSelection(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, .notes-panel, .selection-action-popover, .reading-footer-actions")) {
      return;
    }

    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!selection || selection.rangeCount === 0 || !/[A-Za-z]/.test(text)) {
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    const root = pageRef.current;
    if (root && !root.contains(range.commonAncestorContainer)) {
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return;
    }

    selectedRangeRef.current = range;
    setSelectedText(text);
    setSelectionActionPosition({
      left: Math.min(window.innerWidth - 180, Math.max(16, rect.left + rect.width / 2 - 90)),
      top: Math.min(window.innerHeight - 72, rect.bottom + 10),
    });
  }

  function addAnnotation(kind: AnnotationItem["kind"]) {
    if (!selectedText) {
      return;
    }

    if (kind === "highlight") {
      const selectedRange = selectedRangeRef.current;
      if (selectedRange && !selectedRange.collapsed) {
        const marker = document.createElement("mark");
        marker.className = "inline-user-highlight";

        try {
          selectedRange.surroundContents(marker);
        } catch {
          const selectedContents = selectedRange.extractContents();
          marker.appendChild(selectedContents);
          selectedRange.insertNode(marker);
        }
      }

      window.getSelection()?.removeAllRanges();
      selectedRangeRef.current = null;
      setSelectedText("");
      setSelectionActionPosition(null);
      return;
    }

    setAnnotations((current) => [
      {
        id: Date.now(),
        kind,
        note: "",
        text: selectedText,
      },
      ...current,
    ]);
    setSelectedText("");
    setSelectionActionPosition(null);
    selectedRangeRef.current = null;
    setIsNotesOpen(true);
  }

  function clearAllInlineHighlights() {
    const root = pageRef.current ?? document;
    root.querySelectorAll("mark.inline-user-highlight").forEach((highlight) => {
      const parent = highlight.parentNode;
      if (!parent) {
        return;
      }

      while (highlight.firstChild) {
        parent.insertBefore(highlight.firstChild, highlight);
      }

      parent.removeChild(highlight);
      parent.normalize();
    });
  }

  function beginNotesDrag(event: ReactMouseEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    setIsDraggingNotes(true);
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = notePanelPosition.left;
    const startTop = notePanelPosition.top;

    function handleMouseMove(moveEvent: MouseEvent) {
      setNotePanelPosition({
        left: Math.max(12, startLeft + moveEvent.clientX - startX),
        top: Math.max(88, startTop + moveEvent.clientY - startY),
      });
    }

    function handleMouseUp() {
      setIsDraggingNotes(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  async function exitReadingFullscreen() {
    setIsFullscreen(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // The fixed full-screen layout still exits through React state.
      }
    }
  }

  async function toggleReadingFullscreen() {
    if (isFullscreen) {
      await exitReadingFullscreen();
      return;
    }

    setIsFullscreen(true);
    try {
      await pageRef.current?.requestFullscreen?.();
    } catch {
      // Some browsers block the API; the CSS full-screen layout still applies.
    }
  }

  function submitAnswers() {
    syncWrongReadingQuestionFavorites(reviewRows);
    setIsSubmitted(true);
    if (isFullscreen) {
      void exitReadingFullscreen();
    }
    setSaveNotice(true);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setSaveNotice(false), 2600);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  return (
    <section
      className={`stack reading-practice-page reading-exam-page ${isFullscreen ? "fullscreen" : ""}`}
      ref={pageRef}
      onMouseUp={handleReadingSelection}
    >
      <div className={`reading-workspace-toolbar ${mode}`}>
        <Link href="/reading">← 返回</Link>
        {mode === "practice" ? (
          <div
            aria-label="雅思阅读倒计时"
            className={`bbc-reading-timer ielts-practice-center-timer ${isUrgent ? "urgent" : ""} ${
              isCritical ? "critical" : ""
            }`}
            role="timer"
          >
            <span>{formatReadingTime(seconds)}</span>
          </div>
        ) : (
          <div className="reading-workspace-mode">
            <span>MOCK TEST</span>
            <strong>完整模考</strong>
          </div>
        )}
        <div className="reading-toolbar-actions">
          {mode === "mock" ? (
            <div
              className={`ielts-exam-timer reading-timer ${isUrgent ? "urgent" : ""} ${isCritical ? "critical" : ""}`}
              aria-label="雅思阅读倒计时"
              role="timer"
            >
              <strong>{formatReadingTime(seconds)}</strong>
            </div>
          ) : null}
          <button
            className={`annotation-toggle ielts-exam-action ielts-fullscreen-toggle reading-fullscreen-toggle ${
              isFullscreen ? "active" : ""
            }`}
            type="button"
            onClick={toggleReadingFullscreen}
          >
            {isFullscreen ? "退出全屏" : "全屏"}
          </button>
          <button
            className={`annotation-toggle ielts-exam-action ${isNotesOpen ? "active" : ""}`}
            data-study-annotation-toggle
            type="button"
            onClick={() => setIsNotesOpen((value) => !value)}
          >
            批注
          </button>
        </div>
      </div>

      {selectedText && selectionActionPosition ? (
        <div
          className="selection-action-popover global-selection-popover"
          style={{
            left: selectionActionPosition.left,
            top: selectionActionPosition.top,
          }}
        >
          <span>{selectedText.slice(0, 26)}</span>
          <button type="button" onClick={() => addAnnotation("note")}>Note</button>
          <button type="button" onClick={() => addAnnotation("highlight")}>Highlight</button>
        </div>
      ) : null}

      <div className="reading-exam-shell">
        <header className="reading-part-instruction">
          <strong>{activePart.label}</strong>
          <span>{activePart.intro}</span>
        </header>

        <div
          className={`reading-exam-split ${isResizing ? "resizing" : ""}`}
          ref={splitRef}
          style={{ "--reading-passage-width": `${splitPercent}%` } as CSSProperties}
        >
          <article className="reading-passage-pane">
            <h1>{activePart.title}</h1>
            <div className={activePart.sections.some((section) => section.headingQuestionNumber) ? "reading-heading-sections" : "reading-passage-copy"}>
              {activePart.sections.map((section) => {
                const questionNo = section.headingQuestionNumber;
                if (questionNo) {
                  const assignedId = headingAssignments[questionNo];
                  const assignedHeading = assignedId ? headingById.get(assignedId) : null;
                  return (
                    <section className="reading-heading-section" key={section.id}>
                      <div
                        className={`reading-heading-slot ${assignedHeading ? "filled" : ""} ${selectedHeadingId ? "ready" : ""}`}
                        id={`reading-question-${questionNo}`}
                        role="button"
                        tabIndex={0}
                        aria-label={assignedHeading ? `Question ${questionNo} 已选择 ${assignedHeading.text}` : `Question ${questionNo} 标题空位`}
                        onClick={() => {
                          if (selectedHeadingId) assignHeading(questionNo, selectedHeadingId);
                          else if (assignedId) removeHeading(assignedId);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          if (selectedHeadingId) assignHeading(questionNo, selectedHeadingId);
                          else if (assignedId) removeHeading(assignedId);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => dropHeadingInSlot(event, questionNo)}
                      >
                        <span>{questionNo}</span>
                        {assignedHeading ? (
                          <button
                            draggable
                            type="button"
                            title="拖回右侧标题列表可删除"
                            onDragStart={(event) => startHeadingDrag(event, assignedHeading.id)}
                          >
                            {assignedHeading.text}
                          </button>
                        ) : (
                          <small>{selectedHeadingId ? "点击放置所选标题" : "拖入标题"}</small>
                        )}
                      </div>
                      {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    </section>
                  );
                }

                return (
                  <section className="reading-passage-section" key={section.id}>
                    {section.paragraphs.map((paragraph) =>
                      section.format === "pre" ? (
                        getRawReadingParagraphs(paragraph, activePart.title).map((rawParagraph, index) => (
                          <p key={`${section.id}-${index}`}>{rawParagraph}</p>
                        ))
                      ) : (
                        <p key={paragraph}>{paragraph}</p>
                      ),
                    )}
                  </section>
                );
              })}
            </div>
          </article>

          <div
            className="reading-split-handle"
            role="separator"
            aria-label="调整原文与题目宽度"
            aria-orientation="vertical"
            aria-valuemin={32}
            aria-valuemax={68}
            aria-valuenow={Math.round(splitPercent)}
            tabIndex={0}
            onDoubleClick={() => setSplitPercent(50)}
            onKeyDown={resizeSplitWithKeyboard}
            onPointerCancel={stopSplitResize}
            onPointerDown={startSplitResize}
            onPointerMove={moveSplitResize}
            onPointerUp={stopSplitResize}
          >
            ↔
          </div>

          <aside className="reading-question-pane">
            {activePart.questionBlocks.map((block) => {
              if (block.type === "headings") {
                const availableHeadings = block.options.filter(
                  (heading) => !assignedHeadingIds.has(heading.id),
                );
                return (
                  <section className="reading-question-section reading-heading-question" key={block.id}>
                    <h2>Questions {formatQuestionNumbers(block.questionNumbers)}</h2>
                    <p>{block.instruction}</p>
                    <h3>{block.title}</h3>
                    <div
                      className={`reading-heading-pool ${selectedHeadingId ? "has-selection" : ""}`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={dropHeadingInPool}
                    >
                      {availableHeadings.length ? availableHeadings.map((heading) => (
                        <button
                          className={selectedHeadingId === heading.id ? "selected" : ""}
                          draggable
                          key={heading.id}
                          type="button"
                          onClick={() => setSelectedHeadingId((current) => current === heading.id ? null : heading.id)}
                          onDragStart={(event) => startHeadingDrag(event, heading.id)}
                        >
                          <span aria-hidden="true">⋮⋮</span>
                          {heading.text}
                        </button>
                      )) : <small>所有标题都已放入左侧。拖回此区域即可删除。</small>}
                    </div>
                  </section>
                );
              }

              if (block.type === "choice") {
                const questionNumbers = block.questions.flatMap((question) => question.questionNumbers);
                return (
                  <section className="reading-question-section" key={block.id}>
                    <h2>Questions {formatQuestionNumbers(questionNumbers)}</h2>
                    <p>{block.instruction}</p>
                    <div className="reading-choice-list">
                      {block.questions.map((question) => (
                        <ReadingChoiceBlock
                          answers={choiceAnswers}
                          key={question.questionNumbers.join("-")}
                          question={question}
                          onChange={updateChoice}
                        />
                      ))}
                    </div>
                  </section>
                );
              }

              const questionNumbers = block.questions.map((question) => question.number);
              return (
                <section className="reading-question-section reading-fill-section" key={block.id}>
                  {block.rawText ? (
                    <RawQuestionText
                      fillAnswers={fillAnswers}
                      onAnswerChange={(number, value) => setFillAnswers((current) => ({
                        ...current,
                        [number]: value,
                      }))}
                      questions={block.questions}
                      text={block.rawText}
                    />
                  ) : (
                    <>
                      <h2>Questions {formatQuestionNumbers(questionNumbers)}</h2>
                      <p>{block.instruction}</p>
                      <h3>{block.title}</h3>
                    </>
                  )}
                  {block.wordBank ? (
                    <div className="reading-word-bank" aria-label="word bank">
                      {block.wordBank.map((word) => (
                        <span key={word}>{word}</span>
                      ))}
                    </div>
                  ) : null}
                  {block.rawText ? null : (
                    <div className="reading-fill-list">
                      {block.questions.map((question) => (
                        <label id={`reading-question-${question.number}`} key={question.number}>
                          <span>{question.before}</span>
                          <span className="reading-fill-input-wrap">
                            <b>{question.number}</b>
                            <input
                              aria-label={`Question ${question.number}`}
                              autoComplete="off"
                              value={fillAnswers[question.number] ?? ""}
                              onChange={(event) => setFillAnswers((current) => ({
                                ...current,
                                [question.number]: event.target.value,
                              }))}
                            />
                          </span>
                          {question.after ? <span>{question.after}</span> : null}
                        </label>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </aside>
        </div>

        {saveNotice ? (
          <div className="reading-save-notice" role="status">
            已提交当前作答，答对 {correctCount}/{reviewRows.length} 题。
          </div>
        ) : null}

        <footer className="reading-exam-footer">
          <div
            className="reading-part-tabs"
            style={{ "--reading-part-count": parts.length } as CSSProperties}
          >
            {parts.map((part) => {
              const partQuestionNumbers = getReadingQuestionNumbers(part);
              const count = partQuestionNumbers.filter((number) => answeredNumbers.has(number)).length;
              const partNavigation = getPartNavigation(part);
              const isActivePart = part.id === activePartId;
              return (
                <section
                  className={`reading-part-panel ${isActivePart ? "active" : ""}`}
                  key={part.id}
                >
                  <button
                    className="reading-part-tab"
                    type="button"
                    onClick={() => setPart(part.id)}
                  >
                    <strong>{part.label}</strong>
                    {isActivePart ? null : <span>{count} of {partQuestionNumbers.length}</span>}
                  </button>
                  {isActivePart ? (
                    <nav className="reading-question-navigation" aria-label={`${part.label} 题号导航`}>
                      {partNavigation.map((item) => {
                        const isActive = item.questionNumbers.includes(activeQuestion);
                        const isAnswered = item.questionNumbers.every((number) => answeredNumbers.has(number));
                        return (
                          <button
                            className={`${isActive ? "active" : ""} ${isAnswered ? "answered" : ""}`}
                            key={item.label}
                            type="button"
                            onClick={() => scrollToQuestion(item.questionNumbers[0])}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </nav>
                  ) : null}
                </section>
              );
            })}
          </div>

          <div className="reading-footer-actions">
            <button className="complete" type="button" aria-label="提交作答" title="提交作答" onClick={submitAnswers}>✓</button>
          </div>
        </footer>
      </div>

      {isNotesOpen ? (
        <aside
          className={`notes-panel draggable-notes-panel ${isDraggingNotes ? "dragging" : ""}`}
          style={{ left: notePanelPosition.left, top: notePanelPosition.top }}
        >
          <div className="notes-panel-head" onMouseDown={beginNotesDrag}>
            <strong>Notes</strong>
            <div className="notes-panel-actions">
              <button
                className="clear-inline-highlights"
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={clearAllInlineHighlights}
              >
                撤销全部高亮
              </button>
              <button
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => setIsNotesOpen(false)}
              >
                ×
              </button>
            </div>
          </div>
          {annotations.length === 0 ? (
            <div className="notes-empty">
              <strong>Your private notes will show here</strong>
              <span>Select text in the passage or questions to highlight or create a note.</span>
            </div>
          ) : (
            <div className="notes-list">
              <button
                className="delete-all-notes"
                type="button"
                onClick={() => {
                  removeFavoriteAnnotations(annotations);
                  setAnnotations([]);
                }}
              >
                全部删除 note
              </button>
              {annotations.map((item) => (
                <article className={`note-card ${item.kind}`} key={item.id}>
                  <div>
                    <span>{item.kind === "note" ? "Note" : "Highlight"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        removeFavoriteAnnotation(item.id);
                        setAnnotations((current) => current.filter((note) => note.id !== item.id));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <strong>{item.text}</strong>
                  {item.kind === "note" ? (
                    <textarea
                      placeholder="Start typing your note"
                      value={item.note}
                      onChange={(event) => {
                        const nextItem = { ...item, note: event.target.value };

                        setAnnotations((current) =>
                          current.map((note) => (note.id === item.id ? nextItem : note)),
                        );
                        saveFavoriteAnnotation(nextItem);
                      }}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </aside>
      ) : null}

      {isSubmitted ? (
        <section className="reading-review-panel" ref={reviewRef} aria-label="阅读答案核对">
          <div className="reading-review-head">
            <div>
              <span>Answer Review</span>
              <h2>提交答案核对</h2>
            </div>
            <strong>{correctCount}/{reviewRows.length}</strong>
          </div>

          <div className="reading-review-groups" aria-label="1到40题答案核对">
            {reviewGroups.map((group) => (
              <section className="reading-review-group" key={group.label}>
                <h3>{group.label}</h3>
                <div className="reading-review-table" role="table" aria-label={`${group.label} 答案核对`}>
                  <div className="reading-review-row header" role="row">
                    <span role="columnheader">题号</span>
                    <span role="columnheader">你的答案</span>
                    <span role="columnheader">正确答案</span>
                    <span role="columnheader">结果</span>
                  </div>
                  {group.rows.map((row) => (
                    <div
                      className={`reading-review-row ${row.isCorrect ? "correct" : "wrong"}`}
                      key={`${row.partLabel}-${row.label}`}
                      role="row"
                    >
                      <span className="reading-review-question-label" role="cell">
                        {row.partLabel}-{row.label}
                      </span>
                      <span role="cell">{row.userAnswer}</span>
                      <span role="cell">{row.correctAnswer}</span>
                      <span className="reading-review-result" role="cell" aria-label={row.isCorrect ? "正确" : "错误"}>
                        {row.isCorrect ? "✅" : "❌"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}

      {isSubmitted && rawAnswerBlocks.length > 0 ? (
        <section className="reading-raw-answer-panel" aria-label="阅读原始答案参照">
          <div className="reading-review-head">
            <div>
              <span>Answer Key</span>
              <h2>原始答案参照</h2>
            </div>
          </div>

          <div className="reading-raw-answer-grid">
            {rawAnswerBlocks.map((block) => (
              <article key={block.label}>
                <h3>{block.label}</h3>
                <pre>{block.text}</pre>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
