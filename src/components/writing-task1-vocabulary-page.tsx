"use client";

import Link from "next/link";
import {
  type DragEvent as ReactDragEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { WritingVocabularyTerm } from "@/components/writing-vocabulary-term";
import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import {
  type WritingTask1VocabularyCategory,
  type WritingTask1VocabularyEntry,
} from "@/lib/ielts/writing-task1-vocabulary";

type VocabularyTrainingMode = "sentence-order" | "translation-training";

const trainingModeCopy = {
  "sentence-order": "语序排列",
  "translation-training": "翻译训练",
} satisfies Record<VocabularyTrainingMode, string>;

type ReviewSegment = {
  isWrong: boolean;
  key: string;
  text: string;
};

type SentenceOrderAnswer = {
  token: string;
  tokenIndex: number;
};

type SentenceOrderTarget = {
  leading: string;
  normalizedToken: string;
  token: string;
  tokenIndex: number;
  trailing: string;
};

type SentenceOrderPart =
  | {
      kind: "text";
      key: string;
      text: string;
    }
  | {
      kind: "target";
      key: string;
      target: SentenceOrderTarget;
    };

function normalizeTerm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stableHash(value: string) {
  return [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 9973, 7);
}

function cleanOrderToken(token: string) {
  return token.replace(/^[,.;:!?()[\]{}"“”‘’]+|[,.;:!?()[\]{}"“”‘’]+$/g, "");
}

function formatIndex(index: number) {
  return `（${String(index + 1).padStart(2, "0")}）`;
}

function formatCategoryIndex(index: number) {
  return String(index + 1);
}

function normalizeReviewToken(value: string) {
  return cleanOrderToken(value)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .trim();
}

function splitSentenceOrderParts(text: string) {
  const segments = text.match(/\s+|[^\s]+/g) ?? [text];
  let tokenIndex = 0;

  return segments.map((segment, segmentIndex): SentenceOrderPart => {
    if (/^\s+$/.test(segment)) {
      return {
        kind: "text",
        key: `space-${segmentIndex}`,
        text: segment,
      };
    }

    const match = segment.match(/^([,.;:!?()[\]{}"“”‘’]*)(.*?)([,.;:!?()[\]{}"“”‘’]*)$/);
    const leading = match?.[1] ?? "";
    const token = match?.[2] ?? segment;
    const trailing = match?.[3] ?? "";

    if (!token.trim()) {
      return {
        kind: "text",
        key: `punctuation-${segmentIndex}`,
        text: segment,
      };
    }

    const target: SentenceOrderTarget = {
      leading,
      normalizedToken: normalizeReviewToken(token),
      token,
      tokenIndex,
      trailing,
    };
    tokenIndex += 1;

    return {
      kind: "target",
      key: `target-${segmentIndex}`,
      target,
    };
  });
}

function getSentenceOrderTargets(entry: WritingTask1VocabularyEntry) {
  return splitSentenceOrderParts(entry.exampleEn)
    .flatMap((part) => (part.kind === "target" ? [part.target] : []));
}

function getSentenceOrderWordBank(entry: WritingTask1VocabularyEntry) {
  return getSentenceOrderTargets(entry)
    .sort((left, right) => {
      const leftHash = stableHash(`${entry.id}:${left.tokenIndex}:${left.token.toLowerCase()}`);
      const rightHash = stableHash(`${entry.id}:${right.tokenIndex}:${right.token.toLowerCase()}`);
      return leftHash === rightHash ? left.tokenIndex - right.tokenIndex : leftHash - rightHash;
    });
}

function getReviewSegments(answer: string, source: string) {
  const rawSegments = answer.match(/\s+|[^\s]+/g) ?? [];
  const answerTokens = rawSegments
    .map((text, segmentIndex) => ({
      normalized: normalizeReviewToken(text),
      segmentIndex,
      text,
    }))
    .filter((token) => token.normalized);
  const sourceTokens = (source.match(/[^\s]+/g) ?? [])
    .map((text) => normalizeReviewToken(text))
    .filter(Boolean);
  const distances = Array.from({ length: answerTokens.length + 1 }, () =>
    Array.from({ length: sourceTokens.length + 1 }, () => 0),
  );

  for (let answerIndex = answerTokens.length - 1; answerIndex >= 0; answerIndex -= 1) {
    distances[answerIndex][sourceTokens.length] = answerTokens.length - answerIndex;
  }

  for (let sourceIndex = sourceTokens.length - 1; sourceIndex >= 0; sourceIndex -= 1) {
    distances[answerTokens.length][sourceIndex] = sourceTokens.length - sourceIndex;
  }

  for (let answerIndex = answerTokens.length - 1; answerIndex >= 0; answerIndex -= 1) {
    for (let sourceIndex = sourceTokens.length - 1; sourceIndex >= 0; sourceIndex -= 1) {
      if (answerTokens[answerIndex].normalized === sourceTokens[sourceIndex]) {
        distances[answerIndex][sourceIndex] = distances[answerIndex + 1][sourceIndex + 1];
      } else {
        distances[answerIndex][sourceIndex] =
          1 + Math.min(
            distances[answerIndex + 1][sourceIndex + 1],
            distances[answerIndex + 1][sourceIndex],
            distances[answerIndex][sourceIndex + 1],
          );
      }
    }
  }

  const wrongSegmentIndexes = new Set<number>();
  let answerIndex = 0;
  let sourceIndex = 0;

  while (answerIndex < answerTokens.length) {
    if (
      sourceIndex < sourceTokens.length &&
      answerTokens[answerIndex].normalized === sourceTokens[sourceIndex]
    ) {
      answerIndex += 1;
      sourceIndex += 1;
      continue;
    }

    const substituteCost =
      sourceIndex < sourceTokens.length
        ? distances[answerIndex + 1][sourceIndex + 1]
        : Number.POSITIVE_INFINITY;
    const deleteCost = distances[answerIndex + 1][sourceIndex];
    const insertCost =
      sourceIndex < sourceTokens.length
        ? distances[answerIndex][sourceIndex + 1]
        : Number.POSITIVE_INFINITY;

    if (substituteCost <= deleteCost && substituteCost <= insertCost) {
      wrongSegmentIndexes.add(answerTokens[answerIndex].segmentIndex);
      answerIndex += 1;
      sourceIndex += 1;
    } else if (deleteCost <= insertCost) {
      wrongSegmentIndexes.add(answerTokens[answerIndex].segmentIndex);
      answerIndex += 1;
    } else {
      sourceIndex += 1;
    }
  }

  return rawSegments.map((text, segmentIndex): ReviewSegment => ({
    isWrong: wrongSegmentIndexes.has(segmentIndex),
    key: `${segmentIndex}-${text}`,
    text,
  }));
}

function VocabularyEntryCard({
  category,
  entry,
  index,
  mode,
  vocabularyMatchExpression,
  vocabularyMatchMap,
}: {
  category: WritingTask1VocabularyCategory;
  entry: WritingTask1VocabularyEntry;
  index: number;
  mode: VocabularyTrainingMode | null;
  vocabularyMatchExpression: RegExp;
  vocabularyMatchMap: Map<string, WritingTask1VocabularyEntry>;
}) {
  const sourceKey = `task1-vocabulary:${category.id}`;
  const sourceHref = `/writing/task1-vocabulary#${category.id}`;
  const sourceTitle = `IELTS WRITING · TASK 1 · ${category.labelEnglish}`;
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [translationDraft, setTranslationDraft] = useState("");
  const [sentenceOrderAnswers, setSentenceOrderAnswers] = useState<Record<number, SentenceOrderAnswer>>({});
  const isTrainingMode = mode === "sentence-order" || mode === "translation-training";
  const isExampleVisible = !isTrainingMode || (mode === "translation-training" && isAnswerVisible);
  const orderParts = mode === "sentence-order" ? splitSentenceOrderParts(entry.exampleEn) : [];
  const orderTokens = mode === "sentence-order" ? getSentenceOrderWordBank(entry) : [];
  const reviewSegments = isAnswerVisible ? getReviewSegments(translationDraft, entry.exampleEn) : [];

  useEffect(() => {
    setIsAnswerVisible(false);
    setTranslationDraft("");
    setSentenceOrderAnswers({});
  }, [mode]);

  function renderVocabularyText(text: string) {
    return text.split(vocabularyMatchExpression).map((part, partIndex) => {
      const match = vocabularyMatchMap.get(normalizeTerm(part));

      return match ? (
        <WritingVocabularyTerm
          item={match}
          key={`${entry.id}-example-${partIndex}`}
          sourceHref={sourceHref}
          sourceKey={sourceKey}
          sourceTitle={sourceTitle}
        >
          {part}
        </WritingVocabularyTerm>
      ) : part;
    });
  }

  function placeSentenceOrderAnswer(targetIndex: number, answer: SentenceOrderAnswer) {
    setSentenceOrderAnswers((current) => ({
      ...current,
      [targetIndex]: answer,
    }));
  }

  function clearSentenceOrderAnswer(targetIndex: number) {
    setSentenceOrderAnswers((current) => {
      const next = { ...current };
      delete next[targetIndex];
      return next;
    });
  }

  function handleSentenceOrderDrop(
    event: ReactDragEvent<HTMLSpanElement>,
    target: SentenceOrderTarget,
  ) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const payload = JSON.parse(event.dataTransfer.getData("application/json")) as SentenceOrderAnswer;

      if (payload.token) {
        placeSentenceOrderAnswer(target.tokenIndex, payload);
        return;
      }
    } catch {
      const fallbackToken = event.dataTransfer.getData("text/plain");

      if (fallbackToken) {
        placeSentenceOrderAnswer(target.tokenIndex, {
          token: fallbackToken,
          tokenIndex: -1,
        });
      }
    }
  }

  function renderSentenceOrderSlot(target: SentenceOrderTarget) {
    const placedAnswer = sentenceOrderAnswers[target.tokenIndex] ?? null;
    const isCorrect =
      Boolean(placedAnswer) &&
      normalizeReviewToken(placedAnswer?.token ?? "") === target.normalizedToken;
    const isWrong =
      Boolean(placedAnswer) && normalizeReviewToken(placedAnswer.token) !== target.normalizedToken;

    return (
      <span
        aria-label={`语序排列 ${target.token}`}
        className={`writing-vocab-order-slot ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
        onClick={() => clearSentenceOrderAnswer(target.tokenIndex)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleSentenceOrderDrop(event, target)}
        role="button"
        tabIndex={0}
      >
        {placedAnswer?.token ?? ""}
      </span>
    );
  }

  function renderSentenceOrderLine() {
    return (
      <p className="writing-vocab-order-line">
        {orderParts.map((part) => {
          if (part.kind === "text") {
            return <span key={part.key}>{part.text}</span>;
          }

          return (
            <span className="writing-vocab-order-piece" key={part.key}>
              {part.target.leading ? <span>{part.target.leading}</span> : null}
              {renderSentenceOrderSlot(part.target)}
              {part.target.trailing ? <span>{part.target.trailing}</span> : null}
            </span>
          );
        })}
      </p>
    );
  }

  return (
    <article className="writing-vocab-entry-card">
      <div className="writing-vocab-entry-head">
        <span>{formatIndex(index)}</span>
        <div className="writing-vocab-entry-title-row">
          <strong>
            <WritingVocabularyTerm
              item={entry}
              sourceHref={sourceHref}
              sourceKey={sourceKey}
              sourceTitle={sourceTitle}
            />
          </strong>
          <small>{entry.definitionCn}</small>
          <VocabularyInlinePronunciation
            ukAudioUrl={entry.ukAudioUrl}
            ukPhonetic={entry.ukPhonetic || entry.phonetic}
            usAudioUrl={entry.usAudioUrl}
            usPhonetic={entry.usPhonetic || entry.phonetic}
            word={entry.term}
          />
          {entry.level ? <em>{entry.level}</em> : null}
        </div>
      </div>
      {isExampleVisible ? (
        <p className="writing-vocab-example-en">{renderVocabularyText(entry.exampleEn)}</p>
      ) : null}
      <p className="writing-vocab-example-cn">{entry.exampleCn}</p>

      {mode === "sentence-order" ? (
        <div className="writing-vocab-order-practice">
          <div className="writing-vocab-order-bank">
            {orderTokens.map((token) => (
              <button
                draggable
                key={`${entry.id}-${token.tokenIndex}`}
                onClick={(event) => event.stopPropagation()}
                onDragStart={(event) => {
                  const payload: SentenceOrderAnswer = {
                    token: token.token,
                    tokenIndex: token.tokenIndex,
                  };

                  event.dataTransfer.setData("application/json", JSON.stringify(payload));
                  event.dataTransfer.setData("text/plain", token.token);
                }}
                type="button"
              >
                {token.token}
              </button>
            ))}
          </div>
          {renderSentenceOrderLine()}
        </div>
      ) : null}

      {mode === "translation-training" ? (
        <div className="writing-vocab-translation-box">
          {isAnswerVisible ? (
            <div className="writing-vocab-translation-review" aria-label={`${entry.term} translation review`}>
              {reviewSegments.length > 0 ? (
                reviewSegments.map((segment) =>
                  segment.isWrong ? (
                    <span className="wrong" key={segment.key}>{segment.text}</span>
                  ) : segment.text
                )
              ) : (
                <span className="wrong">Write the English sentence here...</span>
              )}
            </div>
          ) : (
            <textarea
              aria-label={`${entry.term} translation practice`}
              className="writing-vocab-translation-input"
              placeholder="Write the English sentence here..."
              value={translationDraft}
              onChange={(event) => setTranslationDraft(event.target.value)}
            />
          )}
          <button type="button" onClick={() => setIsAnswerVisible(true)}>SUBMIT</button>
        </div>
      ) : null}
    </article>
  );
}

export function WritingTask1VocabularyPage({
  categories,
}: {
  categories: WritingTask1VocabularyCategory[];
}) {
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>([]);
  const [modeByCategory, setModeByCategory] = useState<Record<string, VocabularyTrainingMode | null>>({});
  const vocabularyMatchItems = useMemo(
    () => categories.flatMap((category) => category.entries).sort((left, right) => right.term.length - left.term.length),
    [categories],
  );
  const vocabularyMatchMap = useMemo(
    () => new Map(vocabularyMatchItems.map((item) => [normalizeTerm(item.term), item])),
    [vocabularyMatchItems],
  );
  const vocabularyMatchExpression = useMemo(
    () =>
      new RegExp(
        `(?<![A-Za-z])(${vocabularyMatchItems.map((item) => escapeRegExp(item.term)).join("|")})(?![A-Za-z])`,
        "gi",
      ),
    [vocabularyMatchItems],
  );

  function toggleCategory(categoryId: string) {
    setOpenCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  function setCategoryMode(categoryId: string, mode: VocabularyTrainingMode) {
    setOpenCategoryIds((current) => (current.includes(categoryId) ? current : [...current, categoryId]));
    setModeByCategory((current) => ({
      ...current,
      [categoryId]: current[categoryId] === mode ? null : mode,
    }));
  }

  return (
    <section className="stack writing-practice-page writing-task1-vocab-page">
      <div className="writing-resource-panel writing-task1-vocab-panel">
        <div className="writing-task1-vocab-heading">
          <Link href="/writing">← IELTS WRITING</Link>
          <h1><span>TASK 1</span><small>必备词汇及翻译训练</small></h1>
        </div>

        <div className="writing-task1-vocab-accordion">
          {categories.map((category, categoryIndex) => {
            const isOpen = openCategoryIds.includes(category.id);
            const activeMode = modeByCategory[category.id] ?? null;

            return (
              <section className={`writing-vocab-category ${isOpen ? "open" : ""}`} id={category.id} key={category.id}>
                <div className="writing-vocab-category-head">
                  <button
                    aria-expanded={isOpen}
                    className="writing-vocab-category-toggle"
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span>{formatCategoryIndex(categoryIndex)}</span>
                    <strong>
                      {category.labelEnglish.toUpperCase()}
                      <small>{category.label}</small>
                    </strong>
                    <em>{category.entries.length}</em>
                    <i>{isOpen ? "▾" : "▸"}</i>
                  </button>
                  <div className="writing-vocab-mode-switch">
                    {(Object.keys(trainingModeCopy) as VocabularyTrainingMode[]).map((mode) => (
                      <button
                        className={activeMode === mode ? "active" : ""}
                        key={mode}
                        type="button"
                        onClick={() => setCategoryMode(category.id, mode)}
                      >
                        {trainingModeCopy[mode]}
                      </button>
                    ))}
                  </div>
                </div>

                {isOpen ? (
                  <div className="writing-vocab-entry-grid">
                    {category.entries.map((entry, entryIndex) => (
                      <VocabularyEntryCard
                        category={category}
                        entry={entry}
                        index={entryIndex}
                        key={entry.id}
                        mode={activeMode}
                        vocabularyMatchExpression={vocabularyMatchExpression}
                        vocabularyMatchMap={vocabularyMatchMap}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
