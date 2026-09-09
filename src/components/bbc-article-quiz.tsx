"use client";

import { useState, type DragEvent, type FormEvent, type PointerEvent } from "react";

import quizCatalog from "@/data/bbc/quiz-index.json";
import { syncWrongBbcQuizFavorite } from "@/lib/bbc-quiz-favorites";

import styles from "./bbc-article-quiz.module.css";

type Question = {
  answer: string;
  isSummary?: boolean;
  number: number;
  options?: string[];
  prompt: string;
  type?: "matching";
};

type QuizRecord = {
  articleId: string;
  articleTitle: string;
  exercise: Question[];
  matching?: Question[];
  quiz: Question[];
  status: "ready" | "partial" | "review_required";
};

type QuestionKind = "matching" | "quiz" | "exercise";

function optionLabel(question: Question) {
  const index = question.options?.indexOf(question.answer) ?? -1;
  return index >= 0 ? `${String.fromCharCode(65 + index)}. ${question.answer}` : question.answer;
}

function fourChoiceOptions(question: Question) {
  const options = [...new Set(question.options ?? [])];
  if (options.length <= 4) return options;

  const selected = options.slice(0, 4);
  if (question.answer && !selected.includes(question.answer)) selected[selected.length - 1] = question.answer;
  return selected;
}

