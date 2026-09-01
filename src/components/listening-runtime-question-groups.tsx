import type { ChangeEvent, CSSProperties } from "react";

export type RuntimeListeningQuestion = {
  answers: string[];
  id: string;
  promptText: string | null;
  questionNo: number;
  questionType: string;
};

export type RuntimeListeningContentSegment =
  | string
  | { answerPrefix?: string; answerSuffix?: string; questionNo: number; showQuestionNumber?: boolean }
  | { answerLine: "short" | "long" }
  | {
      fontFamily?: "sans" | "serif";
      italic?: boolean;
      size?: "body" | "title";
      strong?: boolean;
      text: string;
      underline?: boolean;
    };

export type RuntimeListeningContentBlock =
  | { type: "paragraph"; segments: RuntimeListeningContentSegment[] }
  | {
      type: "list";
      items: RuntimeListeningContentSegment[][];
      style?: "bullet" | "dash" | "number" | "none";
    }
  | {
      type: "table";
      headers?: RuntimeListeningContentSegment[][];
      rows: RuntimeListeningContentSegment[][][];
      sourceShape?: { bodyRows: number; columns: number };
      title?: string;
      variant?: "borderless" | "form";
    }
  | { type: "flow"; steps: RuntimeListeningContentSegment[][] }
  | {
      type: "image";
      alt?: string;
      crop?: { height: number; width: number; x: number; y: number };
      sourceRef: string;
    }
  | {
      answerLabel?: string;
      label?: string;
      options?: Array<{ letter: string; text: string }>;
      segments: RuntimeListeningContentSegment[];
      showBullet?: boolean;
      type: "example";
    }
  | {
      type: "diagram";
      labels: Array<{
        position: "left" | "bottom-left" | "bottom-right" | "right";
        segments: RuntimeListeningContentSegment[];
      }>;
      landmarks?: string[];
      title: string;
    };

export type RuntimeListeningQuestionGroup = {
  content?: RuntimeListeningContentBlock[];
  framed?: boolean;
  id: string;
  instructions: string[];
  layout: string;
  options?: Array<{ letter: string; text: string }>;
  optionsBoxed?: boolean;
  optionsLayout?: "single-column" | "source-columns";
  optionsTitle?: string | null;
  questionNos: number[];
  rangeHeading?: string | null;
  renderMode: string;
  showRangeHeading?: boolean;
  sourceRefs: string[];
  title: string | null;
};

export type RuntimeListeningAnswerGroup = {
  groupId?: string;
  id: string;
  mode: "unordered_distinct_slots" | "unordered_set_single_slot";
  questionNos: number[];
  selectionCount: number;
  valueKind?: "choice_letters" | "text_values";
};

type RuntimeListeningQuestionGroupsProps = {
  answerGroups: RuntimeListeningAnswerGroup[];
  answers: Record<string, string>;
  groups: RuntimeListeningQuestionGroup[];
  isQuestionCorrect?: (question: RuntimeListeningQuestion) => boolean;
  onAnswerChange: (questionId: string, value: string) => void;
  questionImageRefs?: string[];
  questionImageUrls: string[];
  questions: RuntimeListeningQuestion[];
  sectionNo: number;
  submitted: boolean;
};

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/[.,;:!?\'"“”‘’()\[\]\s-]/g, "");
}

function isAcceptedAnswer(value: string, acceptedAnswers: string[]) {
  return acceptedAnswers.map(normalizeAnswer).includes(normalizeAnswer(value));
}

function normalizeChoiceLetters(value: string) {
  return [
    ...new Set(value.toUpperCase().replace(/\bAND\b/g, " ").match(/[A-Z]/g) ?? []),
  ].sort();
}

function parsePrompt(promptText: string | null) {
  const options: Array<{ letter: string; text: string }> = [];
  const stemLines: string[] = [];

  for (const line of (promptText ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const optionMatch = line.match(/^([A-Z])[.)]\s+(.+)$/);
    if (optionMatch) options.push({ letter: optionMatch[1], text: optionMatch[2] });
    else stemLines.push(line);
  }

  return { options, stem: stemLines.join("\n") };
}

function questionRangeTitle(questionNos: number[]) {
  return questionNos[0] === questionNos.at(-1)
    ? `Question ${questionNos[0]}`
    : `Questions ${questionNos[0]}-${questionNos.at(-1)}`;
}

function cleanQuestionPrompt(
  question: RuntimeListeningQuestion,
  group: RuntimeListeningQuestionGroup,
) {
  const normalizeInstruction = (value: string) =>
    value
      .toLowerCase()
      .replace(/\bsentences\b/g, "sentence")
      .replace(/\bbelow\b/g, "")
      .replace(/\bfor each answer\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const instructions = new Set(group.instructions.map(normalizeInstruction));
  const title = normalizeInstruction(group.title ?? "");
  return parsePrompt(question.promptText).stem
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^_+\s*/, "")
        .split(/(?<=[.!?])\s+/)
        .map((fragment) => fragment.trim())
        .filter((fragment) => {
          const normalized = normalizeInstruction(fragment);
          return normalized && !instructions.has(normalized) && normalized !== title;
        })
        .join(" "),
    )
    .filter(Boolean)
    .join("\n");
}

