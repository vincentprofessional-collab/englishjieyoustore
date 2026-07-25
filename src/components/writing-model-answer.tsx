"use client";

import { useMemo } from "react";
import { WritingVocabularyTerm } from "@/components/writing-vocabulary-term";
import type { WritingQuestion, WritingVocabularyItem } from "@/lib/ielts/writing";
import { WRITING_TASK1_VOCABULARY_ITEMS } from "@/lib/ielts/writing-task1-vocabulary";

function normalizeTerm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countModelAnswerWords(paragraphs: string[]) {
  return paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

export function WritingModelAnswer({ question }: { question: WritingQuestion }) {
  const vocabulary = useMemo(() => {
    const vocabularyMap = new Map<string, WritingVocabularyItem>();

    WRITING_TASK1_VOCABULARY_ITEMS.forEach((item) => {
      vocabularyMap.set(normalizeTerm(item.term), item);
    });
    (question.modelAnswerVocabulary ?? []).forEach((item) => {
      vocabularyMap.set(normalizeTerm(item.term), item);
    });

    return [...vocabularyMap.values()].sort((a, b) => b.term.length - a.term.length);
  }, [question.modelAnswerVocabulary]);

  function renderParagraph(paragraph: string, paragraphIndex: number) {
    if (vocabulary.length === 0) {
      return paragraph;
    }

    const expression = new RegExp(
      `(?<![A-Za-z])(${vocabulary.map((item) => escapeRegExp(item.term)).join("|")})(?![A-Za-z])`,
      "gi",
    );

    return paragraph.split(expression).map((part, partIndex) => {
      const match = vocabulary.find((item) => normalizeTerm(item.term) === normalizeTerm(part));
      return match ? (
        <WritingVocabularyTerm
          item={match}
          key={`${paragraphIndex}-${partIndex}`}
          sourceHref={`/writing/practice/${question.id}#model-answer`}
          sourceKey={`model-answer:${question.id}`}
          sourceTitle="IELTS WRITING · MODEL ANSWER"
        >
          {part}
        </WritingVocabularyTerm>
      ) : part;
    });
  }

  if (!question.modelAnswer?.length) {
    return null;
  }

  const wordCount = countModelAnswerWords(question.modelAnswer);

  return (
    <section className="writing-model-answer-preview" id="model-answer">
      <div className="writing-model-answer-head">
        <strong className="writing-model-answer-heading">MODEL ANSWER</strong>
        <span className="writing-model-answer-count">{wordCount} words</span>
      </div>
      <div className="writing-model-answer-text">
        {question.modelAnswer.map((paragraph, index) => (
          <p key={`${question.id}-model-paragraph-${index}`}>
            {renderParagraph(paragraph, index)}
          </p>
        ))}
      </div>
    </section>
  );
}
