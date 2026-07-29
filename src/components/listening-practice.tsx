"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AudioPlayer,
  AudioSettingsMenus,
  DEFAULT_AUDIO_PLAYER_SETTINGS,
  type AudioPlayerSettings,
} from "@/components/audio-player";
import { ContentShareButton } from "@/components/content-share-button";
import type { ListeningSectionDetail } from "@/lib/ielts/listening";
import {
  getStudySelectionActionPosition,
  type StudySelectionActionPosition,
} from "@/lib/study-selection";
import { cleanPartOfSpeech, cleanVocabularyDefinition } from "@/lib/vocabulary/display";
import type { LocalVocabularyHint } from "@/lib/vocabulary/local-vocabulary";

type ListeningPracticeProps = {
  initialSubmitted?: boolean;
  initialMode?: ListeningMode;
  section: ListeningSectionDetail;
  vocabularyHints?: Record<string, LocalVocabularyHint>;
};

type ListeningMode = "mock" | "practice";
type ListeningQuestion = ListeningSectionDetail["questions"][number];
type ListeningSentence = ListeningSectionDetail["transcriptSentences"][number];
type AnswerMap = Record<string, string>;
type AnnotationItem = {
  id: number;
  kind: "note" | "highlight";
  text: string;
  note: string;
};
type FavoriteSentenceItem = {
  audioUrl?: string | null;
  bookCode: string;
  chineseText: string;
  englishText: string;
  href?: string;
  id: string;
  savedAt: string;
  sectionId: string;
  sectionTitle: string;
  sentenceNo: number;
  testNo: number;
};
type FavoriteQuestionItem = {
  href: string;
  id: string;
  savedAt: string;
  sourceTitle: string;
  title: string;
};
type FavoriteAnnotationItem = {
  excerpt: string;
  href: string;
  id: string;
  savedAt: string;
  sourceTitle: string;
  title: string;
};
type FavoriteWordItem = {
  definitionCn: string;
  etymologySource?: string;
  formation?: string;
  id: string;
  level?: string;
  phonetic: string;
  partOfSpeech: string;
  root?: string;
  savedAt: string;
  word: string;
};
type WordHint = {
  definitionCn: string;
  etymologySource?: string;
  formation?: string;
  level?: string;
  phonetic: string;
  partOfSpeech: string;
  root?: string;
  word?: string;
};
type ActiveWordTooltip = {
  hint: WordHint;
  left: number;
  placement: "above" | "below";
  top: number;
  width: number;
  word: string;
};
type DictationTarget = {
  normalizedWord: string;
  token: string;
  tokenIndex: number;
};
type SentenceOrderAnswer = {
  token: string;
  tokenIndex: number;
};

const FAVORITE_SENTENCES_STORAGE_KEY = "ielts-platform.favoriteSentences";
const FAVORITE_ANNOTATIONS_STORAGE_KEY = "ielts-platform.favoriteAnnotations";
const FAVORITE_QUESTIONS_STORAGE_KEY = "ielts-platform.favoriteQuestions";
const FAVORITE_WORDS_STORAGE_KEY = "ielts-platform.favoriteWords";
const LISTENING_REVIEW_ANSWERS_STORAGE_PREFIX = "ielts-platform.listeningReviewAnswers";
const VOCABULARY_HINTS: Record<string, WordHint> = {
  climate: { definitionCn: "气候", partOfSpeech: "n.", phonetic: "/ˈklaɪmət/" },
  environment: { definitionCn: "环境", partOfSpeech: "n.", phonetic: "/ɪnˈvaɪrənmənt/" },
  guided: { definitionCn: "有导游带领的", partOfSpeech: "adj.", phonetic: "/ˈɡaɪdɪd/" },
  historical: { definitionCn: "历史的；有关历史的", partOfSpeech: "adj.", phonetic: "/hɪˈstɒrɪkəl/" },
  interest: { definitionCn: "兴趣；吸引力", partOfSpeech: "n.", phonetic: "/ˈɪntrəst/" },
  landscape: { definitionCn: "景观；风景", partOfSpeech: "n.", phonetic: "/ˈlændskeɪp/" },
  museum: { definitionCn: "博物馆", partOfSpeech: "n.", phonetic: "/mjuˈziːəm/" },
  reserve: { definitionCn: "预订；保留", partOfSpeech: "v.", phonetic: "/rɪˈzɜːv/" },
  shopping: { definitionCn: "购物", partOfSpeech: "n.", phonetic: "/ˈʃɒpɪŋ/" },
  vegetation: { definitionCn: "植被", partOfSpeech: "n.", phonetic: "/ˌvedʒəˈteɪʃən/" },
};

function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?'"“”‘’()\[\]\s-]/g, "");
}

const IELTS_LISTENING_PARTS = [1, 2, 3, 4];
const QUESTIONS_PER_PART = 10;

function getQuestionRangeForPart(partNo: number) {
  return Array.from({ length: QUESTIONS_PER_PART }, (_, index) => index + 1);
}

function getAbsoluteQuestionNo(partNo: number, localQuestionNo: number) {
  return (partNo - 1) * QUESTIONS_PER_PART + localQuestionNo;
}

function formatBookCode(bookCode: string) {
  const cambridgeMatch = bookCode.match(/^cambridge-(\d+)$/);
  if (cambridgeMatch) {
    return `CI${cambridgeMatch[1]}`;
  }

  return bookCode.toUpperCase();
}

function formatListeningSectionTitle(section: ListeningSectionDetail) {
  return `${formatBookCode(section.bookCode)}-Test${section.testNo}-Section${section.sectionNo}`;
}

function getListeningCountdownSeconds(section: ListeningSectionDetail) {
  return section.timeLimitSeconds ?? 30 * 60;
}

function formatExamCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function MouseClickIcon() {
  return (
    <svg aria-hidden="true" className="bbc-reading-timer-icon" viewBox="0 0 24 24">
      <path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v6a5.5 5.5 0 0 0 11 0V9A5.5 5.5 0 0 0 12 3.5Z" />
      <path d="M12 3.5v7.25" />
      <path d="M9.25 15.25h5.5" />
    </svg>
  );
}

function formatFavoriteBookCode(bookCode: string) {
  const cambridgeMatch = bookCode.match(/^cambridge-(\d+)$/i);

  if (cambridgeMatch) {
    return `ci${cambridgeMatch[1]}`;
  }

  return bookCode.toLowerCase();
}

function getLocalQuestionNo(section: ListeningSectionDetail, question: ListeningQuestion) {
  const firstQuestionNo = (section.sectionNo - 1) * QUESTIONS_PER_PART + 1;
  const lastQuestionNo = section.sectionNo * QUESTIONS_PER_PART;

  if (question.questionNo >= firstQuestionNo && question.questionNo <= lastQuestionNo) {
    return question.questionNo - firstQuestionNo + 1;
  }

  return question.questionNo;
}

function formatFavoriteQuestionTitle(section: ListeningSectionDetail, question: ListeningQuestion) {
  return `listening ${formatFavoriteBookCode(section.bookCode)}-test${section.testNo}-part${
    section.sectionNo
  }-question${getLocalQuestionNo(section, question)}`;
}

function getReviewAnswersStorageKey(sectionId: string) {
  return `${LISTENING_REVIEW_ANSWERS_STORAGE_PREFIX}.${sectionId}`;
}

function getQuestionForPart(
  questions: ListeningSectionDetail["questions"],
  sectionNo: number,
  partNo: number,
  localQuestionNo: number,
) {
  if (sectionNo === partNo) {
    return (
      questions.find((question) => question.questionNo === localQuestionNo) ??
      questions.find((question) => question.questionNo === getAbsoluteQuestionNo(partNo, localQuestionNo))
    );
  }

  return undefined;
}

function isChoiceQuestion(questionType: string) {
  return questionType === "single_choice" || questionType === "multiple_choice";
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

function readReviewAnswers(sectionId: string): AnswerMap {
  try {
    const rawValue = window.localStorage.getItem(getReviewAnswersStorageKey(sectionId));
    return rawValue ? (JSON.parse(rawValue) as AnswerMap) : {};
  } catch {
    return {};
  }
}

function writeReviewAnswers(sectionId: string, answers: AnswerMap) {
  window.localStorage.setItem(getReviewAnswersStorageKey(sectionId), JSON.stringify(answers));
}

function syncWrongQuestionFavorites(section: ListeningSectionDetail, answers: AnswerMap) {
  const currentFavorites = readFavoriteQuestions();
  const existingIds = new Set(currentFavorites.map((item) => item.id));
  const now = new Date().toISOString();
  const nextFavorites = [...currentFavorites];

  for (const question of section.questions) {
    const userAnswer = normalizeAnswer(answers[question.id] ?? "");
    const acceptedAnswers = question.answers.map(normalizeAnswer);

    if (acceptedAnswers.includes(userAnswer)) {
      continue;
    }

    const id = `listening:${section.id}:${question.id}`;

    if (existingIds.has(id)) {
      continue;
    }

    nextFavorites.push({
      href: `/listening/${section.id}?mode=practice&review=1#question-${question.questionNo}`,
      id,
      savedAt: now,
      sourceTitle: "listening",
      title: formatFavoriteQuestionTitle(section, question),
    });
    existingIds.add(id);
  }

  writeFavoriteQuestions(nextFavorites);
}

function parseChoicePrompt(promptText: string | null) {
  const lines = (promptText ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const options: { letter: string; text: string }[] = [];
  const stemLines: string[] = [];

  for (const line of lines) {
    const optionMatch = line.match(/^([A-Z])[\.)]\s+(.+)$/);
    if (optionMatch) {
      options.push({ letter: optionMatch[1], text: optionMatch[2] });
    } else {
      stemLines.push(line);
    }
  }

  return {
    stem: stemLines.join("\n"),
    options,
  };
}

function isAcceptedAnswer(answer: string, acceptedAnswers: string[]) {
  const normalizedAnswer = normalizeAnswer(answer);
  return acceptedAnswers.map(normalizeAnswer).includes(normalizedAnswer);
}

function normalizeWord(value: string) {
  return value.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
}

function getWordHint(word: string, vocabularyHints: Record<string, WordHint> = {}): WordHint {
  const normalizedWord = normalizeWord(word);
  return (
    vocabularyHints[normalizedWord] ??
    VOCABULARY_HINTS[normalizedWord] ?? {
      definitionCn: "释义待接入词库",
      partOfSpeech: "词性待补充",
      phonetic: "音标待补充",
    }
  );
}

function splitEnglishTokens(text: string) {
  return text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)?|[^A-Za-z]+/g) ?? [text];
}

function isWordToken(token: string) {
  return /^[A-Za-z]/.test(token);
}