function resolveSourceImageUrls(
  group: RuntimeListeningQuestionGroup,
  questionImageRefs: string[],
  questionImageUrls: string[],
) {
  if (questionImageRefs.length !== questionImageUrls.length) return [];

  const urlByRef = new Map(
    questionImageRefs.map((sourceRef, index) => [sourceRef, questionImageUrls[index]]),
  );
  const exactMatches = group.sourceRefs
    .map((sourceRef) => urlByRef.get(sourceRef))
    .filter((url): url is string => Boolean(url));
  if (exactMatches.length) return [...new Set(exactMatches)];

  const numberedMatches = group.sourceRefs
    .map((sourceRef) => sourceRef.match(/(?:page|image)[-_]?(\d+)$/i)?.[1])
    .map((pageNo) => (pageNo ? questionImageUrls[Number(pageNo) - 1] : undefined))
    .filter((url): url is string => Boolean(url));
  return [...new Set(numberedMatches)];
}

export function canRenderRuntimeQuestionGroups(
  groups: RuntimeListeningQuestionGroup[],
  questions: RuntimeListeningQuestion[],
) {
  if (
    groups.length === 0 ||
    groups.some((group) => group.renderMode === "custom" || group.layout === "custom")
  ) {
    return false;
  }

  const groupedQuestionNos = groups.flatMap((group) => group.questionNos);
  return groupedQuestionNos.length === questions.length && groupedQuestionNos.every(
    (questionNo, index) => questionNo === questions[index]?.questionNo,
  );
}

export function selectListeningPaperLayout({
  groups,
  hasLegacyStructuredLayout,
  hasSectionSpecificLayout,
  metadataStatus,
  questions,
}: {
  groups: RuntimeListeningQuestionGroup[];
  hasLegacyStructuredLayout: boolean;
  hasSectionSpecificLayout: boolean;
  metadataStatus?: "matched" | "mismatch" | "missing" | "unsupported-schema";
  questions: RuntimeListeningQuestion[];
}) {
  if (hasSectionSpecificLayout) return "section-specific" as const;
  if (metadataStatus === "mismatch" || metadataStatus === "unsupported-schema") {
    return "generic" as const;
  }
  if (canRenderRuntimeQuestionGroups(groups, questions)) return "runtime" as const;
  if (hasLegacyStructuredLayout) return "legacy-structured" as const;
  return "generic" as const;
}

export function selectListeningAnswerGroupsForLayout(
  answerGroups: RuntimeListeningAnswerGroup[],
  selectedLayout: ReturnType<typeof selectListeningPaperLayout>,
) {
  return selectedLayout === "generic" ? [] : answerGroups;
}

export function updateRuntimeMultiSelectAnswers(
  answers: Record<string, string>,
  questions: RuntimeListeningQuestion[],
  letter: string,
  checked: boolean,
  maximumSelections: number,
  mode: RuntimeListeningAnswerGroup["mode"] = "unordered_distinct_slots",
) {
  const selectedLetters = new Set(
    mode === "unordered_set_single_slot"
      ? normalizeChoiceLetters(answers[questions[0]?.id] ?? "")
      : questions.map((question) => answers[question.id]?.trim().toUpperCase()).filter(Boolean),
  );
  const normalizedLetter = letter.trim().toUpperCase();
  if (checked && selectedLetters.size < maximumSelections) selectedLetters.add(normalizedLetter);
  if (!checked) selectedLetters.delete(normalizedLetter);

  const orderedSelection = [...selectedLetters].sort();
  const nextAnswers = { ...answers };
  if (mode === "unordered_set_single_slot") {
    if (questions[0]) nextAnswers[questions[0].id] = orderedSelection.join(", ");
  } else {
    questions.forEach((question, index) => {
      nextAnswers[question.id] = orderedSelection[index] ?? "";
    });
  }
  return nextAnswers;
}

function Instructions({ group }: { group: RuntimeListeningQuestionGroup }) {
  const rangeTitle = group.rangeHeading ?? questionRangeTitle(group.questionNos);
  const rangeNumbers = (value: string) => value.match(/\d+/g)?.map(Number) ?? [];
  const hasRangeInstruction = group.instructions.some((instruction) => {
    const instructionNumbers = rangeNumbers(instruction);
    return instructionNumbers[0] === group.questionNos[0]
      && instructionNumbers.at(-1) === group.questionNos.at(-1);
  });

  const title = group.title?.trim().toLocaleLowerCase();
  const instructions = group.instructions.filter((instruction) => {
    if (title && instruction.trim().toLocaleLowerCase() === title) return false;
    // A malformed source sometimes puts the full A/B/C prompt in the
    // instruction field. The question renderer already renders that prompt.
    return (instruction.match(/(?:^|\n)\s*[A-Z][.)]\s+/g) ?? []).length < 2;
  });

  return (
    <section className="paper-instructions">
      {group.rangeHeading || group.showRangeHeading || !hasRangeInstruction ? <h3>{rangeTitle}</h3> : null}
      {instructions.map((instruction) => (
        <p key={instruction}><em>{renderInstruction(instruction)}</em></p>
      ))}
    </section>
  );
}

function renderInstruction(instruction: string) {
  const rulePattern = /(NO MORE THAN (?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN) WORDS(?: AND\/OR (?:A )?NUMBERS?)?|ONE WORD ONLY|TWO WORDS ONLY|THREE WORDS ONLY)/i;
  const match = instruction.match(rulePattern);
  if (!match || match.index === undefined) return instruction;
  return (
    <>
      {instruction.slice(0, match.index)}
      <strong>{match[0]}</strong>
      {instruction.slice(match.index + match[0].length)}
    </>
  );
}