function useQuestionSubmission({
  articleId,
  articleTitle,
  kind,
  question,
  value,
}: {
  articleId: string;
  articleTitle: string;
  kind: QuestionKind;
  question: Question;
  value: string;
}) {
  const [favoriteNotice, setFavoriteNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const hasReferenceAnswer = Boolean(question.answer);
  const correct = hasReferenceAnswer && value === question.answer;

  function updateValue() {
    setSubmitted(false);
    setFavoriteNotice("");
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitValue(value);
  }

  function submitValue(nextValue: string) {
    setSubmitted(true);
    if (!question.options?.length || !hasReferenceAnswer) return;
    const nextCorrect = nextValue === question.answer;

    const result = syncWrongBbcQuizFavorite({
      answer: question.answer,
      articleId,
      articleTitle,
      kind,
      options: question.options,
      prompt: question.prompt,
      questionNumber: question.number,
      userAnswer: nextValue,
    });
    if (!result.ok) setFavoriteNotice("收藏失败，请稍后重试");
    else if (!nextCorrect) setFavoriteNotice(result.status === "already-saved" ? "错题已在收藏夹" : "错题已自动收藏");
  }

  return { correct, favoriteNotice, submitAnswer, submitValue, submitted, updateValue };
}

function mergeSummaryPrompts(questions: Question[]) {
  let merged = questions[0]?.prompt ?? "";

  for (const question of questions.slice(1)) {
    let overlap = 0;
    const maxOverlap = Math.min(merged.length, question.prompt.length);

    for (let length = 1; length <= maxOverlap; length += 1) {
      if (merged.slice(-length) === question.prompt.slice(0, length)) {
        overlap = length;
      }
    }

    merged += question.prompt.slice(overlap);
  }

  return merged;
}

function ChoiceQuestion({
  articleId,
  articleTitle,
  displayNumber,
  kind,
  question,
}: {
  articleId: string;
  articleTitle: string;
  displayNumber: number;
  kind: QuestionKind;
  question: Question;
}) {
  const [value, setValue] = useState("");
  const submission = useQuestionSubmission({ articleId, articleTitle, kind, question, value });
  const id = `bbc-article-quiz-${articleId}-${kind}-${question.number}`;

  function choose(next: string) {
    setValue(next);
    submission.submitValue(next);
  }

  return (
    <form className={styles.question} id={id} onSubmit={submission.submitAnswer} aria-labelledby={`${id}-prompt`}>
      <p id={`${id}-prompt`} className={styles.prompt} lang="en">
        <span className={styles.number}>{displayNumber}.</span>
        <span>{question.prompt}</span>
      </p>
      {question.options?.length ? (
        <div className={styles.choiceGrid} role="radiogroup" aria-labelledby={`${id}-prompt`}>
          {question.options.map((option, index) => {
            const selected = value === option;
            const state = submission.submitted
              ? option === question.answer
                ? styles.correctChoice
                : selected
                  ? styles.wrongChoice
                  : ""
              : "";
            return (
              <button
                aria-checked={selected}
                className={`${styles.choice} ${state}`}
                key={`${id}-${option}`}
                onClick={() => choose(option)}
                role="radio"
                type="button"
              >
                <span>{String.fromCharCode(65 + index)}.</span>
                <span lang="en">{option}</span>
                {submission.submitted && option === question.answer ? <span aria-label="正确">✓</span> : null}
                {submission.submitted && selected && option !== question.answer ? <span aria-label="错误">✗</span> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <textarea
          aria-labelledby={`${id}-prompt`}
          className={styles.textarea}
          onChange={(event) => {
            setValue(event.target.value);
            submission.updateValue();
          }}
          placeholder="请输入你的答案"
          rows={2}
          value={value}
        />
      )}
      {question.options?.length ? null : <QuestionActions disabled={!value.trim()} favoriteNotice={submission.favoriteNotice} submitted={submission.submitted} />}
      {submission.submitted && !question.options?.length ? <AnswerNotice correct={submission.correct} question={question} /> : null}
    </form>
  );
}

function MatchingQuestion({
  articleId,
  displayNumber,
  question,
  submitted,
  value,
  onChange,
}: {
  articleId: string;
  displayNumber: number;
  question: Question;
  submitted: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `bbc-article-quiz-${articleId}-matching-${question.number}`;

  return (
    <div className={styles.question} id={id} aria-labelledby={`${id}-prompt`}>
      <label className={styles.matchingRow} htmlFor={`${id}-select`}>
        <span id={`${id}-prompt`} className={styles.matchingPrompt}>{displayNumber}. {question.prompt}</span>
        <select
          aria-label={`${question.prompt} 配对选项`}
          className={styles.matchingSelect}
          id={`${id}-select`}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          value={value}
        >
          <option value="">请选择标题</option>
          {question.options?.map((option, index) => <option key={`${id}-${option}`} value={option}>{String.fromCharCode(65 + index)}. {option}</option>)}
        </select>
      </label>
      {submitted ? <AnswerNotice correct={value === question.answer} question={question} /> : null}
    </div>
  );
}

function MatchingQuestionGroup({
  articleId,
  articleTitle,
  questions,
}: {
  articleId: string;
  articleTitle: string;
  questions: Question[];
}) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [favoriteNotice, setFavoriteNotice] = useState("");
  const allFilled = questions.every((question) => values[question.number]);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    let failed = false;

    for (const question of questions) {
      if (!question.options?.length || !question.answer) continue;
      const result = syncWrongBbcQuizFavorite({
        answer: question.answer,
        articleId,
        articleTitle,
        kind: "matching",
        options: question.options,
        prompt: question.prompt,
        questionNumber: question.number,
        userAnswer: values[question.number] ?? "",
      });
      if (!result.ok) failed = true;
    }

    setFavoriteNotice(failed ? "收藏失败，请稍后重试" : "");
  }

  return (
    <form className={styles.matchingForm} onSubmit={submitAnswer}>
      {questions.map((question) => (
        <MatchingQuestion
          key={`matching-${question.number}`}
          articleId={articleId}
          displayNumber={question.number}
          onChange={(value) => {
            setValues((current) => ({ ...current, [question.number]: value }));
            setSubmitted(false);
            setFavoriteNotice("");
          }}
          question={question}
          submitted={submitted}
          value={values[question.number] ?? ""}
        />
      ))}
      <QuestionActions disabled={!allFilled} favoriteNotice={favoriteNotice} submitted={submitted} />
    </form>
  );
}

function SummaryFillBlankQuestion({
  articleId,
  articleTitle,
  questions,
}: {
  articleId: string;
  articleTitle: string;
  questions: Question[];
}) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [dragging, setDragging] = useState("");
  const [draggingSource, setDraggingSource] = useState<number | null>(null);
  const [hovering, setHovering] = useState<number | "bank" | null>(null);
  const [skipClick, setSkipClick] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [favoriteNotice, setFavoriteNotice] = useState("");
  const id = `bbc-article-quiz-${articleId}-exercise-summary`;
  const prompt = mergeSummaryPrompts(questions);
  const options = [...new Set(questions.flatMap((question) => question.options ?? []))];
  const allFilled = questions.every((question) => values[question.number]?.trim());
  const allCorrect = questions.every((question) => question.answer && values[question.number] === question.answer);

  function finishChange() {
    setDragging("");
    setDraggingSource(null);
    setHovering(null);
    setSubmitted(false);
    setFavoriteNotice("");
  }

  function placeFromBank(word: string, number?: number) {
    if (!word) return;
    const targetNumber = number ?? questions.find((question) => !values[question.number])?.number ?? questions[0]?.number;
    if (!targetNumber) return;
    setValues((current) => ({ ...current, [targetNumber]: word }));
    finishChange();
  }

  function clearBlank(number: number) {
    if (!values[number]) return;
    setValues((current) => {
      const next = { ...current };
      delete next[number];
      return next;
    });
    finishChange();
  }

  function moveBlank(word: string, sourceNumber: number, target: number | "bank" | null) {
    if (!word || target === null) return;
    setValues((current) => {
      const next = { ...current };
      if (target === "bank") {
        delete next[sourceNumber];
        return next;
      }
      if (target === sourceNumber) return next;
      const targetWord = next[target];
      next[target] = word;
      if (targetWord) next[sourceNumber] = targetWord;
      else delete next[sourceNumber];
      return next;
    });
    finishChange();
  }

  function getDropTarget(event: PointerEvent<HTMLElement>) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const dropZone = target?.closest<HTMLElement>("[data-bbc-blank-number]");
    const number = dropZone?.dataset.bbcBlankNumber;
    if (number) return Number(number);
    return target?.closest("[data-bbc-word-bank]") ? "bank" : null;
  }

  function dropWord(word: string, sourceNumber: number | null, target: number | "bank" | null) {
    if (!word || target === null) return;
    if (sourceNumber !== null) moveBlank(word, sourceNumber, target);
    else if (target !== "bank") placeFromBank(word, target);
  }

  function readNativeDrag(event: DragEvent<HTMLElement>) {
    const source = event.dataTransfer.getData("bbc-source-number");
    return {
      sourceNumber: source ? Number(source) : null,
      word: event.dataTransfer.getData("text/plain"),
    };
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    let failed = false;

    for (const question of questions) {
      if (!question.options?.length || !question.answer) continue;
      const result = syncWrongBbcQuizFavorite({
        answer: question.answer,
        articleId,
        articleTitle,
        kind: "exercise",
        options: question.options,
        prompt: question.prompt,
        questionNumber: question.number,
        userAnswer: values[question.number] ?? "",
      });
      if (!result.ok) failed = true;
    }

    if (failed) setFavoriteNotice("收藏失败，请稍后重试");
  }

  return (
    <form className={styles.question} id={id} onSubmit={submitAnswer} aria-labelledby={`${id}-prompt`}>
      <p id={`${id}-prompt`} className={`${styles.prompt} ${styles.summaryPrompt}`} lang="en">
        {prompt.split(/(_{2,})/g).map((part, index) => {
          if (!part.match(/_{2,}/)) return <span key={`${id}-text-${index}`}>{part}</span>;
          const number = questions[Math.floor(index / 2)]?.number ?? Math.floor(index / 2) + 1;
          const value = values[number] ?? "";
          const question = questions.find((item) => item.number === number);
          const wrong = submitted && question?.answer !== value;
          return (
            <button
              aria-label={value ? `第 ${number} 空已填入 ${value}` : `第 ${number} 空`}
              className={`${styles.dropZone} ${hovering === number ? styles.dropZoneHover : ""} ${wrong ? styles.wrongDropZone : ""}`}
              data-bbc-blank-number={number}
              draggable={Boolean(value)}
              onClick={() => {
                if (skipClick) {
                  setSkipClick(false);
                  return;
                }
                if (dragging) dropWord(dragging, draggingSource, number);
                else if (value) clearBlank(number);
              }}
              onDragOver={(event) => { event.preventDefault(); setHovering(number); }}
              onDragLeave={() => setHovering(null)}
              onDrop={(event) => {
                event.preventDefault();
                const nativeDrag = readNativeDrag(event);
                dropWord(nativeDrag.word, nativeDrag.sourceNumber, number);
              }}
              onDragEnd={() => { setDragging(""); setDraggingSource(null); setHovering(null); }}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", value);
                event.dataTransfer.setData("bbc-source-number", String(number));
                setSkipClick(false);
                setDragging(value);
                setDraggingSource(number);
              }}
              onPointerDown={(event) => {
                if (event.pointerType !== "mouse" && value) {
                  setSkipClick(false);
                  setDragging(value);
                  setDraggingSource(number);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
              }}
              onPointerMove={(event) => {
                if (dragging && event.pointerType !== "mouse") setHovering(getDropTarget(event));
              }}
              onPointerUp={(event) => {
                if (!dragging || event.pointerType === "mouse") return;
                event.preventDefault();
                setSkipClick(true);
                const target = getDropTarget(event);
                if (target === null) finishChange();
                else dropWord(dragging, draggingSource, target);
              }}
              type="button"
            >
              {number}) {value || "______"}
            </button>
          );
        })}
      </p>
      <div
        className={`${styles.wordBank} ${hovering === "bank" ? styles.wordBankDropHover : ""}`}
        aria-label="备选词汇"
        data-bbc-word-bank
        onDragOver={(event) => { event.preventDefault(); setHovering("bank"); }}
        onDragLeave={() => setHovering(null)}
        onDrop={(event) => {
          event.preventDefault();
          const nativeDrag = readNativeDrag(event);
          dropWord(nativeDrag.word, nativeDrag.sourceNumber, "bank");
        }}
      >
        {options.filter((option) => !Object.values(values).includes(option)).map((option) => (
          <button
            className={`${styles.word} ${dragging === option ? styles.wordDragging : ""}`}
            draggable
            key={`${id}-${option}`}
            onClick={() => {
              if (skipClick) {
                setSkipClick(false);
                return;
              }
              placeFromBank(option);
            }}
            onDragEnd={() => { setDragging(""); setDraggingSource(null); setHovering(null); }}
            onDragStart={(event) => { event.dataTransfer.setData("text/plain", option); setSkipClick(false); setDragging(option); setDraggingSource(null); }}
            onPointerDown={(event) => {
              if (event.pointerType !== "mouse") {
                setSkipClick(false);
                setDragging(option);
                setDraggingSource(null);
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerMove={(event) => {
              if (dragging && event.pointerType !== "mouse") setHovering(getDropTarget(event));
            }}
            onPointerUp={(event) => {
              if (!dragging || event.pointerType === "mouse") return;
              event.preventDefault();
              setSkipClick(true);
              const target = getDropTarget(event);
              if (target === null) finishChange();
              else dropWord(dragging, draggingSource, target);
            }}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <QuestionActions disabled={!allFilled} favoriteNotice={favoriteNotice} submitted={submitted} />
      {submitted ? (
        <div className={`${styles.answer} ${allCorrect ? styles.answerCorrect : styles.answerWrong}`} role="status">
          <strong>{allCorrect ? "✓ 全部正确" : "✗ 参考答案"}</strong>
          {!allCorrect ? (
            <span lang="en">{questions.filter((question) => values[question.number] !== question.answer).map((question) => <span className={styles.answerItem} key={`${id}-answer-${question.number}`}>第{question.number}题：{optionLabel(question)}</span>)}</span>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function FillBlankQuestion({
  articleId,
  articleTitle,
  displayNumber,
  question,
}: {
  articleId: string;
  articleTitle: string;
  displayNumber: number;
  question: Question;
}) {
  const [value, setValue] = useState("");
  const submission = useQuestionSubmission({ articleId, articleTitle, kind: "exercise", question, value });
  const id = `bbc-article-quiz-${articleId}-exercise-${question.number}`;
  const blank = question.prompt.match(/_{2,}/);
  const before = blank ? question.prompt.slice(0, blank.index) : question.prompt;
  const after = blank ? question.prompt.slice((blank.index ?? 0) + blank[0].length) : "";
  const options = fourChoiceOptions(question);

  return (
    <div className={styles.question} id={id} aria-labelledby={`${id}-prompt`}>
      <p id={`${id}-prompt`} className={styles.prompt} lang="en">
        <span className={styles.number}>{displayNumber}.</span>
        <span>
          {before}
          <span
            aria-label={value ? `已选择 ${value}` : "尚未选择答案"}
            className={`${styles.answerBlank} ${submission.submitted ? submission.correct ? styles.correctChoice : styles.wrongDropZone : ""}`}
          >
            {value || "______"}
          </span>
          {after}
        </span>
      </p>
      <div className={styles.choiceGrid} role="radiogroup" aria-labelledby={`${id}-prompt`}>
        {options.map((option, index) => {
          const selected = value === option;
          const state = submission.submitted
            ? option === question.answer
              ? styles.correctChoice
              : selected
                ? styles.wrongChoice
                : ""
            : "";
          return (
          <button
            aria-checked={selected}
            className={`${styles.choice} ${state}`}
            key={`${id}-${option}`}
            onClick={() => {
              setValue(option);
              submission.submitValue(option);
            }}
            role="radio"
            type="button"
          >
            <span>{String.fromCharCode(65 + index)}.</span>
            <span lang="en">{option}</span>
            {submission.submitted && option === question.answer ? <span aria-label="正确">✓</span> : null}
            {submission.submitted && selected && option !== question.answer ? <span aria-label="错误">✗</span> : null}
          </button>
          );
        })}
      </div>
      {submission.favoriteNotice ? <div className={styles.hint} role="status">{submission.favoriteNotice}</div> : null}
      {submission.submitted ? <AnswerNotice correct={submission.correct} question={question} /> : null}
    </div>
  );
}

function QuestionActions({ disabled, favoriteNotice, submitted }: { disabled: boolean; favoriteNotice: string; submitted: boolean }) {
  return (
    <div className={styles.actions}>
      {favoriteNotice ? <span className={styles.hint} role="status">{favoriteNotice}</span> : null}
      <button className={styles.submit} disabled={disabled} type="submit">{submitted ? "重新提交" : "提交"}</button>
    </div>
  );
}

function AnswerNotice({ correct, question }: { correct: boolean; question: Question }) {
  return (
    <div className={`${styles.answer} ${question.answer ? correct ? styles.answerCorrect : styles.answerWrong : styles.answerPending}`} role="status">
      {question.answer ? <><strong>{correct ? "✓ 正确" : "✗ 参考答案"}</strong><span lang="en">{optionLabel(question)}</span></> : <span>源文未提供该题答案，请人工核对。</span>}
    </div>
  );
}

export function BbcArticleQuiz({ articleId, articleTitle }: { articleId: string; articleTitle?: string }) {
  const record = (quizCatalog as QuizRecord[]).find(
    (item) => item.articleId === articleId && item.status !== "review_required",
  );
  if (!record) return null;

  const title = articleTitle ?? record.articleTitle;
  const matching = record.matching ?? [];

  return (
    <section className={styles.panel} id="bbc-article-quiz" aria-label="文章练习">
      {matching.length ? (
        <section className={styles.group} aria-labelledby={`${articleId}-matching-heading`}>
          <h3 id={`${articleId}-matching-heading`}>一、将标题和段落配对</h3>
          <MatchingQuestionGroup articleId={articleId} articleTitle={title} questions={matching} />
        </section>
      ) : null}
      {record.quiz.length ? (
        <section className={styles.group} aria-labelledby={`${articleId}-quiz-heading`}>
          <h3 id={`${articleId}-quiz-heading`}>{matching.length ? "二" : "一"}、根据文章内容回答问题</h3>
          {record.quiz.map((question) => <ChoiceQuestion key={`quiz-${question.number}`} articleId={articleId} articleTitle={title} displayNumber={question.number} kind="quiz" question={question} />)}
        </section>
      ) : null}
      <section className={styles.group} aria-labelledby={`${articleId}-exercise-heading`}>
        <h3 id={`${articleId}-exercise-heading`}>{matching.length ? "三" : "二"}、选词填空</h3>
        {record.exercise[0]?.isSummary ? (
          <SummaryFillBlankQuestion articleId={articleId} articleTitle={title} questions={record.exercise} />
        ) : (
          record.exercise.map((question) => <FillBlankQuestion key={`exercise-${question.number}`} articleId={articleId} articleTitle={title} displayNumber={question.number} question={question} />)
        )}
      </section>
    </section>
  );
}