function getVocabularyLevelScore(level?: string) {
  const normalizedLevel = level?.trim();

  if (!normalizedLevel) {
    return Number.MAX_SAFE_INTEGER;
  }

  const levelOrder: Record<string, number> = {
    初中: 1,
    高中: 2,
    四级: 3,
    六级: 4,
    考研: 5,
    托雅: 6,
    雅思: 6,
    托福: 6,
    专四: 7,
    专八: 8,
  };

  for (const [label, score] of Object.entries(levelOrder)) {
    if (normalizedLevel.includes(label)) {
      return score;
    }
  }

  const numericLevel = Number(normalizedLevel.match(/\d+/)?.[0]);
  return Number.isFinite(numericLevel) ? numericLevel : Number.MAX_SAFE_INTEGER - 1;
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getEnglishWordAtPoint(clientX: number, clientY: number) {
  const documentWithCaret = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offset: number; offsetNode: Node } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const caretPosition = documentWithCaret.caretPositionFromPoint?.(clientX, clientY);
  let textNode: Node | null = caretPosition?.offsetNode ?? null;
  let offset = caretPosition?.offset ?? 0;

  if (!textNode) {
    const range = documentWithCaret.caretRangeFromPoint?.(clientX, clientY);
    textNode = range?.startContainer ?? null;
    offset = range?.startOffset ?? 0;
  }

  if (!textNode) {
    const element = document.elementFromPoint(clientX, clientY);
    const textNodes: Node[] = element ? [...element.childNodes] : [];

    while (textNodes.length > 0) {
      const candidateNode = textNodes.shift();
      if (!candidateNode) continue;

      if (candidateNode.nodeType !== Node.TEXT_NODE) {
        textNodes.unshift(...candidateNode.childNodes);
        continue;
      }

      const candidateText = candidateNode.textContent ?? "";
      const candidatePattern = /[A-Za-z]+(?:['’-][A-Za-z]+)?/g;
      let candidateMatch: RegExpExecArray | null;

      while ((candidateMatch = candidatePattern.exec(candidateText)) !== null) {
        const range = document.createRange();
        range.setStart(candidateNode, candidateMatch.index);
        range.setEnd(candidateNode, candidateMatch.index + candidateMatch[0].length);
        const rect = range.getBoundingClientRect();
        range.detach();

        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return { rect, word: candidateMatch[0] };
        }
      }
    }
  }

  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const text = textNode.textContent ?? "";
  const wordPattern = /[A-Za-z]+(?:['’-][A-Za-z]+)?/g;
  let match: RegExpExecArray | null;

  while ((match = wordPattern.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (offset < start || offset > end) {
      continue;
    }

    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const rect = range.getBoundingClientRect();
    range.detach();

    if (rect.width === 0 && rect.height === 0) {
      return null;
    }

    return { rect, word: match[0] };
  }

  return null;
}

function InlineFillAnswer({
  answers,
  className = "",
  minAnswerChars = 7,
  onAnswerChange,
  question,
  showQuestionNumber = true,
  submitted,
}: {
  answers: AnswerMap;
  className?: string;
  minAnswerChars?: number;
  onAnswerChange: (questionId: string, value: string) => void;
  question?: ListeningQuestion;
  showQuestionNumber?: boolean;
  submitted: boolean;
}) {
  if (!question) {
    return <span className={`paper-answer-slot disabled ${className}`}>未录入</span>;
  }

  const userAnswer = answers[question.id] ?? "";
  const isCorrect = submitted && isAcceptedAnswer(userAnswer, question.answers);
  const correctAnswer = question.answers[0] ?? "未录入";
  const answerCharacters = Math.max(
    minAnswerChars,
    userAnswer.length,
    submitted ? correctAnswer.length : 0,
  );

  return (
    <span
      className={`paper-answer-slot ${className} ${
        submitted ? (isCorrect ? "correct" : "wrong") : ""
      }`}
      id={`question-${question.questionNo}`}
      style={{ "--paper-answer-ch": `${answerCharacters + 1}ch` } as CSSProperties}
    >
      {showQuestionNumber ? <span className="paper-question-number">{question.questionNo}</span> : null}
      {submitted ? (
        <span className="paper-answer-result">
          <span>{isCorrect ? "✅" : "❌"}</span>
          {isCorrect ? (
            <strong>{userAnswer || correctAnswer}</strong>
          ) : (
            <>
              <span className="wrong-user-answer">{userAnswer || "未作答"}</span>
              <span className="correct-answer">✅ {correctAnswer}</span>
            </>
          )}
        </span>
      ) : (
        <input
          aria-label={`Question ${question.questionNo}`}
          value={userAnswer}
          onChange={(event) => onAnswerChange(question.id, event.target.value)}
        />
      )}
    </span>
  );
}

function splitDoubleFillAnswer(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return ["", ""] as const;
  }

  const andParts = trimmedValue.split(/\s+and\s+/i);
  if (andParts.length >= 2) {
    return [andParts[0].trim(), andParts.slice(1).join(" and ").trim()] as const;
  }

  const commaParts = trimmedValue.split(/\s*,\s*/);
  if (commaParts.length >= 2) {
    return [commaParts[0].trim(), commaParts.slice(1).join(", ").trim()] as const;
  }

  const words = trimmedValue.split(/\s+/);
  return [words[0] ?? "", words.slice(1).join(" ")] as const;
}

function combineDoubleFillAnswer(firstAnswer: string, secondAnswer: string) {
  if (!firstAnswer.trim() && !secondAnswer.trim()) {
    return "";
  }

  if (!secondAnswer.trim()) {
    return firstAnswer;
  }

  if (!firstAnswer.trim()) {
    return secondAnswer;
  }

  return `${firstAnswer.trim()} and ${secondAnswer.trim()}`;
}

function InlineDoubleFillAnswer({
  answers,
  onAnswerChange,
  question,
  submitted,
}: {
  answers: AnswerMap;
  onAnswerChange: (questionId: string, value: string) => void;
  question?: ListeningQuestion;
  submitted: boolean;
}) {
  if (!question) {
    return <span className="paper-answer-slot disabled">未录入</span>;
  }

  const userAnswer = answers[question.id] ?? "";
  const questionId = question.id;
  const correctAnswer = question.answers[0] ?? "";
  const isCorrect = submitted && isAcceptedAnswer(userAnswer, question.answers);
  const [firstAnswer, secondAnswer] = splitDoubleFillAnswer(userAnswer);
  const [firstCorrectAnswer, secondCorrectAnswer] = splitDoubleFillAnswer(correctAnswer);

  function updatePart(nextFirstAnswer: string, nextSecondAnswer: string) {
    onAnswerChange(questionId, combineDoubleFillAnswer(nextFirstAnswer, nextSecondAnswer));
  }

  function renderSubmittedPart(userPart: string, correctPart: string) {
    const isPartCorrect = normalizeAnswer(userPart) === normalizeAnswer(correctPart);

    return (
      <span className="paper-answer-result">
        <span>{isPartCorrect ? "✅" : "❌"}</span>
        <strong className={isPartCorrect ? "" : "wrong-user-answer"}>
          {userPart || "未作答"}
        </strong>
        {!isPartCorrect ? <span className="correct-answer">✅ {correctPart}</span> : null}
      </span>
    );
  }

  return (
    <span className={`paper-double-answer ${submitted ? (isCorrect ? "correct" : "wrong") : ""}`}>
      <span
        className={`paper-answer-slot paper-answer-slot-no-number ${
          submitted ? (isCorrect ? "correct" : "wrong") : ""
        }`}
        id={`question-${question.questionNo}`}
        style={{ "--paper-answer-ch": `${Math.max(5, firstAnswer.length, firstCorrectAnswer.length) + 1}ch` } as CSSProperties}
      >
        {submitted ? (
          renderSubmittedPart(firstAnswer, firstCorrectAnswer)
        ) : (
          <input
            aria-label={`Question ${question.questionNo} first answer`}
            value={firstAnswer}
            onChange={(event) => updatePart(event.target.value, secondAnswer)}
          />
        )}
      </span>
      <span className="paper-double-answer-connector">and</span>
      <span
        className={`paper-answer-slot paper-answer-slot-no-number ${
          submitted ? (isCorrect ? "correct" : "wrong") : ""
        }`}
        style={{ "--paper-answer-ch": `${Math.max(5, secondAnswer.length, secondCorrectAnswer.length) + 1}ch` } as CSSProperties}
      >
        {submitted ? (
          renderSubmittedPart(secondAnswer, secondCorrectAnswer)
        ) : (
          <input
            aria-label={`Question ${question.questionNo} second answer`}
            value={secondAnswer}
            onChange={(event) => updatePart(firstAnswer, event.target.value)}
          />
        )}
      </span>
    </span>
  );
}

function ChoiceQuestionBlock({
  answers,
  onAnswerChange,
  options,
  question,
  stem,
  submitted,
}: {
  answers: AnswerMap;
  onAnswerChange: (questionId: string, value: string) => void;
  options: { letter: string; text: string }[];
  question?: ListeningQuestion;
  stem: string;
  submitted: boolean;
}) {
  if (!question) {
    return (
      <article className="paper-choice-question">
        <p>{stem}</p>
        <span className="paper-answer-slot disabled">未录入</span>
      </article>
    );
  }

  const userAnswer = answers[question.id] ?? "";

  return (
    <article className="paper-choice-question" id={`question-${question.questionNo}`}>
      <p>
        <strong>{question.questionNo}</strong> {stem}
      </p>
      <div className="choice-options paper-choice-options paper-letter-choice-options">
        {options.map((option) => {
          const isSelected = userAnswer === option.letter;
          const isCorrectOption =
            isAcceptedAnswer(option.letter, question.answers) ||
            isAcceptedAnswer(option.text, question.answers);
          const isWrongSelection = submitted && isSelected && !isCorrectOption;

          return (
            <label
              className={`choice-option ${
                submitted && isCorrectOption ? "correct-option" : ""
              } ${isWrongSelection ? "wrong-option" : ""} ${isSelected ? "selected-option" : ""}`}
              key={option.letter}
            >
              <span className="choice-status-icon">
                {submitted && isCorrectOption ? "✅" : null}
                {isWrongSelection ? "❌" : null}
              </span>
              <span
                className={`choice-dot ${
                  isSelected || (submitted && isCorrectOption) ? "selected" : ""
                }`}
              />
              <input
                checked={isSelected}
                disabled={submitted}
                name={`question-${question.id}`}
                type="radio"
                value={option.letter}
                onChange={() => onAnswerChange(question.id, option.letter)}
              />
              <span className="choice-letter">{option.letter}</span>
              <span>{option.text}</span>
            </label>
          );
        })}
      </div>
    </article>
  );
}

function CambridgeFourTestOneSectionOneSheet({
  answers,
  onAnswerChange,
  questions,
  submitted,
}: {
  answers: AnswerMap;
  onAnswerChange: (questionId: string, value: string) => void;
  questions: ListeningQuestion[];
  submitted: boolean;
}) {
  const questionByNo = new Map(questions.map((question) => [question.questionNo, question]));
  const answer = (questionNo: number, options: { showQuestionNumber?: boolean } = {}) => (
    <InlineFillAnswer
      answers={answers}
      onAnswerChange={onAnswerChange}
      question={questionByNo.get(questionNo)}
      showQuestionNumber={options.showQuestionNumber}
      submitted={submitted}
    />
  );

  return (
    <div className="paper-sheet">
      <div className="paper-listening-badge">LISTENING</div>

      <div className="paper-section-heading">
        <h2>SECTION 1</h2>
        <h2>Questions 1-10</h2>
      </div>

      <section className="paper-instructions">
        <h3>Questions 1-4</h3>
        <p>
          <em>Complete the notes below.</em>
        </p>
        <p>
          Write <strong>NO MORE THAN THREE WORDS AND/OR A NUMBER</strong> for each answer.
        </p>
      </section>

      <section className="programme-note-card" aria-label="Notes on social programme">
        <div className="programme-note-title">NOTES ON SOCIAL PROGRAMME</div>

        <div className="programme-example">
          <div>
            <strong>Example</strong>
            <span>Number of trips per month:</span>
          </div>
          <div>
            <strong>Answer</strong>
            <span>5</span>
          </div>
        </div>

        <div className="programme-visit-box">
          <p>
            <strong>Visit places which have:</strong>
          </p>
          <ul>
            <li>historical interest</li>
            <li>good {answer(1)}</li>
            <li>{answer(2)}</li>
          </ul>
        </div>

        <div className="programme-detail-grid">
          <strong>Cost:</strong>
          <span>between £5.00 and £15.00 per person</span>

          <strong>Note:</strong>
          <span>special trips organised for groups of {answer(3)} people</span>

          <strong>Time:</strong>
          <span>
            departure – 8.30 a.m.
            <br />
            return – 6.00 p.m.
          </span>

          <strong>To reserve a seat:</strong>
          <span>sign name on the {answer(4)} 3 days in advance</span>
        </div>
      </section>

      <section className="paper-instructions">
        <h3>Questions 5-10</h3>
        <p>
          <em>Complete the table below.</em>
        </p>
        <p>
          Write <strong>NO MORE THAN THREE WORDS AND/OR A NUMBER</strong> for each answer.
        </p>
      </section>

      <section className="paper-table-wrap">
        <table className="paper-table">
          <thead>
            <tr>
              <th>Place</th>
              <th>Date</th>
              <th>Number of seats</th>
              <th>Optional extra</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>St Ives</td>
              <td>{answer(5)}</td>
              <td>16</td>
              <td>Hepworth Museum</td>
            </tr>
            <tr>
              <td>London</td>
              <td>16th February</td>
              <td>45</td>
              <td>{answer(6)}</td>
            </tr>
            <tr>
              <td>{answer(7)}</td>
              <td>3rd March</td>
              <td>18</td>
              <td>S.S. Great Britain</td>
            </tr>
            <tr>
              <td>Salisbury</td>
              <td>18th March</td>
              <td>50</td>
              <td>Stonehenge</td>
            </tr>
            <tr>
              <td>Bath</td>
              <td>23rd March</td>
              <td>16</td>
              <td>{answer(8)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="paper-further-info">
        <strong>For further information:</strong>
        <p>
          Read the {answer(9)} or see Social Assistant: Jane {answer(10)}
        </p>
      </section>
    </div>
  );
}

function CambridgeFourTestOneSectionTwoSheet({
  answers,
  onAnswerChange,
  questions,
  submitted,
}: {
  answers: AnswerMap;
  onAnswerChange: (questionId: string, value: string) => void;
  questions: ListeningQuestion[];
  submitted: boolean;
}) {
  const questionByNo = new Map(questions.map((question) => [question.questionNo, question]));
  const answer = (questionNo: number, options: { showQuestionNumber?: boolean } = {}) => (
    <InlineFillAnswer
      answers={answers}
      onAnswerChange={onAnswerChange}
      question={questionByNo.get(questionNo)}
      showQuestionNumber={options.showQuestionNumber}
      submitted={submitted}
    />
  );
  const doubleAnswer = (questionNo: number) => (
    <InlineDoubleFillAnswer
      answers={answers}
      onAnswerChange={onAnswerChange}
      question={questionByNo.get(questionNo)}
      submitted={submitted}
    />
  );

  return (
    <div className="paper-sheet">
      <div className="paper-section-heading">
        <h2>SECTION 2</h2>
        <h2>Questions 11-20</h2>
      </div>

      <section className="paper-instructions">
        <h3>Questions 11-13</h3>
        <p>
          <em>Complete the sentences below.</em>
        </p>
        <p>
          Write <strong>NO MORE THAN THREE WORDS AND/OR A NUMBER</strong> for each answer.
        </p>
      </section>

      <section className="paper-sentence-list">
        <h3>RIVERSIDE INDUSTRIAL VILLAGE</h3>
        <p>
          <strong>11</strong> Riverside Village was a good place to start an industry because it had
          water, raw materials and fuels such as {doubleAnswer(11)}.
        </p>
        <p>
          <strong>12</strong> The metal industry was established at Riverside Village by{" "}
          {answer(12, { showQuestionNumber: false })}{" "}
          who lived in the area.
        </p>
        <p>
          <strong>13</strong> There were over {answer(13, { showQuestionNumber: false })} water-powered mills in the area in the
          eighteenth century.
        </p>
      </section>

      <section className="paper-instructions">
        <h3>Questions 14-20</h3>
        <p>
          <em>Label the plan below.</em>
        </p>
        <p>
          Write <strong>NO MORE THAN TWO WORDS</strong> for each answer.
        </p>
      </section>

      <section className="riverside-book-plan" aria-label="Riverside Industrial Village plan">
        <img
          alt="Riverside Industrial Village plan from Cambridge IELTS 4"
          className="riverside-book-plan-image"
          height={1690}
          src="/listening/ci4/t1/s2/riverside-industrial-village-plan.png"
          width={1440}
        />
        <div className="riverside-plan-answer-fields">
          <div className="riverside-plan-upper-answers" aria-label="Questions 14 to 16">
            {[14, 15, 16].map((questionNo) => (
              <div className="riverside-answer-line" key={questionNo}>
                {answer(questionNo)}
              </div>
            ))}
          </div>
          <div className="riverside-plan-lower-answers" aria-label="Questions 17 to 20">
            {[17, 18, 19, 20].map((questionNo) => (
              <div className="riverside-answer-line" key={questionNo}>
                {answer(questionNo)}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CambridgeFourTestOneSectionThreeSheet({
  answers,
  onAnswerChange,
  questions,
  submitted,
}: {
  answers: AnswerMap;
  onAnswerChange: (questionId: string, value: string) => void;
  questions: ListeningQuestion[];
  submitted: boolean;
}) {
  const questionByNo = new Map(questions.map((question) => [question.questionNo, question]));
  const answer = (questionNo: number) => (
    <InlineFillAnswer
      answers={answers}
      onAnswerChange={onAnswerChange}
      question={questionByNo.get(questionNo)}
      submitted={submitted}
    />
  );
  const chartAnswer = (questionNo: number) => (
    <InlineFillAnswer
      answers={answers}
      className="paper-chart-answer-slot"
      minAnswerChars={2}
      onAnswerChange={onAnswerChange}
      question={questionByNo.get(questionNo)}
      submitted={submitted}
    />
  );

  return (
    <div className="paper-sheet">
      <div className="paper-section-heading">
        <h2>SECTION 3</h2>
        <h2>Questions 21-30</h2>
      </div>

      <section className="paper-instructions">
        <h3>Questions 21 and 22</h3>
        <p>
          <em>Choose the correct letter, A, B or C.</em>
        </p>
      </section>

      <section className="paper-example-box">
        <strong>Example</strong>
        <p>Melanie could not borrow any books from the library because</p>
        <p>
          <strong>C</strong> the books had already been borrowed.
        </p>
      </section>

      <ChoiceQuestionBlock
        answers={answers}
        onAnswerChange={onAnswerChange}
        options={[
          { letter: "A", text: "she was doing work for another course." },
          { letter: "B", text: "it was a really big assignment." },
          { letter: "C", text: "she hasn't spent time in the library." },
        ]}
        question={questionByNo.get(21)}
        stem="Melanie says she has not started the assignment because"
        submitted={submitted}
      />

      <ChoiceQuestionBlock
        answers={answers}
        onAnswerChange={onAnswerChange}
        options={[
          { letter: "A", text: "planning problems." },
          { letter: "B", text: "problems with assignment deadlines." },
          { letter: "C", text: "personal illness or accident." },
        ]}
        question={questionByNo.get(22)}
        stem="The lecturer says that reasonable excuses for extensions are"
        submitted={submitted}
      />

      <section className="paper-instructions">
        <h3>Questions 23-27</h3>
        <p>
          What recommendations does Dr Johnson make about the journal articles?
        </p>
        <p>
          Choose your answers from the box and write the letters <strong>A-G</strong> next to
          questions 23-27.
        </p>
      </section>

      <div className="paper-option-box paper-chart-option-box">
        <span><strong>A</strong> must read</span>
        <span><strong>B</strong> useful</span>
        <span><strong>C</strong> limited value</span>
        <span><strong>D</strong> read first section</span>
        <span><strong>E</strong> read research methods</span>
        <span><strong>F</strong> read conclusion</span>
        <span><strong>G</strong> don't read</span>
      </div>

      <section className="paper-match-list">
        <div className="paper-example-row">
          <strong>Example</strong>
          <span>Anderson and Hawker:</span>
          <strong>A</strong>
        </div>
        <p>Jackson: {answer(23)}</p>
        <p>Roberts: {answer(24)}</p>
        <p>Morris: {answer(25)}</p>
        <p>Cooper: {answer(26)}</p>
        <p>Forster: {answer(27)}</p>
      </section>

      <section className="paper-instructions">
        <h3>Questions 28-30</h3>
        <p>
          <em>Label the chart below.</em>
        </p>
        <p>
          Choose your answers from the box below and write the letters <strong>A-H</strong> next to
          questions 28-30.
        </p>
      </section>

      <section className="paper-chart-card">
        <h3>Population studies</h3>
        <h4>Reasons for changing accommodation</h4>
        <div className="paper-chart-plot">
          <div className="chart-bar" style={{ height: "90%" }}><span>C</span><small>1</small></div>
          <div className="chart-bar" style={{ height: "80%" }}>{chartAnswer(28)}<small>2</small></div>
          <div className="chart-bar" style={{ height: "55%" }}><span>E</span><small>3</small></div>
          <div className="chart-bar" style={{ height: "70%" }}>{chartAnswer(29)}<small>4</small></div>
          <div className="chart-bar" style={{ height: "30%" }}><span>G</span><small>5</small></div>
          <div className="chart-bar" style={{ height: "90%" }}>{chartAnswer(30)}<small>6</small></div>
        </div>
      </section>

      <div className="paper-option-box">
        <span><strong>A</strong> uncooperative landlord</span>
        <span><strong>B</strong> environment</span>
        <span><strong>C</strong> space</span>
        <span><strong>D</strong> noisy neighbours</span>
        <span><strong>E</strong> near city</span>
        <span><strong>F</strong> work location</span>
        <span><strong>G</strong> transport</span>
        <span><strong>H</strong> rent</span>
      </div>
    </div>
  );
}

function CambridgeFourTestOneSectionFourSheet({
  answers,
  onAnswerChange,
  questions,
  submitted,
}: {
  answers: AnswerMap;
  onAnswerChange: (questionId: string, value: string) => void;
  questions: ListeningQuestion[];
  submitted: boolean;
}) {
  const questionByNo = new Map(questions.map((question) => [question.questionNo, question]));
  const answer = (questionNo: number) => (
    <InlineFillAnswer
      answers={answers}
      onAnswerChange={onAnswerChange}
      question={questionByNo.get(questionNo)}
      submitted={submitted}
    />
  );

  return (
    <div className="paper-sheet">
      <div className="paper-section-heading">
        <h2>SECTION 4</h2>
        <h2>Questions 31-40</h2>
      </div>

      <section className="paper-instructions">
        <p>
          <em>Complete the notes below.</em>
        </p>
        <p>
          Write <strong>NO MORE THAN TWO WORDS</strong> for each answer.
        </p>
      </section>

      <section className="urban-note-card">
        <h3>THE URBAN LANDSCAPE</h3>

        <div className="urban-note-group">
          <strong>Two areas of focus:</strong>
          <ul>
            <li>the effect of vegetation on the urban climate</li>
            <li>ways of planning our {answer(31)} better</li>
          </ul>
        </div>

        <div className="urban-note-group">
          <strong>Large-scale impact of trees:</strong>
          <ul>
            <li>they can make cities more or less {answer(32)}</li>
            <li>in summer they can make cities cooler</li>
            <li>they can make inland cities more {answer(33)}</li>
          </ul>
        </div>

        <div className="urban-note-group">
          <strong>Local impact of trees:</strong>
          <ul>
            <li>
              they can make local areas
              <ul>
                <li>more {answer(34)}</li>
                <li>cooler</li>
                <li>more humid</li>
                <li>less windy</li>
                <li>less {answer(35)}</li>
              </ul>
            </li>
          </ul>
        </div>

        <div className="urban-note-group">
          <strong className="underlined">Comparing trees and buildings</strong>
          <p><strong>Temperature regulation:</strong></p>
          <ul>
            <li>trees evaporate water through their {answer(36)}</li>
            <li>building surfaces may reach high temperatures</li>
          </ul>
          <p><strong>Wind force:</strong></p>
          <ul>
            <li>tall buildings cause more wind at {answer(37)} level</li>
            <li>trees {answer(38)} the wind force</li>
          </ul>
          <p><strong>Noise:</strong></p>
          <ul>
            <li>trees have a small effect on traffic noise</li>
            <li>{answer(39)} frequency noise passes through trees</li>
          </ul>
        </div>

        <div className="urban-note-group">
          <strong>Important points to consider:</strong>
          <ul>
            <li>trees require a lot of sunlight, water and {answer(40)} to grow</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function CambridgeFourTestOneSheet({
  answers,
  onAnswerChange,
  questions,
  sectionNo,
  submitted,
}: {
  answers: AnswerMap;
  onAnswerChange: (questionId: string, value: string) => void;
  questions: ListeningQuestion[];
  sectionNo: number;
  submitted: boolean;
}) {
  if (sectionNo === 2) {
    return (
      <CambridgeFourTestOneSectionTwoSheet
        answers={answers}
        onAnswerChange={onAnswerChange}
        questions={questions}
        submitted={submitted}
      />
    );
  }

  if (sectionNo === 3) {
    return (
      <CambridgeFourTestOneSectionThreeSheet
        answers={answers}
        onAnswerChange={onAnswerChange}
        questions={questions}
        submitted={submitted}
      />
    );
  }

  if (sectionNo === 4) {
    return (
      <CambridgeFourTestOneSectionFourSheet
        answers={answers}
        onAnswerChange={onAnswerChange}
        questions={questions}
        submitted={submitted}
      />
    );
  }

  return (
    <CambridgeFourTestOneSectionOneSheet
      answers={answers}
      onAnswerChange={onAnswerChange}
      questions={questions}
      submitted={submitted}
    />
  );
}

export function ListeningPractice({
  initialMode = "mock",
  initialSubmitted = false,
  section,
  vocabularyHints = {},
}: ListeningPracticeProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [mode] = useState<ListeningMode>(initialMode);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [audioSettings, setAudioSettings] = useState<AudioPlayerSettings>(
    DEFAULT_AUDIO_PLAYER_SETTINGS,
  );
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPracticeTimerRunning, setIsPracticeTimerRunning] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [mockStarted, setMockStarted] = useState(mode === "practice");
  const [seconds, setSeconds] = useState(() =>
    mode === "practice" ? 0 : getListeningCountdownSeconds(section),
  );
  const [autoPlaySignal, setAutoPlaySignal] = useState(0);
  const [isFullAudioPlaying, setIsFullAudioPlaying] = useState(false);
  const [fullAudioPositionMs, setFullAudioPositionMs] = useState(0);
  const [favoriteSentenceIds, setFavoriteSentenceIds] = useState<string[]>([]);
  const [favoriteWordIds, setFavoriteWordIds] = useState<string[]>([]);
  const [sentenceAutoPlaySignals, setSentenceAutoPlaySignals] = useState<Record<string, number>>({});
  const [dictationAnswers, setDictationAnswers] = useState<Record<string, string>>({});
  const [sentenceOrderAnswers, setSentenceOrderAnswers] = useState<Record<string, SentenceOrderAnswer>>({});
  const [activeWordTooltip, setActiveWordTooltip] = useState<ActiveWordTooltip | null>(null);
  const [selectionActionPosition, setSelectionActionPosition] =
    useState<StudySelectionActionPosition | null>(null);
  const [questionSurfaceHeight, setQuestionSurfaceHeight] = useState<number | null>(null);
  const [notePanelPosition, setNotePanelPosition] = useState({ left: 0, top: 0 });
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const questionSurfaceRef = useRef<HTMLDivElement | null>(null);
  const subtitleListRef = useRef<HTMLDivElement | null>(null);
  const selectedRangeRef = useRef<Range | null>(null);
  const hoverWordTimerRef = useRef<number | null>(null);
  const hideWordTimerRef = useRef<number | null>(null);
  const selectionHideTimerRef = useRef<number | null>(null);
  const fetchedVocabularyHintsRef = useRef(new Map<string, WordHint | null>());
  const hoverRequestIdRef = useRef(0);
  const pendingHoverWordRef = useRef("");
  const [seekRequest, setSeekRequest] = useState<{
    id: number;
    play: boolean;
    positionSeconds: number;
  } | null>(null);
  const [stopAtSeconds, setStopAtSeconds] = useState<number | null>(null);
  const [checkSecondsLeft, setCheckSecondsLeft] = useState<number | null>(null);
  const pageRef = useRef<HTMLElement | null>(null);
  const shouldUsePaperLayout =
    section.bookCode === "cambridge-4" &&
    section.testNo === 1 &&
    section.sectionNo >= 1 &&
    section.sectionNo <= 4;
  const practiceTitle = formatListeningSectionTitle(section);
  const questionImageUrls =
    section.questionImageUrls.length > 0
      ? section.questionImageUrls
      : section.questionImageUrl
        ? [section.questionImageUrl]
        : [];
  const activeSentence = useMemo(() => {
    if (mode !== "practice") {
      return null;
    }

    return (
      section.transcriptSentences.find((sentence) => {
        if (sentence.startMs == null || sentence.endMs == null) {
          return false;
        }

        return fullAudioPositionMs >= sentence.startMs && fullAudioPositionMs <= sentence.endMs;
      }) ?? null
    );
  }, [fullAudioPositionMs, mode, section.transcriptSentences]);
  const activeSentenceNo = activeSentence?.sentenceNo ?? null;
  const activeLoopSegment =
    activeSentence?.startMs != null && activeSentence.endMs != null
      ? {
          endSeconds: activeSentence.endMs / 1000,
          startSeconds: activeSentence.startMs / 1000,
        }
      : null;

  function updateAudioSettings(nextSettings: Partial<AudioPlayerSettings>) {
    setAudioSettings((current) => ({ ...current, ...nextSettings }));
  }

  function favoriteSentenceId(sentence: ListeningSentence) {
    return `${section.id}:${sentence.id}`;
  }

  function readFavoriteSentences() {
    try {
      const rawValue = window.localStorage.getItem(FAVORITE_SENTENCES_STORAGE_KEY);
      return rawValue ? (JSON.parse(rawValue) as FavoriteSentenceItem[]) : [];
    } catch {
      return [];
    }
  }

  function readFavoriteWords() {
    try {
      const rawValue = window.localStorage.getItem(FAVORITE_WORDS_STORAGE_KEY);
      return rawValue ? (JSON.parse(rawValue) as FavoriteWordItem[]) : [];
    } catch {
      return [];
    }
  }

  function writeFavoriteSentences(items: FavoriteSentenceItem[]) {
    const sortedItems = [...items].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );
    window.localStorage.setItem(FAVORITE_SENTENCES_STORAGE_KEY, JSON.stringify(sortedItems));
    setFavoriteSentenceIds(sortedItems.map((item) => item.id));
  }

  function writeFavoriteWords(items: FavoriteWordItem[]) {
    const sortedItems = [...items].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );
    window.localStorage.setItem(FAVORITE_WORDS_STORAGE_KEY, JSON.stringify(sortedItems));
    setFavoriteWordIds(sortedItems.map((item) => item.id));
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
    const id = `listening:${section.id}:annotation:${itemId}`;
    writeFavoriteAnnotations(readFavoriteAnnotations().filter((item) => item.id !== id));
  }

  function removeFavoriteAnnotations(items: AnnotationItem[]) {
    const ids = new Set(items.map((item) => `listening:${section.id}:annotation:${item.id}`));
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
    const id = `listening:${section.id}:annotation:${item.id}`;
    const nextItem: FavoriteAnnotationItem = {
      excerpt: noteText,
      href: `/listening/${section.id}?mode=practice&review=1`,
      id,
      savedAt: new Date(item.id).toISOString(),
      sourceTitle: `listening ${formatFavoriteBookCode(section.bookCode)}-test${section.testNo}-part${section.sectionNo}`,
      title: sourceText,
    };

    writeFavoriteAnnotations([nextItem, ...currentFavorites.filter((favorite) => favorite.id !== id)]);
  }

  function submitListeningAnswers() {
    writeReviewAnswers(section.id, answers);
    syncWrongQuestionFavorites(section, answers);
    setSubmitted(true);
    if (isFullscreen) {
      setIsFullscreen(false);
    }
  }

  function toggleListeningFullscreen() {
    setIsFullscreen((current) => !current);
  }

  function toggleFavoriteSentence(sentence: ListeningSentence) {
    const id = favoriteSentenceId(sentence);
    const currentFavorites = readFavoriteSentences();
    const existingFavorite = currentFavorites.find((item) => item.id === id);

    if (existingFavorite) {
      writeFavoriteSentences(currentFavorites.filter((item) => item.id !== id));
      return;
    }

    writeFavoriteSentences([
      {
        audioUrl: sentence.audioUrl,
        bookCode: section.bookCode,
        chineseText: sentence.chineseText,
        englishText: sentence.englishText,
        href: `/listening/${section.id}?mode=practice&review=1#transcript-sentence-${sentence.sentenceNo}`,
        id,
        savedAt: new Date().toISOString(),
        sectionId: section.id,
        sectionTitle: practiceTitle,
        sentenceNo: sentence.sentenceNo,
        testNo: section.testNo,
      },
      ...currentFavorites,
    ]);
  }

  function toggleFavoriteWord(word: string) {
    const normalizedWord = normalizeWord(word);
    if (!normalizedWord) {
      return;
    }

    const currentFavorites = readFavoriteWords();
    const existingFavorite = currentFavorites.find((item) => item.id === normalizedWord);

    if (existingFavorite) {
      writeFavoriteWords(currentFavorites.filter((item) => item.id !== normalizedWord));
      return;
    }

    const hint =
      activeWordTooltip?.word === normalizedWord
        ? activeWordTooltip.hint
        : fetchedVocabularyHintsRef.current.get(normalizedWord) ??
          getWordHint(word, vocabularyHints);
    writeFavoriteWords([
      {
        definitionCn: hint.definitionCn,
        etymologySource: hint.etymologySource,
        formation: hint.formation,
        id: normalizedWord,
        level: hint.level,
        partOfSpeech: hint.partOfSpeech,
        phonetic: hint.phonetic,
        root: hint.root,
        savedAt: new Date().toISOString(),
        word: normalizedWord,
      },
      ...currentFavorites,
    ]);
  }

  async function resolveWordHint(word: string) {
    const normalizedWord = normalizeWord(word);
    const preloadedHint = vocabularyHints[normalizedWord] ?? VOCABULARY_HINTS[normalizedWord];

    if (preloadedHint) {
      return preloadedHint;
    }

    const cachedHint = fetchedVocabularyHintsRef.current.get(normalizedWord);
    if (cachedHint !== undefined) {
      return cachedHint;
    }

    try {
      const response = await fetch(
        `/api/vocabulary-hint?word=${encodeURIComponent(normalizedWord)}`,
      );
      const payload = (await response.json()) as { hint?: LocalVocabularyHint | null };
      const hint = response.ok ? payload.hint ?? null : null;
      fetchedVocabularyHintsRef.current.set(normalizedWord, hint);
      return hint;
    } catch {
      fetchedVocabularyHintsRef.current.set(normalizedWord, null);
      return null;
    }
  }

  async function showWordTooltipFromRect(word: string, rect: DOMRect, requestId: number) {
    if (!submitted) {
      setActiveWordTooltip(null);
      return;
    }

    const normalizedWord = normalizeWord(word);
    if (!normalizedWord) {
      setActiveWordTooltip(null);
      return;
    }

    const hint = await resolveWordHint(word);
    if (!hint || requestId !== hoverRequestIdRef.current) {
      if (!hint && requestId === hoverRequestIdRef.current) {
        setActiveWordTooltip(null);
      }
      return;
    }

    const viewportPadding = 16;
    const tooltipWidth = Math.min(300, window.innerWidth - viewportPadding * 2);
    const estimatedTooltipHeight = 270;
    const preferredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.min(
      window.innerWidth - tooltipWidth - viewportPadding,
      Math.max(viewportPadding, preferredLeft),
    );
    const shouldOpenAbove =
      rect.bottom + estimatedTooltipHeight + 12 > window.innerHeight &&
      rect.top > estimatedTooltipHeight + 12;

    const nextTooltip: ActiveWordTooltip = {
      hint,
      left,
      placement: shouldOpenAbove ? "above" : "below",
      top: shouldOpenAbove ? rect.top - 10 : rect.bottom + 10,
      width: tooltipWidth,
      word: normalizedWord,
    };

    setActiveWordTooltip((current) => {
      if (
        current?.word === nextTooltip.word &&
        Math.abs(current.left - nextTooltip.left) < 2 &&
        Math.abs(current.top - nextTooltip.top) < 2
      ) {
        return current;
      }

      return nextTooltip;
    });
  }

  function showWordTooltip(word: string, target: HTMLElement) {
    hoverRequestIdRef.current += 1;
    void showWordTooltipFromRect(word, target.getBoundingClientRect(), hoverRequestIdRef.current);
  }

  function clearHoverWordTimer() {
    if (hoverWordTimerRef.current != null) {
      window.clearTimeout(hoverWordTimerRef.current);
      hoverWordTimerRef.current = null;
    }
  }

  function clearHideWordTimer() {
    if (hideWordTimerRef.current != null) {
      window.clearTimeout(hideWordTimerRef.current);
      hideWordTimerRef.current = null;
    }
  }

  function scheduleWordTooltip(word: string, rect: DOMRect) {
    const normalizedWord = normalizeWord(word);
    if (!normalizedWord) {
      return;
    }

    clearHideWordTimer();

    if (activeWordTooltip?.word === normalizedWord || pendingHoverWordRef.current === normalizedWord) {
      return;
    }

    if (activeWordTooltip && activeWordTooltip.word !== normalizedWord) {
      setActiveWordTooltip(null);
    }

    pendingHoverWordRef.current = normalizedWord;
    clearHoverWordTimer();
    hoverWordTimerRef.current = window.setTimeout(() => {
      hoverRequestIdRef.current += 1;
      void showWordTooltipFromRect(word, rect, hoverRequestIdRef.current);
      pendingHoverWordRef.current = "";
      hoverWordTimerRef.current = null;
    }, 1500);
  }

  function scheduleHideWordTooltip(delay = 1500) {
    if (selectedText && delay > 0) {
      return;
    }

    pendingHoverWordRef.current = "";
    hoverRequestIdRef.current += 1;
    clearHoverWordTimer();
    clearHideWordTimer();
    hideWordTimerRef.current = window.setTimeout(() => {
      setActiveWordTooltip(null);
      hideWordTimerRef.current = null;
    }, delay);
  }

  function handleEnglishWordHover(event: ReactMouseEvent<HTMLElement>) {
    if (!submitted) {
      scheduleHideWordTooltip(0);
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        ".word-tooltip-floating, button, input, textarea, select, [contenteditable='true']",
      )
    ) {
      clearHideWordTimer();
      return;
    }

    const wordAtPoint = getEnglishWordAtPoint(event.clientX, event.clientY);
    if (!wordAtPoint) {
      scheduleHideWordTooltip();
      return;
    }

    const normalizedWordAtPoint = normalizeWord(wordAtPoint.word);
    if (activeWordTooltip && activeWordTooltip.word !== normalizedWordAtPoint) {
      scheduleHideWordTooltip(0);
    }

    scheduleWordTooltip(wordAtPoint.word, wordAtPoint.rect);
  }

  function playSentenceSegment(sentence: ListeningSentence, modeOverride?: "loop" | "once") {
    if (sentence.startMs == null) {
      return;
    }

    const shouldLoop = modeOverride === "loop" || audioSettings.playMode === "sentence-loop";
    setFullAudioPositionMs(sentence.startMs);
    setStopAtSeconds(!shouldLoop && sentence.endMs != null ? sentence.endMs / 1000 : null);
    setSeekRequest({
      id: Date.now() + sentence.sentenceNo,
      play: true,
      positionSeconds: sentence.startMs / 1000,
    });
  }

  function handleSentenceStopAtEnd() {
    setStopAtSeconds(null);
  }

  function updateAnswer(questionId: string, value: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  function startMockAudio() {
    setMockStarted(true);
    setAutoPlaySignal((value) => value + 1);
  }

  function handleQuestionSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!selection || selection.rangeCount === 0 || !/[A-Za-z]/.test(text)) {
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return;
    }

    selectedRangeRef.current = range;
    setSelectedText(text);
    setSelectionActionPosition(getStudySelectionActionPosition(rect));

    const firstWord = text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)?/)?.[0];
    if (firstWord) {
      if (submitted) {
        hoverRequestIdRef.current += 1;
        void showWordTooltipFromRect(firstWord, rect, hoverRequestIdRef.current);
      } else {
        setActiveWordTooltip(null);
      }
    } else {
      setActiveWordTooltip(null);
    }
  }

  function clearSelectionHideTimer() {
    if (selectionHideTimerRef.current != null) {
      window.clearTimeout(selectionHideTimerRef.current);
      selectionHideTimerRef.current = null;
    }
  }

  function hideSelectionAction() {
    window.getSelection()?.removeAllRanges();
    selectedRangeRef.current = null;
    setSelectedText("");
    setSelectionActionPosition(null);
  }

  function scheduleHideSelectionAction() {
    clearSelectionHideTimer();
    selectionHideTimerRef.current = window.setTimeout(() => {
      hideSelectionAction();
      selectionHideTimerRef.current = null;
    }, 1500);
  }

  function handleSubtitleClick(sentence: ListeningSentence) {
    const selectedTextInPage = window.getSelection()?.toString().trim() ?? "";
    if (selectedTextInPage) {
      return;
    }

    playSentenceSegment(sentence);
  }

  function playSentenceAudioClip(sentence: ListeningSentence) {
    const selectedTextInPage = window.getSelection()?.toString().trim() ?? "";
    if (selectedTextInPage) {
      return;
    }

    if (!sentence.audioUrl) {
      playSentenceSegment(sentence);
      return;
    }

    setSentenceAutoPlaySignals((current) => ({
      ...current,
      [sentence.id]: (current[sentence.id] ?? 0) + 1,
    }));
  }

  function handleSentenceAudioEnded(sentence: ListeningSentence) {
    if (audioSettings.playMode !== "sequential") {
      return;
    }

    const currentIndex = section.transcriptSentences.findIndex(
      (transcriptSentence) => transcriptSentence.id === sentence.id,
    );
    const nextSentence =
      currentIndex >= 0
        ? section.transcriptSentences.slice(currentIndex + 1).find((item) => item.audioUrl)
        : null;

    if (nextSentence) {
      playSentenceAudioClip(nextSentence);
    }
  }

  function handleSubtitlePanelWheel(event: ReactWheelEvent<HTMLElement>) {
    if (event.ctrlKey || event.deltaY === 0) {
      return;
    }

    const subtitleList = subtitleListRef.current;
    if (!subtitleList) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    subtitleList.scrollTop += event.deltaY;
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
        top: Math.max(90, startTop + moveEvent.clientY - startY),
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

  function getDictationAnswerKey(sentence: ListeningSentence, tokenIndex: number) {
    return `${audioSettings.dictationMode}:${sentence.id}:${tokenIndex}`;
  }

  function updateDictationAnswer(sentence: ListeningSentence, tokenIndex: number, value: string) {
    setDictationAnswers((current) => ({
      ...current,
      [getDictationAnswerKey(sentence, tokenIndex)]: value,
    }));
  }

  function shouldAdvanceDictationOnSubmitKey() {
    return (
      audioSettings.dictationMode === "blank-dictation" ||
      audioSettings.dictationMode === "sentence-dictation" ||
      audioSettings.dictationMode === "translation-training"
    );
  }

  function getSiblingDictationBlanks(currentInput: HTMLInputElement) {
    const sentenceCard = currentInput.closest(".sentence-card");
    return Array.from(
      (sentenceCard ?? document).querySelectorAll<HTMLInputElement>(".dictation-blank-input"),
    );
  }

  function getTranscriptDictationBlanks(currentInput: HTMLInputElement) {
    const transcriptPanel = currentInput.closest(".transcript-panel");
    return Array.from(
      (transcriptPanel ?? document).querySelectorAll<HTMLInputElement>(".dictation-blank-input"),
    );
  }

  function focusDictationBlank(input: HTMLInputElement | null | undefined) {
    if (!input) {
      return;
    }

    input.focus();
    input.select();
  }

  function focusNextDictationBlank(currentInput: HTMLInputElement, scope: "sentence" | "transcript") {
    const inputs =
      scope === "transcript"
        ? getTranscriptDictationBlanks(currentInput)
        : getSiblingDictationBlanks(currentInput);
    const currentIndex = inputs.indexOf(currentInput);
    const nextInput = currentIndex >= 0 ? inputs[currentIndex + 1] : null;

    focusDictationBlank(nextInput);
  }

  function focusPreviousDictationBlank(currentInput: HTMLInputElement) {
    const inputs = getTranscriptDictationBlanks(currentInput);
    const currentIndex = inputs.indexOf(currentInput);
    const previousInput = currentIndex > 0 ? inputs[currentIndex - 1] : null;

    if (!previousInput) {
      return;
    }

    const cursorPosition = previousInput.value.length;
    previousInput.focus();
    previousInput.setSelectionRange(cursorPosition, cursorPosition);
  }

  function handleDictationBlankKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!shouldAdvanceDictationOnSubmitKey()) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      focusNextDictationBlank(event.currentTarget, "transcript");
      return;
    }

    if (event.key === " " && event.currentTarget.value.trim()) {
      event.preventDefault();
      focusNextDictationBlank(event.currentTarget, "transcript");
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      event.currentTarget.value.length === 0
    ) {
      event.preventDefault();
      focusPreviousDictationBlank(event.currentTarget);
    }
  }

  function getSentenceWordTargets(sentence: ListeningSentence) {
    return splitEnglishTokens(sentence.englishText)
      .map((token, tokenIndex) => {
        if (!isWordToken(token)) {
          return null;
        }

        const normalizedWord = normalizeWord(token);
        const hint = vocabularyHints[normalizedWord] ?? VOCABULARY_HINTS[normalizedWord];

        return {
          normalizedWord,
          score: getVocabularyLevelScore(hint?.level),
          token,
          tokenIndex,
        };
      })
      .filter((target): target is DictationTarget & { score: number } => Boolean(target));
  }

  function getSortedWordTargets(sentence: ListeningSentence) {
    return [...getSentenceWordTargets(sentence)].sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      if (left.normalizedWord.length !== right.normalizedWord.length) {
        return right.normalizedWord.length - left.normalizedWord.length;
      }

      return left.tokenIndex - right.tokenIndex;
    });
  }

  function getBlankDictationTargetCount(wordCount: number) {
    if (wordCount <= 0) {
      return 0;
    }

    return Math.max(1, Math.floor((wordCount - 1) / 5));
  }

  function getDictationTargets(sentence: ListeningSentence) {
    const wordTargets = getSentenceWordTargets(sentence);

    if (
      audioSettings.dictationMode === "sentence-dictation" ||
      audioSettings.dictationMode === "translation-training"
    ) {
      return wordTargets;
    }

    if (audioSettings.dictationMode !== "blank-dictation" || wordTargets.length === 0) {
      return [];
    }

    return getSortedWordTargets(sentence)
      .slice(0, getBlankDictationTargetCount(wordTargets.length))
      .sort((left, right) => left.tokenIndex - right.tokenIndex);
  }

  function renderDictationBlank(sentence: ListeningSentence, target: DictationTarget) {
    const answerKey = getDictationAnswerKey(sentence, target.tokenIndex);
    const userAnswer = dictationAnswers[answerKey] ?? "";
    const hasTyped = userAnswer.trim().length > 0;
    const isCorrect = hasTyped && normalizeAnswer(userAnswer) === normalizeAnswer(target.token);
    const isWrong = hasTyped && !isCorrect;

    return (
      <input
        aria-label={`听写 ${target.normalizedWord}`}
        className={`dictation-blank-input ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
        key={`${sentence.id}-dictation-${target.tokenIndex}`}
        style={{ width: `${Math.max(62, target.token.length * 15)}px` }}
        value={userAnswer}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => updateDictationAnswer(sentence, target.tokenIndex, event.target.value)}
        onKeyDown={handleDictationBlankKeyDown}
      />
    );
  }

  function renderDictationSentence(sentence: ListeningSentence) {
    const tokens = splitEnglishTokens(sentence.englishText);
    const targetMap = new Map(
      getDictationTargets(sentence).map((target) => [target.tokenIndex, target]),
    );

    return (
      <p className="subtitle-english-line dictation-line">
        {tokens.map((token, tokenIndex) => {
          const target = targetMap.get(tokenIndex);

          if (target) {
            return renderDictationBlank(sentence, target);
          }

          return <span key={`${sentence.id}-dictation-token-${tokenIndex}`}>{token}</span>;
        })}
      </p>
    );
  }

  function getSentenceOrderAnswerKey(sentence: ListeningSentence, tokenIndex: number) {
    return `${sentence.id}:${tokenIndex}`;
  }

  function updateSentenceOrderAnswer(
    sentence: ListeningSentence,
    tokenIndex: number,
    answer: SentenceOrderAnswer,
  ) {
    setSentenceOrderAnswers((current) => ({
      ...current,
      [getSentenceOrderAnswerKey(sentence, tokenIndex)]: answer,
    }));
  }

  function getSentenceOrderWordBank(sentence: ListeningSentence) {
    return [...getSentenceWordTargets(sentence)].sort((left, right) => {
      const leftHash = stableHash(`${sentence.id}:${left.tokenIndex}:${left.token.toLowerCase()}`);
      const rightHash = stableHash(`${sentence.id}:${right.tokenIndex}:${right.token.toLowerCase()}`);

      if (leftHash !== rightHash) {
        return leftHash - rightHash;
      }

      return left.tokenIndex - right.tokenIndex;
    });
  }

  function renderSentenceOrderBlank(sentence: ListeningSentence, target: DictationTarget) {
    const answerKey = getSentenceOrderAnswerKey(sentence, target.tokenIndex);
    const placedAnswer = sentenceOrderAnswers[answerKey] ?? null;
    const hasAnswer = Boolean(placedAnswer);
    const isCorrect = hasAnswer && normalizeAnswer(placedAnswer?.token ?? "") === normalizeAnswer(target.token);
    const isWrong = hasAnswer && !isCorrect;

    return (
      <span
        aria-label={`语序排列 ${target.normalizedWord}`}
        className={`sentence-order-dropzone ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
        key={`${sentence.id}-order-${target.tokenIndex}`}
        role="button"
        tabIndex={0}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event: ReactDragEvent<HTMLSpanElement>) => {
          event.preventDefault();
          event.stopPropagation();

          try {
            const rawValue = event.dataTransfer.getData("application/json");
            const payload = JSON.parse(rawValue) as SentenceOrderAnswer;

            if (payload.token) {
              updateSentenceOrderAnswer(sentence, target.tokenIndex, payload);
            }
          } catch {
            const fallbackToken = event.dataTransfer.getData("text/plain");

            if (fallbackToken) {
              updateSentenceOrderAnswer(sentence, target.tokenIndex, {
                token: fallbackToken,
                tokenIndex: -1,
              });
            }
          }
        }}
      >
        {placedAnswer?.token ?? ""}
      </span>
    );
  }

  function renderSentenceOrderLine(sentence: ListeningSentence) {
    const tokens = splitEnglishTokens(sentence.englishText);
    const targetMap = new Map(
      getSentenceWordTargets(sentence).map((target) => [target.tokenIndex, target]),
    );

    return (
      <p className="subtitle-english-line dictation-line sentence-order-line">
        {tokens.map((token, tokenIndex) => {
          const target = targetMap.get(tokenIndex);

          if (target) {
            return renderSentenceOrderBlank(sentence, target);
          }

          return <span key={`${sentence.id}-order-token-${tokenIndex}`}>{token}</span>;
        })}
      </p>
    );
  }

  function renderSentenceOrderWordBank(sentence: ListeningSentence) {
    return (
      <div className="sentence-order-word-bank">
        {getSentenceOrderWordBank(sentence).map((target) => (
          <button
            className="sentence-order-chip"
            draggable
            key={`${sentence.id}-word-bank-${target.tokenIndex}`}
            type="button"
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              const payload: SentenceOrderAnswer = {
                token: target.token,
                tokenIndex: target.tokenIndex,
              };

              event.dataTransfer.setData("application/json", JSON.stringify(payload));
              event.dataTransfer.setData("text/plain", target.token);
            }}
          >
            {target.token}
          </button>
        ))}
      </div>
    );
  }

  function renderTranslation(sentence: ListeningSentence, className = "") {
    if (!sentence.chineseText) {
      return null;
    }

    return (
      <p className={`translation ${className}`.trim()}>
        {sentence.chineseText}
      </p>
    );
  }

  function renderTranscriptSentenceContent(sentence: ListeningSentence) {
    if (audioSettings.dictationMode === "sentence-order") {
      return (
        <>
          {renderSentenceOrderLine(sentence)}
          {renderTranslation(sentence, "primary-translation writing-mode-translation")}
          {renderSentenceOrderWordBank(sentence)}
        </>
      );
    }

    if (audioSettings.dictationMode === "translation-training") {
      return (
        <>
          {renderTranslation(sentence, "primary-translation writing-mode-translation")}
          {renderDictationSentence(sentence)}
        </>
      );
    }

    if (audioSettings.dictationMode !== "none") {
      return (
        <>
          {renderDictationSentence(sentence)}
          {audioSettings.subtitleMode !== "english"
            ? renderTranslation(
                sentence,
                audioSettings.subtitleMode === "chinese" ? "primary-translation" : "",
              )
            : null}
        </>
      );
    }

    return (
      <>
        {audioSettings.subtitleMode !== "chinese"
          ? renderEnglishSubtitle(sentence, { onWordClick: playSentenceAudioClip })
          : null}
        {audioSettings.subtitleMode !== "english"
          ? renderTranslation(
              sentence,
              audioSettings.subtitleMode === "chinese" ? "primary-translation" : "",
            )
          : null}
      </>
    );
  }

  function renderEnglishSubtitle(
    sentence: ListeningSentence,
    options: { onWordClick?: (sentence: ListeningSentence) => void } = {},
  ) {
    const tokens = splitEnglishTokens(sentence.englishText);
    const onWordClick = options.onWordClick ?? handleSubtitleClick;
    const wordCount = tokens.filter(isWordToken).length;
    const activeWordIndex =
      activeSentenceNo === sentence.sentenceNo &&
      sentence.startMs != null &&
      sentence.endMs != null &&
      sentence.endMs > sentence.startMs &&
      wordCount > 0
        ? Math.min(
            wordCount - 1,
            Math.max(
              0,
              Math.floor(
                ((fullAudioPositionMs - sentence.startMs) / (sentence.endMs - sentence.startMs)) *
                  wordCount,
              ),
            ),
          )
        : -1;
    let wordIndex = -1;

    return (
      <p className="subtitle-english-line">
        {tokens.map((token, tokenIndex) => {
          if (!isWordToken(token)) {
            return <span key={`${sentence.id}-token-${tokenIndex}`}>{token}</span>;
          }

          wordIndex += 1;
          const normalizedWord = normalizeWord(token);

          return (
            <span
              className={`subtitle-word ${wordIndex === activeWordIndex ? "current-word" : ""}`}
              key={`${sentence.id}-word-${tokenIndex}`}
              tabIndex={0}
              onBlur={() => {
                scheduleHideWordTooltip();
              }}
              onClick={(event) => {
                event.stopPropagation();
                onWordClick(sentence);
              }}
              onFocus={(event) => scheduleWordTooltip(token, event.currentTarget.getBoundingClientRect())}
            >
              {token}
            </span>
          );
        })}
      </p>
    );
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
      clearSelectionHideTimer();
      return;
    }

    setAnnotations((current) => [
      {
        id: Date.now(),
        kind,
        text: selectedText,
        note: "",
      },
      ...current,
    ]);
    setSelectedText("");
    setSelectionActionPosition(null);
    selectedRangeRef.current = null;
    clearSelectionHideTimer();
    setIsNotesOpen(true);
  }

  function clearAllInlineHighlights() {
    document.querySelectorAll("mark.inline-user-highlight").forEach((highlight) => {
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

  function handleFullAudioEnded() {
    if (mode !== "mock") {
      return;
    }

    if (section.sectionNo !== 4) {
      return;
    }

    setCheckSecondsLeft(120);
  }

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    setAnswers(initialSubmitted ? readReviewAnswers(section.id) : {});
    setSubmitted(initialSubmitted);
    setSeconds(mode === "practice" ? 0 : getListeningCountdownSeconds(section));
    setAudioSettings(DEFAULT_AUDIO_PLAYER_SETTINGS);
    setIsNotesOpen(false);
    setIsPracticeTimerRunning(false);
    setSelectedText("");
    setAnnotations([]);
    setMockStarted(mode === "practice");
    setIsFullAudioPlaying(false);
    setFullAudioPositionMs(0);
    setSentenceAutoPlaySignals({});
    setDictationAnswers({});
    setSentenceOrderAnswers({});
    setActiveWordTooltip(null);
    setSelectionActionPosition(null);
    setSeekRequest(null);
    setStopAtSeconds(null);
    setCheckSecondsLeft(null);
    selectedRangeRef.current = null;

    const resetScroll = () => {
      window.scrollTo(0, 0);
      subtitleListRef.current?.scrollTo({ top: 0 });
    };
    const animationFrameId = window.requestAnimationFrame(resetScroll);
    const timeoutId = window.setTimeout(resetScroll, 50);

    resetScroll();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(timeoutId);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [initialSubmitted, mode, section.id, section.timeLimitSeconds]);

  useEffect(() => {
    if (mode === "practice" && !isPracticeTimerRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setSeconds((current) =>
        mode === "practice" ? current + 1 : current > 0 ? current - 1 : 0,
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPracticeTimerRunning, mode]);

  useEffect(() => {
    document.documentElement.classList.toggle("ielts-fullscreen-active", isFullscreen);

    return () => {
      document.documentElement.classList.remove("ielts-fullscreen-active");
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!selectedText || !selectionActionPosition) return;

    scheduleHideSelectionAction();

    return clearSelectionHideTimer;
  }, [selectedText, selectionActionPosition]);

  useEffect(() => {
    setNotePanelPosition({
      left: Math.max(16, window.innerWidth - 370),
      top: 154,
    });
  }, []);

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
    if (mode !== "practice") {
      return;
    }

    setFavoriteSentenceIds(readFavoriteSentences().map((item) => item.id));
    setFavoriteWordIds(readFavoriteWords().map((item) => item.id));
  }, [mode]);

  useEffect(() => {
    if (mode !== "practice" || !questionSurfaceRef.current) {
      setQuestionSurfaceHeight(null);
      return;
    }

    const questionSurface = questionSurfaceRef.current;
    const updateQuestionSurfaceHeight = () => {
      setQuestionSurfaceHeight(Math.ceil(questionSurface.getBoundingClientRect().height));
    };
    const observer = new ResizeObserver(updateQuestionSurfaceHeight);

    updateQuestionSurfaceHeight();
    observer.observe(questionSurface);
    window.addEventListener("resize", updateQuestionSurfaceHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateQuestionSurfaceHeight);
    };
  }, [mode, section.id, submitted]);

  useEffect(() => {
    if (!submitted) {
      setActiveWordTooltip(null);
    }
  }, [submitted]);

  useEffect(() => {
    setDictationAnswers({});
    setSentenceOrderAnswers({});
  }, [audioSettings.dictationMode]);

  useEffect(() => {
    return () => {
      clearHoverWordTimer();
      clearHideWordTimer();
      clearSelectionHideTimer();
    };
  }, []);

  useEffect(() => {
    if (mode !== "practice" || activeSentenceNo == null) {
      return;
    }

    document
      .getElementById(`practice-subtitle-${activeSentenceNo}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSentenceNo, mode]);

  useEffect(() => {
    if (checkSecondsLeft == null) {
      return;
    }

    if (checkSecondsLeft <= 0) {
      submitListeningAnswers();
      setCheckSecondsLeft(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setCheckSecondsLeft((current) => (current == null ? null : current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [checkSecondsLeft]);

  const result = useMemo(() => {
    if (!submitted) {
      return null;
    }

    const correctCount = section.questions.reduce((count, question) => {
      const userAnswer = normalizeAnswer(answers[question.id] ?? "");
      const acceptedAnswers = question.answers.map(normalizeAnswer);
      return acceptedAnswers.includes(userAnswer) ? count + 1 : count;
    }, 0);

    return {
      correctCount,
      total: section.questions.length,
    };
  }, [answers, section.questions, submitted]);
  const isUrgent = mode === "mock" && seconds <= 600;
  const isCritical = mode === "mock" && seconds <= 300;

  const partNavigation = (
    <nav className="exam-bottom-nav" aria-label="Listening parts and questions">
      {IELTS_LISTENING_PARTS.map((partNo) => {
        const localQuestionNumbers = getQuestionRangeForPart(partNo);
        const partLink = section.partLinks.find((item) => item.sectionNo === partNo);
        const answeredCount = localQuestionNumbers.filter((localQuestionNo) => {
          const question = getQuestionForPart(
            section.questions,
            section.sectionNo,
            partNo,
            localQuestionNo,
          );
          return question ? Boolean(answers[question.id]?.trim()) : false;
        }).length;
        const partLabel = <span>Part {partNo}</span>;

        return (
          <div
            className={`exam-part-nav ${partNo === section.sectionNo ? "active" : ""} ${
              !partLink ? "disabled" : ""
            } ${partNo === section.sectionNo ? "current-part" : "compact-part"}`}
            key={partNo}
          >
            {partLink && partNo !== section.sectionNo ? (
              <Link href={`/listening/${partLink.id}?mode=${mode}`}>{partLabel}</Link>
            ) : (
              partLabel
            )}
            {partNo === section.sectionNo ? (
              <div className="exam-question-dots">
                {localQuestionNumbers.map((localQuestionNo) => {
                  const displayQuestionNo = getAbsoluteQuestionNo(partNo, localQuestionNo);
                  const question = getQuestionForPart(
                    section.questions,
                    section.sectionNo,
                    partNo,
                    localQuestionNo,
                  );
                  const isAnswered = question ? Boolean(answers[question.id]?.trim()) : false;
                  const canNavigateWithinCurrentPart = Boolean(question && partNo === section.sectionNo);

                  return (
                    <button
                      className={`exam-question-dot ${isAnswered ? "answered" : ""}`}
                      disabled={!canNavigateWithinCurrentPart}
                      key={displayQuestionNo}
                      type="button"
                      onClick={() => {
                        document
                          .getElementById(`question-${question?.questionNo}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                    >
                      {displayQuestionNo}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {partNo !== section.sectionNo ? (
              <span className="exam-part-score">{answeredCount}/10</span>
            ) : null}
          </div>
        );
      })}
    </nav>
  );

  return (
    <section
      className={`stack listening-exam-page ${mode} ${submitted ? "submitted" : "answering"} ${
        isFullscreen ? "fullscreen" : ""
      }`}
      data-local-selection-actions="true"
      ref={pageRef}
      onMouseUp={handleQuestionSelection}
      onMouseLeave={() => setActiveWordTooltip(null)}
      onMouseMove={handleEnglishWordHover}
    >
      <div className={`listening-exam-toolbar ${mode}`}>
        <div className="exam-part-intro">
          <strong>
            {mode === "mock"
              ? `Part ${section.sectionNo}`
              : practiceTitle}
          </strong>
          {mode === "mock" ? (
            <span>
              Listen and answer questions {(section.sectionNo - 1) * 10 + 1}-{section.sectionNo * 10}.
            </span>
          ) : null}
          {mode === "mock" && isFullAudioPlaying ? (
            <span className="audio-playing-status">Audio is Playing</span>
          ) : null}
          {checkSecondsLeft != null ? (
            <small>检查答案倒计时：{Math.floor(checkSecondsLeft / 60)}:{String(checkSecondsLeft % 60).padStart(2, "0")}</small>
          ) : null}
        </div>

        {mode === "practice" ? (
          <button
            aria-label={isPracticeTimerRunning ? "暂停听力练习计时" : "开始听力练习计时"}
            aria-pressed={isPracticeTimerRunning}
            className={`bbc-reading-timer listening-practice-timer ${
              isPracticeTimerRunning ? "active" : ""
            }`}
            onClick={() => setIsPracticeTimerRunning((current) => !current)}
            title={isPracticeTimerRunning ? "点击暂停计时" : "点击开始计时"}
            type="button"
          >
            <span>{formatExamCountdown(seconds)}</span>
            <MouseClickIcon />
          </button>
        ) : null}

        <div className="exam-toolbar-actions">
          {mode === "practice" && submitted ? (
            <AudioSettingsMenus
              className="toolbar-audio-settings"
              settings={audioSettings}
              showRate={false}
              variant="basic"
              onChange={updateAudioSettings}
            />
          ) : null}
          {mode === "mock" ? (
            section.fullAudioUrl ? (
              <AudioPlayer
                autoPlaySignal={autoPlaySignal}
                controls="hidden"
                onEnded={handleFullAudioEnded}
                onPlayingChange={setIsFullAudioPlaying}
                src={section.fullAudioUrl}
                title="Part audio"
              />
            ) : (
              <div className="notice">还没有上传音频。</div>
            )
          ) : null}
          {mode === "mock" ? (
            <div
              className={`ielts-exam-timer listening-timer ${isUrgent ? "urgent" : ""} ${
                isCritical ? "critical" : ""
              }`}
              aria-label="雅思听力倒计时"
              role="timer"
            >
              <strong>{formatExamCountdown(seconds)}</strong>
            </div>
          ) : null}
          <button
            className={`annotation-toggle ielts-exam-action ielts-fullscreen-toggle listening-fullscreen-toggle ${
              isFullscreen ? "active" : ""
            }`}
            type="button"
            onClick={toggleListeningFullscreen}
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

      <div
        className={`exam-workspace ${mode} ${submitted ? "submitted" : "answering"} ${
          isNotesOpen ? "notes-open" : ""
        }`}
        style={
          questionSurfaceHeight
            ? ({ "--practice-panel-height": `${questionSurfaceHeight}px` } as CSSProperties)
            : undefined
        }
      >
        {selectedText && !submitted && !activeWordTooltip && selectionActionPosition ? (
          <div
            className={`selection-action-popover global-selection-popover ${
              selectionActionPosition.placement === "above" ? "above" : ""
            }`}
            onPointerEnter={clearSelectionHideTimer}
            onPointerLeave={scheduleHideSelectionAction}
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
        {mode === "practice" && submitted ? (
          <aside className="practice-audio-study-panel">
            <section
              className="practice-listening-card"
              onMouseUp={handleQuestionSelection}
              onWheel={handleSubtitlePanelWheel}
            >
              {section.fullAudioUrl ? (
                <AudioPlayer
                  onEnded={handleFullAudioEnded}
                  loopSegment={activeLoopSegment}
                  onPlayingChange={setIsFullAudioPlaying}
                  onStopAtEnd={handleSentenceStopAtEnd}
                  onTimeChange={(seconds) => setFullAudioPositionMs(Math.round(seconds * 1000))}
                  settings={audioSettings}
                  settingsPlacement="none"
                  seekRequest={seekRequest}
                  showRate={false}
                  src={section.fullAudioUrl}
                  stopAtSeconds={stopAtSeconds}
                  title="Part audio"
                />
              ) : (
                <div className="notice">还没有上传音频。</div>
              )}

              {section.transcriptSentences.length === 0 ? (
                <p className="muted">还没有逐句原文。导入 transcript_sentences 后会显示中英字幕。</p>
              ) : (
                <div className="practice-subtitle-list" ref={subtitleListRef}>
                  {section.transcriptSentences.map((sentence) => (
                    <article
                      className={`practice-subtitle-line ${
                        activeSentenceNo === sentence.sentenceNo ? "active" : ""
                      }`}
                      id={`practice-subtitle-${sentence.sentenceNo}`}
                      key={sentence.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSubtitleClick(sentence)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          playSentenceSegment(sentence);
                        }
                      }}
                    >
                      <div className="practice-subtitle-line-head">
                        <span>#{sentence.sentenceNo}</span>
                        <div className="favorite-share-actions">
                          <button
                            aria-label={`收藏第 ${sentence.sentenceNo} 句`}
                            className={`favorite-star ${
                              favoriteSentenceIds.includes(favoriteSentenceId(sentence)) ? "active" : ""
                            }`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavoriteSentence(sentence);
                            }}
                          >
                            {favoriteSentenceIds.includes(favoriteSentenceId(sentence)) ? "★" : "☆"}
                          </button>
                          <ContentShareButton
                            label={`分享第 ${sentence.sentenceNo} 句`}
                            text={`${sentence.englishText}\n${sentence.chineseText ?? ""}`.trim()}
                            title={`${practiceTitle} 第 ${sentence.sentenceNo} 句`}
                            url={`/listening/${section.id}?mode=practice#practice-subtitle-${sentence.sentenceNo}`}
                          />
                        </div>
                      </div>
                      <div>
                        {audioSettings.subtitleMode !== "chinese" ? renderEnglishSubtitle(sentence) : null}
                        {audioSettings.subtitleMode !== "english" && sentence.chineseText ? (
                          <small
                            className={
                              audioSettings.subtitleMode === "chinese" ? "primary-translation" : ""
                            }
                          >
                            {sentence.chineseText}
                          </small>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        ) : null}

        <div
          className="practice-main exam-question-surface"
          ref={questionSurfaceRef}
          onMouseUp={handleQuestionSelection}
        >
          {mode === "practice" && !submitted ? (
            <section className="pre-submit-audio-panel">
              {section.fullAudioUrl ? (
                <AudioPlayer
                  loopSegment={activeLoopSegment}
                  onEnded={handleFullAudioEnded}
                  onPlayingChange={setIsFullAudioPlaying}
                  onSettingsChange={updateAudioSettings}
                  onStopAtEnd={handleSentenceStopAtEnd}
                  onTimeChange={(seconds) => setFullAudioPositionMs(Math.round(seconds * 1000))}
                  seekRequest={seekRequest}
                  settings={audioSettings}
                  settingsPlacement="none"
                  showRate={false}
                  src={section.fullAudioUrl}
                  stopAtSeconds={stopAtSeconds}
                  title="Part audio"
                />
              ) : (
                <div className="notice">还没有上传音频。</div>
              )}
            </section>
          ) : null}

          {mode === "mock" && !mockStarted ? (
            <div className="mock-start-overlay">
              <div className="headphone-icon" aria-hidden="true">◖◗</div>
              <p>
                You will be listening to an audio clip during this test. You will not be permitted to
                pause or rewind the audio while answering the questions.
              </p>
              <p>To continue, click Play.</p>
              <button className="mock-play-button" type="button" onClick={startMockAudio}>
                ▶ Play
              </button>
            </div>
          ) : null}
          {!shouldUsePaperLayout && questionImageUrls.length > 0 ? (
            <div className="question-image-stack">
              {questionImageUrls.map((questionImageUrl, index) => (
                <img
                  className="question-image"
                  key={questionImageUrl}
                  src={questionImageUrl}
                  alt={`听力题目第 ${index + 1} 页`}
                />
              ))}
            </div>
          ) : null}

          <form
            className="question-list"
            onSubmit={(event) => {
              event.preventDefault();
              submitListeningAnswers();
            }}
          >
            {section.questions.length === 0 ? (
              <div className="empty-state">
                <h2>这套 Section 还没有结构化题目。</h2>
                <p>下一步在后台或 Supabase 里导入 questions 和 question_answers 后，这里会自动变成可作答题目。</p>
              </div>
            ) : shouldUsePaperLayout ? (
              <CambridgeFourTestOneSheet
                answers={answers}
                onAnswerChange={updateAnswer}
                questions={section.questions}
                sectionNo={section.sectionNo}
                submitted={submitted}
              />
            ) : (
              section.questions.map((question) => {
                const userAnswer = answers[question.id] ?? "";
                const isCorrect = submitted && isAcceptedAnswer(userAnswer, question.answers);
                const correctAnswer = question.answers[0] ?? "未录入";
                const choicePrompt = parseChoicePrompt(question.promptText);
                const shouldRenderChoice =
                  isChoiceQuestion(question.questionType) && choicePrompt.options.length > 0;

                return (
                  <article
                    className={`question-card ${submitted ? (isCorrect ? "correct" : "wrong") : ""}`}
                    id={`question-${question.questionNo}`}
                    key={question.id}
                  >
                    <span className="question-number">Q{question.questionNo}</span>
                    <span className="question-prompt">
                      {(shouldRenderChoice ? choicePrompt.stem : question.promptText) ||
                        "后台还没有录入题干文本。"}
                    </span>
                    {shouldRenderChoice ? (
                      <div className="choice-options">
                        {choicePrompt.options.map((option) => {
                          const isSelected = userAnswer === option.letter;
                          const isCorrectOption =
                            isAcceptedAnswer(option.letter, question.answers) ||
                            isAcceptedAnswer(option.text, question.answers);
                          const isWrongSelection = submitted && isSelected && !isCorrectOption;

                          return (
                            <label
                              className={`choice-option ${
                                submitted && isCorrectOption ? "correct-option" : ""
                              } ${isWrongSelection ? "wrong-option" : ""}`}
                              key={option.letter}
                            >
                              <span className="choice-status-icon">
                                {submitted && isCorrectOption ? "✅" : null}
                                {isWrongSelection ? "❌" : null}
                              </span>
                              <span
                                className={`choice-dot ${
                                  isSelected || (submitted && isCorrectOption) ? "selected" : ""
                                }`}
                              />
                              <input
                                checked={isSelected}
                                disabled={submitted}
                                name={`question-${question.id}`}
                                type="radio"
                                value={option.letter}
                                onChange={() => updateAnswer(question.id, option.letter)}
                              />
                              <span className="choice-letter">{option.letter}</span>
                              <span>{option.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : submitted ? (
                      <div className={`fill-result-box ${isCorrect ? "correct" : "wrong"}`}>
                        <span className="fill-result-icon">{isCorrect ? "✅" : "❌"}</span>
                        {isCorrect ? (
                          <span>{userAnswer || correctAnswer}</span>
                        ) : (
                          <>
                            <span className="wrong-user-answer">{userAnswer || "未作答"}</span>
                            <span className="correct-answer">✅ {correctAnswer}</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <input
                        value={userAnswer}
                        onChange={(event) => updateAnswer(question.id, event.target.value)}
                        placeholder="输入你的答案"
                      />
                    )}
                  </article>
                );
              })
            )}

            <div className="submit-row">
              <button
                className="button primary"
                type="submit"
              >
                提交
              </button>
              {result ? (
                <strong className="score-pill">
                  {result.correctCount}/{result.total} 正确
                </strong>
              ) : null}
            </div>
          </form>
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
                <span>Select text to highlight or create a note.</span>
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
      </div>

      {submitted ? <div className="submitted-review-nav">{partNavigation}</div> : null}

      {submitted ? (
        <section className="transcript-panel">
          <div className="section-title-row">
            <div>
              <div className="eyebrow">Transcript</div>
              <h2>听力原文</h2>
            </div>
          </div>

          {section.transcriptSentences.length === 0 ? (
            <p className="muted">还没有逐句原文。导入 transcript_sentences 后会显示英文、中文和单句音频。</p>
          ) : (
            <div className="sentence-list">
              {section.transcriptSentences.map((sentence) => (
                <article
                  className="sentence-card"
                  id={`transcript-sentence-${sentence.sentenceNo}`}
                  key={sentence.id}
                >
                  <div className="sentence-meta">
                    <div className="sentence-meta-copy">
                      <span>#{sentence.sentenceNo}</span>
                      {sentence.speaker ? <span>{sentence.speaker}</span> : null}
                    </div>
                    <div className="favorite-share-actions">
                      <button
                        aria-label={`收藏第 ${sentence.sentenceNo} 句`}
                        className={`favorite-star ${
                          favoriteSentenceIds.includes(favoriteSentenceId(sentence)) ? "active" : ""
                        }`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavoriteSentence(sentence);
                        }}
                      >
                        {favoriteSentenceIds.includes(favoriteSentenceId(sentence)) ? "★" : "☆"}
                      </button>
                      <ContentShareButton
                        label={`分享第 ${sentence.sentenceNo} 句`}
                        text={`${sentence.englishText}\n${sentence.chineseText ?? ""}`.trim()}
                        title={`${practiceTitle} 第 ${sentence.sentenceNo} 句`}
                        url={`/listening/${section.id}?mode=practice#transcript-sentence-${sentence.sentenceNo}`}
                      />
                    </div>
                  </div>
                  <div className="sentence-copy">{renderTranscriptSentenceContent(sentence)}</div>
                  {sentence.audioUrl ? (
                    <AudioPlayer
                      autoPlaySignal={sentenceAutoPlaySignals[sentence.id] ?? 0}
                      html5={false}
                      onEnded={() => handleSentenceAudioEnded(sentence)}
                      onSettingsChange={updateAudioSettings}
                      settings={audioSettings}
                      showRate={false}
                      src={sentence.audioUrl}
                      title="单句音频"
                    />
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!submitted ? partNavigation : null}
      {activeWordTooltip ? (
        <div
          className={`word-tooltip-floating ${
            activeWordTooltip.placement === "above" ? "above" : ""
          }`}
          style={{
            left: activeWordTooltip.left,
            top: activeWordTooltip.top,
            width: activeWordTooltip.width,
          }}
          onClick={(event) => event.stopPropagation()}
          onMouseEnter={() => {
            clearHoverWordTimer();
            clearHideWordTimer();
          }}
          onMouseLeave={() => scheduleHideWordTooltip(1500)}
        >
          <div className="word-tooltip-title-row">
            <strong>{activeWordTooltip.word}</strong>
            <div className="word-tooltip-favorite-share-actions favorite-share-actions">
              <button
                aria-label={`收藏 ${activeWordTooltip.word}`}
                className={`word-favorite-star ${
                  favoriteWordIds.includes(activeWordTooltip.word) ? "active" : ""
                }`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavoriteWord(activeWordTooltip.word);
                }}
              >
                {favoriteWordIds.includes(activeWordTooltip.word) ? "★" : "☆"}
              </button>
              <ContentShareButton
                label={`分享 ${activeWordTooltip.word}`}
                text={`${activeWordTooltip.word}：${cleanVocabularyDefinition(activeWordTooltip.hint.definitionCn)}`}
                title={`${activeWordTooltip.word} 词汇`}
                url={`/vocabulary/${encodeURIComponent(activeWordTooltip.word)}`}
              />
            </div>
          </div>
          {activeWordTooltip.hint.phonetic ? <span>{activeWordTooltip.hint.phonetic}</span> : null}
          {cleanPartOfSpeech(activeWordTooltip.hint.partOfSpeech) ? (
            <span>{cleanPartOfSpeech(activeWordTooltip.hint.partOfSpeech)}</span>
          ) : null}
          {activeWordTooltip.hint.level ? <span>等级：{activeWordTooltip.hint.level}</span> : null}
          <small>{cleanVocabularyDefinition(activeWordTooltip.hint.definitionCn)}</small>
          {activeWordTooltip.hint.formation ? (
            <small>{activeWordTooltip.hint.formation}</small>
          ) : null}
          {submitted && selectedText ? (
            <div className="word-tooltip-actions">
              <button type="button" onClick={() => addAnnotation("note")}>Note</button>
              <button type="button" onClick={() => addAnnotation("highlight")}>Highlight</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