function AnswerControl({
  answerPrefix,
  answerSuffix,
  answers,
  isCorrect,
  onAnswerChange,
  question,
  questionNumberClassName,
  showQuestionNumber = true,
  submitted,
}: {
  answerPrefix?: string;
  answerSuffix?: string;
  answers: Record<string, string>;
  isCorrect: boolean;
  onAnswerChange: (questionId: string, value: string) => void;
  question: RuntimeListeningQuestion;
  questionNumberClassName?: string;
  showQuestionNumber?: boolean;
  submitted: boolean;
}) {
  const userAnswer = answers[question.id] ?? "";
  const answerCharacters = Math.max(
    4,
    userAnswer.length,
    submitted ? (question.answers[0] ?? "").length : 0,
  );

  return (
    <span
      className="paper-runtime-answer-control"
      id={`question-${question.questionNo}`}
      style={{ "--paper-answer-ch": `${Math.ceil((answerCharacters + 1) * 1.5)}ch` } as CSSProperties}
    >
      {showQuestionNumber ? <strong className={questionNumberClassName ?? "paper-question-number"}>{question.questionNo}</strong> : null}
      {answerPrefix ? <span className="paper-runtime-answer-affix">{answerPrefix}</span> : null}
      {submitted ? (
        <span className={`fill-result-box ${isCorrect ? "correct" : "wrong"}`}>
          <span className="fill-result-icon">{isCorrect ? "✅" : "❌"}</span>
          <span className={isCorrect ? "" : "wrong-user-answer"}>{userAnswer || "未作答"}</span>
          {!isCorrect ? <span className="correct-answer">✅ {question.answers[0] ?? "未录入"}</span> : null}
        </span>
      ) : (
        <input
          aria-label={`Question ${question.questionNo}`}
          value={userAnswer}
          onChange={(event) => onAnswerChange(question.id, event.currentTarget.value)}
        />
      )}
      {answerSuffix ? <span className="paper-runtime-answer-affix">{answerSuffix}</span> : null}
    </span>
  );
}

function leadingColonPrefix(value: string) {
  const match = value.match(/^(\s*[^:\n]+:\s*)/);
  if (!match) return null;
  return { key: match[1].trim().toLocaleLowerCase(), text: match[1] };
}

function paragraphText(block: RuntimeListeningContentBlock) {
  if (block.type !== "paragraph") return null;
  return block.segments
    .map((segment) => (typeof segment === "string" ? segment : "text" in segment ? segment.text : ""))
    .join("")
    .trim();
}

function tableCellText(cell: RuntimeListeningContentSegment[]) {
  return cell
    .map((segment) =>
      typeof segment === "string"
        ? segment
        : "text" in segment
          ? segment.text
          : "",
    )
    .join("")
    .trim()
    .toLocaleLowerCase();
}

function mergedMaterialRows(rows: RuntimeListeningContentSegment[][][]) {
  const spans = new Map<number, number>();
  const hiddenRows = new Set<number>();

  for (let rowIndex = 0; rowIndex < rows.length;) {
    const value = rows[rowIndex]?.[0];
    const normalizedValue = value ? tableCellText(value) : "";
    if (!normalizedValue) {
      rowIndex += 1;
      continue;
    }

    let span = 1;
    while (
      rowIndex + span < rows.length &&
      tableCellText(rows[rowIndex + span]?.[0] ?? []) === normalizedValue
    ) {
      span += 1;
    }
    if (span > 1) {
      spans.set(rowIndex, span);
      for (let hiddenIndex = rowIndex + 1; hiddenIndex < rowIndex + span; hiddenIndex += 1) {
        hiddenRows.add(hiddenIndex);
      }
    }
    rowIndex += span;
  }

  return { hiddenRows, spans };
}

function StructuredGroupContent({
  answers,
  content,
  isQuestionCorrect,
  imageUrlByRef,
  layout,
  onAnswerChange,
  questionByNo,
  submitted,
  title,
}: {
  answers: Record<string, string>;
  content: RuntimeListeningContentBlock[];
  imageUrlByRef: Map<string, string>;
  isQuestionCorrect: (question: RuntimeListeningQuestion) => boolean;
  layout: string;
  onAnswerChange: (questionId: string, value: string) => void;
  questionByNo: Map<number, RuntimeListeningQuestion>;
  submitted: boolean;
  title?: string | null;
}) {
  const renderSegments = (
    segments: RuntimeListeningContentSegment[],
    hiddenPrefix?: { segmentIndex: number; text: string },
  ) =>
    segments.map((segment, index) => {
      if (typeof segment === "string") {
        if (hiddenPrefix?.segmentIndex === index && segment.startsWith(hiddenPrefix.text)) {
          return (
            <span className="paper-runtime-text" key={`text-${index}`}>
              <span aria-hidden="true" className="paper-runtime-repeated-prefix">{hiddenPrefix.text}</span>
              {segment.slice(hiddenPrefix.text.length)}
            </span>
          );
        }
        return <span className="paper-runtime-text" key={`text-${index}`}>{segment}</span>;
      }
      if ("answerLine" in segment) {
        return (
          <span
            aria-hidden="true"
            className={`paper-runtime-answer-line paper-runtime-answer-line-${segment.answerLine}`}
            key={`answer-line-${index}`}
          />
        );
      }
      if ("text" in segment) {
        const TextTag = segment.strong ? "strong" : "span";
        const className = [
          "paper-runtime-text",
          segment.italic ? "paper-runtime-text-italic" : "",
          segment.fontFamily === "serif" ? "paper-runtime-text-serif" : "",
          segment.size === "title" ? "paper-runtime-text-title" : "",
          segment.underline ? "paper-runtime-text-underline" : "",
        ].filter(Boolean).join(" ");
        return <TextTag className={className} key={`text-${index}`}>{segment.text}</TextTag>;
      }
      const question = questionByNo.get(segment.questionNo);
      return question ? (
        <AnswerControl
          answerPrefix={segment.answerPrefix}
          answerSuffix={segment.answerSuffix}
          answers={answers}
          isCorrect={isQuestionCorrect(question)}
          key={`question-${segment.questionNo}`}
          onAnswerChange={onAnswerChange}
          question={question}
          showQuestionNumber={segment.showQuestionNumber}
          submitted={submitted}
        />
      ) : null;
    });

  return (
    <div className="paper-runtime-structured-content">
      {content
        .filter((block, blockIndex) => {
          if (blockIndex !== 0 || !title) return true;
          return paragraphText(block)?.toLocaleLowerCase() !== title.trim().toLocaleLowerCase();
        })
        .map((block, blockIndex) => {
        if (block.type === "paragraph") {
          return <p key={`paragraph-${blockIndex}`}>{renderSegments(block.segments)}</p>;
        }
        if (block.type === "list") {
          if (layout === "fill" && block.style === "bullet") {
            const seenPrefixes = new Set<string>();
            return (
              <div className="paper-runtime-notes-list" key={`notes-list-${blockIndex}`}>
                {block.items.map((segments, itemIndex) => {
                  const firstTextIndex = segments.findIndex(
                    (segment) => typeof segment === "string" || "text" in segment,
                  );
                  const firstSegment = firstTextIndex >= 0 ? segments[firstTextIndex] : null;
                  const firstText = firstSegment
                    ? typeof firstSegment === "string"
                      ? firstSegment
                      : "text" in firstSegment
                        ? firstSegment.text
                        : ""
                    : "";
                  const prefix = leadingColonPrefix(firstText);
                  const hidePrefix = prefix && seenPrefixes.has(prefix.key)
                    ? { segmentIndex: firstTextIndex, text: prefix.text }
                    : undefined;
                  if (prefix) seenPrefixes.add(prefix.key);
                  return (
                    <div className="paper-runtime-notes-row" key={`notes-item-${itemIndex}`}>
                      <span aria-hidden="true" className="paper-runtime-notes-bullet">•</span>
                      <span className="paper-runtime-notes-detail">
                        {renderSegments(segments, hidePrefix)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          }
          if (layout === "flowchart") {
            return (
              <ol className="paper-runtime-flow" key={`flow-${blockIndex}`}>
                {block.items.map((segments, stepIndex) => (
                  <li key={`step-${stepIndex}`}>{renderSegments(segments)}</li>
                ))}
              </ol>
            );
          }
          const Tag = block.style === "number" ? "ol" : block.style === "none" ? "div" : "ul";
          const seenPrefixes = new Set<string>();
          return (
            <Tag className={`paper-runtime-list paper-runtime-list-${block.style ?? "bullet"}`} key={`list-${blockIndex}`}>
              {block.items.map((segments, itemIndex) => {
                const ItemTag = Tag === "div" ? "p" : "li";
                const firstTextIndex = segments.findIndex((segment) => typeof segment === "string");
                const prefix = firstTextIndex >= 0
                  ? leadingColonPrefix(segments[firstTextIndex] as string)
                  : null;
                const hidePrefix = prefix && seenPrefixes.has(prefix.key)
                  ? { segmentIndex: firstTextIndex, text: prefix.text }
                  : undefined;
                if (prefix) seenPrefixes.add(prefix.key);
                return <ItemTag key={`item-${itemIndex}`}>{renderSegments(segments, hidePrefix)}</ItemTag>;
              })}
            </Tag>
          );
        }
        if (block.type === "table") {
          if (block.variant === "form") {
            const [exampleHeader, ...formRows] = block.rows;
            return (
              <div className="paper-runtime-form-layout" key={`form-${blockIndex}`}>
                {block.title ? <h3 className="paper-runtime-form-title">{block.title}</h3> : null}
                {exampleHeader ? (
                  <div className="paper-runtime-form-example-head">
                    <span>{renderSegments(exampleHeader[0] ?? [])}</span>
                    <span>{renderSegments(exampleHeader[1] ?? [])}</span>
                  </div>
                ) : null}
                {formRows.map((row, rowIndex) => (
                  <div
                    className={`paper-runtime-form-row ${rowIndex === 0 ? "paper-runtime-form-example-row" : ""}`}
                    key={`form-row-${rowIndex}`}
                  >
                    <span>{renderSegments(row[0] ?? [])}</span>
                    <span>{renderSegments(row[1] ?? [])}</span>
                  </div>
                ))}
              </div>
            );
          }
          const headerText = (segments: RuntimeListeningContentSegment[]) => segments
            .map((segment) =>
              typeof segment === "string"
                ? segment
                : "text" in segment
                  ? segment.text
                  : "",
            )
            .join("")
            .trim()
            .toLocaleLowerCase();
          const hasSyntheticItemAnswerHeaders = block.headers?.length === 2
            && headerText(block.headers[0]) === "item"
            && headerText(block.headers[1]) === "answer"
            && !block.title;
          const renderedHeaders = hasSyntheticItemAnswerHeaders ? undefined : block.headers;
          const columnCount = renderedHeaders?.length ?? block.rows[0]?.length ?? 1;
          const materialRowMerges = block.title === "Companies working with recycled materials"
            ? mergedMaterialRows(block.rows)
            : { hiddenRows: new Set<number>(), spans: new Map<number, number>() };
          return (
            <div className="paper-runtime-table-wrap" key={`table-${blockIndex}`}>
              <table className={`paper-runtime-table paper-runtime-table-columns-${columnCount}${block.variant === "borderless" ? " paper-runtime-table-borderless" : ""}`}>
                {block.title || renderedHeaders ? (
                  <thead>
                    {block.title ? (
                      <tr><th className="paper-runtime-table-title" colSpan={renderedHeaders?.length ?? block.rows[0]?.length ?? 1}>{block.title}</th></tr>
                    ) : null}
                    {renderedHeaders ? (
                      <tr>{renderedHeaders.map((segments, columnIndex) => (
                        <th key={`header-${columnIndex}`}>{renderSegments(segments)}</th>
                      ))}</tr>
                    ) : null}
                  </thead>
                ) : null}
                <tbody>{block.rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>{row.map((segments, columnIndex) => (
                    columnIndex === 0 && materialRowMerges.hiddenRows.has(rowIndex) ? null : (
                      <td
                        key={`cell-${columnIndex}`}
                        rowSpan={columnIndex === 0 ? materialRowMerges.spans.get(rowIndex) : undefined}
                      >
                        {renderSegments(segments)}
                      </td>
                    )
                  ))}</tr>
                ))}</tbody>
              </table>
            </div>
          );
        }
        if (block.type === "image") {
          const imageUrl = imageUrlByRef.get(block.sourceRef);
          if (!imageUrl) return null;
          const crop = block.crop;
          const cropStyle = crop
            ? { aspectRatio: `${crop.width} / ${crop.height}` }
            : undefined;
          const imageStyle = crop
            ? {
                height: `${100 / crop.height}%`,
                left: `${-(crop.x / crop.width) * 100}%`,
                maxWidth: "none",
                top: `${-(crop.y / crop.height) * 100}%`,
                width: `${100 / crop.width}%`,
              }
            : undefined;
          return (
            <figure className="paper-runtime-content-image" key={`image-${blockIndex}`}>
              <div className={`paper-runtime-content-image-crop ${crop ? "" : "paper-runtime-content-image-full"}`} style={cropStyle}>
                <img alt={block.alt ?? "题目配图"} src={imageUrl} style={imageStyle} />
              </div>
            </figure>
          );
        }
        if (block.type === "example") {
          return (
            <aside className="paper-runtime-example" key={`example-${blockIndex}`}>
              <div className="paper-runtime-example-head">
                <strong>{block.label ?? "Example"}</strong>
                <strong>{block.answerLabel ?? "Answer"}</strong>
              </div>
              <p>{block.showBullet === false ? null : <span aria-hidden="true">•</span>} {renderSegments(block.segments)}</p>
              {block.options?.length ? (
                <div className="paper-runtime-example-options">
                  {block.options.map((option) => (
                    <div key={option.letter}>
                      <strong>{option.letter}</strong>
                      <span>{option.text}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </aside>
          );
        }
        if (block.type === "diagram") {
          return (
            <figure className="paper-runtime-diagram" key={`diagram-${blockIndex}`}>
              <figcaption>{block.title}</figcaption>
              <div className="paper-runtime-water-heater">
                <div aria-hidden="true" className="paper-runtime-heater-chimney" />
                <div aria-hidden="true" className="paper-runtime-heater-body">
                  <span className="paper-runtime-heater-control" />
                  <span className="paper-runtime-heater-control" />
                  <span className="paper-runtime-heater-control" />
                  <span className="paper-runtime-heater-button" />
                  <span className="paper-runtime-heater-button" />
                </div>
                {block.landmarks?.map((landmark, landmarkIndex) => (
                  <span
                    className={`paper-runtime-diagram-landmark paper-runtime-diagram-landmark-${landmarkIndex + 1}`}
                    key={landmark}
                  >
                    {landmark}
                  </span>
                ))}
                {block.labels.map((label, labelIndex) => (
                  <div
                    className={`paper-runtime-diagram-label paper-runtime-diagram-label-${label.position}`}
                    key={`label-${labelIndex}`}
                  >
                    {renderSegments(label.segments)}
                  </div>
                ))}
              </div>
            </figure>
          );
        }
        return (
          <ol className="paper-runtime-flow" key={`flow-${blockIndex}`}>
            {block.steps.map((segments, stepIndex) => (
              <li key={`step-${stepIndex}`}>{renderSegments(segments)}</li>
            ))}
          </ol>
        );
        })}
    </div>
  );
}

function FillQuestion({
  answers,
  group,
  isQuestionCorrect,
  onAnswerChange,
  question,
  submitted,
}: {
  answers: Record<string, string>;
  group: RuntimeListeningQuestionGroup;
  isQuestionCorrect: (question: RuntimeListeningQuestion) => boolean;
  onAnswerChange: (questionId: string, value: string) => void;
  question: RuntimeListeningQuestion;
  submitted: boolean;
}) {
  return (
    <article className="paper-runtime-question">
      <label>
        <span className="question-prompt">{cleanQuestionPrompt(question, group)}</span>
        <AnswerControl
          answers={answers}
          isCorrect={isQuestionCorrect(question)}
          onAnswerChange={onAnswerChange}
          question={question}
          submitted={submitted}
        />
      </label>
    </article>
  );
}

function MapQuestionRows({
  answers,
  group,
  groupQuestions,
  isQuestionCorrect,
  onAnswerChange,
  submitted,
}: {
  answers: Record<string, string>;
  group: RuntimeListeningQuestionGroup;
  groupQuestions: RuntimeListeningQuestion[];
  isQuestionCorrect: (question: RuntimeListeningQuestion) => boolean;
  onAnswerChange: (questionId: string, value: string) => void;
  submitted: boolean;
}) {
  return (
    <div className="paper-runtime-map-questions">
      {groupQuestions.map((question) => {
        const prompt = cleanQuestionPrompt(question, group)
          .replace(/^map label\s*/i, "")
          .replace(/[._…]+/g, "")
          .trim();
        return (
          <div className="paper-runtime-map-question" id={`question-${question.questionNo}`} key={question.id}>
            <strong className="paper-runtime-map-question-number">{question.questionNo}</strong>
            <span className="paper-runtime-map-question-prompt">{prompt}</span>
            <AnswerControl
              answers={answers}
              isCorrect={isQuestionCorrect(question)}
              onAnswerChange={onAnswerChange}
              question={question}
              showQuestionNumber={false}
              submitted={submitted}
            />
          </div>
        );
      })}
    </div>
  );
}

function MatchingQuestionRows({
  answers,
  content,
  group,
  groupQuestions,
  isQuestionCorrect,
  onAnswerChange,
  submitted,
}: {
  answers: Record<string, string>;
  content?: RuntimeListeningContentBlock[];
  group: RuntimeListeningQuestionGroup;
  groupQuestions: RuntimeListeningQuestion[];
  isQuestionCorrect: (question: RuntimeListeningQuestion) => boolean;
  onAnswerChange: (questionId: string, value: string) => void;
  submitted: boolean;
}) {
  const rowList = content?.find((block) => block.type === "list") ?? null;
  const headingBlocks = content?.filter((block) =>
    block.type === "paragraph" && block.segments.every((segment) => typeof segment === "string" || "text" in segment),
  ) ?? [];
  const renderHeadingSegments = (segments: RuntimeListeningContentSegment[]) => segments.map((segment, index) => {
    if (typeof segment === "string") return <span key={`heading-text-${index}`}>{segment}</span>;
    if (!("text" in segment)) return null;
    const Tag = segment.strong ? "strong" : "span";
    return <Tag className={segment.italic ? "paper-runtime-text-italic" : undefined} key={`heading-text-${index}`}>{segment.text}</Tag>;
  });
  const renderStaticSegments = (segments: RuntimeListeningContentSegment[]) => segments.map((segment, index) => {
    if (typeof segment === "string") return segment;
    if (!("text" in segment)) return null;
    const Tag = segment.strong ? "strong" : "span";
    return (
      <Tag
        className={[
          segment.italic ? "paper-runtime-text-italic" : "",
          segment.fontFamily === "sans" ? "paper-runtime-text-sans" : "",
        ].filter(Boolean).join(" ") || undefined}
        key={`matching-static-${index}`}
      >
        {segment.text}
      </Tag>
    );
  });
  return (
    <div className="paper-runtime-matching">
      {group.options?.length ? (
        <div className={`paper-runtime-matching-options${group.optionsBoxed === false ? " paper-runtime-matching-options-plain" : ""}`}>
          {group.optionsTitle ? <h4 className="paper-runtime-options-title">{group.optionsTitle}</h4> : null}
          {group.options.map((option) => (
            <span key={option.letter}><strong>{option.letter}</strong> {option.text}</span>
          ))}
        </div>
      ) : null}
      {group.title ? <h3 className="runtime-group-title runtime-group-title-matching">{group.title}</h3> : null}
      {headingBlocks.map((block, index) => block.type === "paragraph" ? (
        <p className="paper-runtime-matching-section-heading" key={`matching-heading-${index}`}>
          {renderHeadingSegments(block.segments)}
        </p>
      ) : null)}
      <div className="paper-runtime-matching-rows">
        {rowList?.type === "list" ? rowList.items.map((segments, rowIndex) => {
          const questionSegmentIndex = segments.findIndex(
            (segment): segment is { questionNo: number } => typeof segment !== "string" && "questionNo" in segment,
          );
          const questionSegment = questionSegmentIndex >= 0 ? segments[questionSegmentIndex] : null;
          const question = questionSegment && typeof questionSegment !== "string" && "questionNo" in questionSegment
            ? groupQuestions.find((item) => item.questionNo === questionSegment.questionNo)
            : undefined;
          if (!question) {
            return (
              <div className="paper-runtime-matching-example-row" key={`matching-example-${rowIndex}`}>
                {renderStaticSegments(segments)}
              </div>
            );
          }
          return (
            <div className="paper-runtime-matching-row" id={`question-${question.questionNo}`} key={question.id}>
              <strong className="paper-runtime-matching-number">{question.questionNo}</strong>
              <span className="paper-runtime-matching-prompt">{renderStaticSegments(segments.slice(0, questionSegmentIndex))}</span>
              <AnswerControl
                answers={answers}
                isCorrect={isQuestionCorrect(question)}
                onAnswerChange={onAnswerChange}
                question={question}
                showQuestionNumber={false}
                submitted={submitted}
              />
            </div>
          );
        }) : groupQuestions.map((question) => (
          <div className="paper-runtime-matching-row" id={`question-${question.questionNo}`} key={question.id}>
            <strong className="paper-runtime-matching-number">{question.questionNo}</strong>
            <span className="paper-runtime-matching-prompt">{cleanQuestionPrompt(question, group)}</span>
            <AnswerControl
              answers={answers}
              isCorrect={isQuestionCorrect(question)}
              onAnswerChange={onAnswerChange}
              question={question}
              showQuestionNumber={false}
              submitted={submitted}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RuntimeListeningQuestionGroups({
  answerGroups,
  answers,
  groups,
  isQuestionCorrect = (question) => isAcceptedAnswer(answers[question.id] ?? "", question.answers),
  onAnswerChange,
  questionImageRefs = [],
  questionImageUrls,
  questions,
  sectionNo,
  submitted,
}: RuntimeListeningQuestionGroupsProps) {
  const questionByNo = new Map(questions.map((question) => [question.questionNo, question]));

  return (
    <div className="paper-sheet runtime-paper-sheet">
      <div className="paper-section-heading">
        <h2>SECTION {sectionNo}</h2>
        <h2>Questions {(sectionNo - 1) * 10 + 1}-{sectionNo * 10}</h2>
      </div>

      {groups.map((group) => {
        if (group.renderMode === "custom" || group.layout === "custom") return null;
        const groupQuestions = group.questionNos
          .map((questionNo) => questionByNo.get(questionNo))
          .filter((question): question is RuntimeListeningQuestion => Boolean(question));
        const answerGroup = answerGroups.find((item) =>
          (item.groupId ?? item.id) === group.id && item.questionNos.every((questionNo) =>
            group.questionNos.includes(questionNo)));
        const options = group.options?.length
          ? group.options
          : parsePrompt(groupQuestions[0]?.promptText ?? null).options;
        const singleSlot = answerGroup?.mode === "unordered_set_single_slot";
        const selectedLetters = new Set(
          singleSlot
            ? normalizeChoiceLetters(answers[groupQuestions[0]?.id] ?? "")
            : groupQuestions.map((question) => answers[question.id]?.trim().toUpperCase()).filter(Boolean),
        );
        const correctLetters = new Set(
          singleSlot
            ? groupQuestions.flatMap((question) => question.answers.flatMap(normalizeChoiceLetters))
            : [],
        );
        const isMapGroup = group.layout === "map" || group.layout === "source_image" || group.renderMode === "source_image";
        const imageUrlByRef = new Map(
          questionImageRefs.map((sourceRef, index) => [sourceRef, questionImageUrls[index]]),
        );
        const isFramedLayout = ["form", "fill", "summary"].includes(group.layout) && group.framed !== false;
        const hasDiagramContent = group.content?.some((block) => block.type === "diagram") ?? false;
        const hasTableContent = group.content?.some((block) => block.type === "table") ?? false;
        const choiceExampleOnly = ["single_choice", "multi_select"].includes(group.layout)
          && Boolean(group.content?.length)
          && group.content?.every((block) => block.type === "example");

        return (
            <section className="runtime-question-group" key={group.id}>
            <Instructions group={group} />
            {group.title && group.layout !== "matching" && !(isFramedLayout && ["fill", "form", "summary"].includes(group.layout)) ? (
              <h3 className="runtime-group-title">{group.title}</h3>
            ) : null}

            {choiceExampleOnly ? (
              <StructuredGroupContent
                answers={answers}
                content={group.content ?? []}
                imageUrlByRef={imageUrlByRef}
                isQuestionCorrect={isQuestionCorrect}
                layout={group.layout}
                onAnswerChange={onAnswerChange}
                questionByNo={questionByNo}
                submitted={submitted}
                title={null}
              />
            ) : null}

            {isMapGroup ? (
              <div className="question-image-stack runtime-source-images">
                {resolveSourceImageUrls(group, questionImageRefs, questionImageUrls).map((imageUrl, index) => (
                  <img
                    alt={`${group.title ?? questionRangeTitle(group.questionNos)} 原题图 ${index + 1}`}
                    className="question-image"
                    key={imageUrl}
                    src={imageUrl}
                  />
                ))}
              </div>
            ) : null}

            {isMapGroup ? (
              <MapQuestionRows
                answers={answers}
                group={group}
                groupQuestions={groupQuestions}
                isQuestionCorrect={isQuestionCorrect}
                onAnswerChange={onAnswerChange}
                submitted={submitted}
              />
            ) : group.layout === "matching" && !hasDiagramContent && !hasTableContent ? (
              <MatchingQuestionRows
                answers={answers}
                content={group.content}
                group={group}
                groupQuestions={groupQuestions}
                isQuestionCorrect={isQuestionCorrect}
                onAnswerChange={onAnswerChange}
                submitted={submitted}
              />
            ) : group.content?.length && !choiceExampleOnly ? (
              <>
                {group.options?.length ? (
                  <div className={group.layout === "matching"
                    ? `paper-runtime-matching-options${group.optionsBoxed === false ? " paper-runtime-matching-options-plain" : ""}`
                    : "paper-option-box"}>
                    {group.optionsTitle ? <h4 className="paper-runtime-options-title">{group.optionsTitle}</h4> : null}
                    {group.options.map((option) => (
                      <span key={option.letter}><strong>{option.letter}</strong> {option.text}</span>
                    ))}
                  </div>
                ) : null}
                <div className={isFramedLayout ? "paper-runtime-form-frame" : undefined}>
                  {group.title && group.layout === "matching" ? (
                    <h3 className="runtime-group-title runtime-group-title-matching">{group.title}</h3>
                  ) : null}
                  {group.title && isFramedLayout && ["fill", "form", "summary"].includes(group.layout)
                    && !(group.layout === "form" && group.content?.some((block) => block.type === "table" && block.variant === "form")) ? (
                    <h3 className="runtime-group-title runtime-group-title-framed">{group.title}</h3>
                  ) : null}
                  <StructuredGroupContent
                    answers={answers}
                    content={group.content}
                    imageUrlByRef={imageUrlByRef}
                    isQuestionCorrect={isQuestionCorrect}
                    layout={group.layout}
                    onAnswerChange={onAnswerChange}
                    questionByNo={questionByNo}
                    submitted={submitted}
                    title={group.title}
                  />
                </div>
              </>
            ) : group.layout === "multi_select" ? (
              <div className="choice-options paper-choice-options paper-letter-choice-options runtime-multi-select">
                {groupQuestions.map((question) => (
                  <span aria-hidden="true" id={`question-${question.questionNo}`} key={question.id} />
                ))}
                {options.map((option) => {
                  const isSelected = selectedLetters.has(option.letter);
                  const isCorrectOption = singleSlot
                    ? correctLetters.has(option.letter)
                    : groupQuestions.some(
                        (question) =>
                          isAcceptedAnswer(option.letter, question.answers) ||
                          isAcceptedAnswer(option.text, question.answers),
                      );
                  const isWrongSelection = submitted && isSelected && !isCorrectOption;
                  return (
                    <label
                      className={`choice-option ${isSelected ? "selected-option" : ""} ${
                        submitted && isCorrectOption ? "correct-option" : ""
                      } ${isWrongSelection ? "wrong-option" : ""}`}
                      key={option.letter}
                    >
                      <span className="choice-status-icon">
                        {submitted && isCorrectOption ? "✅" : null}
                        {isWrongSelection ? "❌" : null}
                      </span>
                      <span
                        className={`choice-dot ${isSelected ? "selected" : ""}`}
                        style={{ borderRadius: 4 }}
                      />
                      <input
                        checked={isSelected}
                        disabled={submitted}
                        type="checkbox"
                        value={option.letter}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          const nextAnswers = updateRuntimeMultiSelectAnswers(
                            answers,
                            groupQuestions,
                            option.letter,
                            event.currentTarget.checked,
                            answerGroup?.selectionCount ?? groupQuestions.length,
                            answerGroup?.mode,
                          );
                          groupQuestions.forEach((question) =>
                            onAnswerChange(question.id, nextAnswers[question.id] ?? ""),
                          );
                        }}
                      />
                      <span className="choice-letter">{option.letter}</span>
                      <span>{option.text}</span>
                    </label>
                  );
                })}
              </div>
            ) : group.layout === "single_choice" ? (
              groupQuestions.map((question) => (
                <article className="paper-choice-question" id={`question-${question.questionNo}`} key={question.id}>
                  <p><strong>{question.questionNo}</strong> {cleanQuestionPrompt(question, group)}</p>
                    <div className="choice-options paper-choice-options paper-letter-choice-options">
                    {(group.options?.length ? group.options : parsePrompt(question.promptText).options).map((option) => {
                      const isSelected = (answers[question.id] ?? "").trim().toUpperCase() === option.letter;
                      const isCorrectOption =
                        isAcceptedAnswer(option.letter, question.answers) ||
                        isAcceptedAnswer(option.text, question.answers);
                      const isWrongSelection = submitted && isSelected && !isCorrectOption;
                      return (
                        <label
                          className={`choice-option ${isSelected ? "selected-option" : ""} ${
                            submitted && isCorrectOption ? "correct-option" : ""
                          } ${isWrongSelection ? "wrong-option" : ""}`}
                          key={option.letter}
                        >
                          <span className="choice-status-icon">
                            {submitted && isCorrectOption ? "✅" : null}
                            {isWrongSelection ? "❌" : null}
                          </span>
                          <span className={`choice-dot ${isSelected ? "selected" : ""}`} />
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
              ))
            ) : (
              <>
                {group.options?.length ? (
                  <div className={group.layout === "matching"
                    ? `paper-runtime-matching-options${group.optionsBoxed === false ? " paper-runtime-matching-options-plain" : ""}`
                    : "paper-option-box"}>
                    {group.options.map((option) => (
                      <span key={option.letter}><strong>{option.letter}</strong> {option.text}</span>
                    ))}
                  </div>
                ) : null}
                <section className={`paper-runtime-group paper-runtime-${group.layout}`}>
                  {groupQuestions.map((question) => (
                    <FillQuestion
                      answers={answers}
                      group={group}
                      isQuestionCorrect={isQuestionCorrect}
                      key={question.id}
                      onAnswerChange={onAnswerChange}
                      question={question}
                      submitted={submitted}
                    />
                  ))}
                </section>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
