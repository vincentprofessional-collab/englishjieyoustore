"use client";

import Link from "next/link";
import { VocabularyMobileBackLink } from "@/components/vocabulary-mobile-back-link";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { getExamContentOverride, type ExamContentId } from "@/lib/exam-content/overrides";
import { cleanExamSetNotice } from "@/lib/senior-high/v2-content-cleanup";
import type {
  SeniorHighAssetRef,
  SeniorHighBlock,
  SeniorHighOption,
  SeniorHighQuestion,
  SeniorHighSet,
} from "@/lib/senior-high/v2-types";
import {
  seniorHighAnswerMatches,
  gradeSeniorHighQuestion,
  seniorHighCorrectAnswer,
  seniorHighQuestionAnswered,
  type SeniorHighGrade,
  type SeniorHighV2Answers,
} from "@/lib/senior-high/v2-grading";
import { focusNextSeniorHighInlineAnswer } from "@/lib/senior-high/inline-navigation";
import "./senior-high-paper.css";

type RunnerProps = {
  kind: "paper" | "practice";
  setId: string;
  basePath?: string;
  backHref?: string;
  storageNamespace?: string;
};
type BlankBinding = { options: SeniorHighOption[]; question: SeniorHighQuestion };
type OptionDropHandler = (targetQuestionId: string | null, optionId: string, sourceQuestionId?: string) => void;

function isCetExam(basePath: string) {
  return basePath === "/cet4" || basePath === "/cet6";
}

function usesCetRunnerLayout(basePath: string) {
  return isCetExam(basePath) || basePath === "/kaoyan";
}

const TYPE_LABELS: Record<string, string> = {
  error_correction: "短文改错",
  essay: "写作",
  inline_fill: "语法／词汇填空",
  instruction_only: "说明",
  multi_blank: "多空填空",
  multi_choice: "多项选择",
  oral_response: "听说／口语",
  shared_option_matching: "七选五／匹配",
  short_answer: "短答",
  single_choice: "单项选择",
  table_fill: "表格填空",
  translation: "翻译",
};

function plainText(blocks: SeniorHighBlock[] | undefined): string {
  return (blocks || []).map((block) => {
    if (block.type === "heading" || block.type === "notice") return block.text;
    if (block.type === "paragraph" || block.type === "richText") return block.runs.map((run) => run.type === "text" ? run.text : "____").join("");
    if (block.type === "dialogue") return block.turns.map((turn) => `${turn.speaker}: ${plainText(turn.blocks)}`).join(" ");
    if (block.type === "table") return block.rows.map((row) => row.cells.map((cell) => plainText(cell)).join(" ")).join(" ");
    if (block.type === "image") return block.alt;
    return block.label || "";
  }).join(" ").trim();
}

function normalizedText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function extractGroupDirections(blocks: SeniorHighBlock[]) {
  const directionIndex = blocks.findIndex((block) => /^directions?\s*:/i.test(plainText([block])));
  if (directionIndex < 0) return { directions: [] as SeniorHighBlock[], stimulus: blocks };

  let start = directionIndex;
  if (start > 0 && /^section\s+[a-z0-9]+$/i.test(plainText([blocks[start - 1]]))) start -= 1;
  let end = directionIndex;
  const firstText = plainText([blocks[directionIndex]]);
  if (!/answer\s+sheet\s+\d/i.test(firstText)) {
    for (let index = directionIndex + 1; index < Math.min(blocks.length, directionIndex + 8); index += 1) {
      const text = plainText([blocks[index]]).trim();
      if (!text || /^(?:passage\b|questions?\s+\d|[A-O]\))/i.test(text)) break;
      if (!/^(?:[a-z]|each\b|please\b|you\b|mark\b|choose\b|read\b|for each\b|answer\b|there (?:is|are)\b)/i.test(text)) break;
      end = index;
      if (/answer\s+sheet\s+\d/i.test(text)) break;
    }
  }

  return {
    directions: blocks.slice(start, end + 1),
    stimulus: [...blocks.slice(0, start), ...blocks.slice(end + 1)],
  };
}

function parseLegacyWordBank(blocks: SeniorHighBlock[], options: SeniorHighOption[], enabled: boolean) {
  if (!enabled || options.length === 0) return { options, stimulus: blocks };
  const markerPattern = /(?:^|\s)([A-O])\)\s*/g;
  const minimumLabels = Math.min(8, options.length);

  for (let start = 0; start < blocks.length; start += 1) {
    const firstText = plainText([blocks[start]]).trim();
    if (!/^[A-O]\)\s*\S/i.test(firstText)) continue;
    let end = start;
    while (end + 1 < blocks.length && /^[A-O]\)\s*\S/i.test(plainText([blocks[end + 1]]).trim())) end += 1;
    const bankText = blocks.slice(start, end + 1).map((block) => plainText([block])).join(" ");
    const markers = [...bankText.matchAll(markerPattern)];
    const values = new Map<string, string>();
    for (let index = 0; index < markers.length; index += 1) {
      const marker = markers[index];
      const valueStart = (marker.index ?? 0) + marker[0].length;
      const valueEnd = index + 1 < markers.length ? markers[index + 1].index ?? bankText.length : bankText.length;
      values.set(marker[1].toUpperCase(), bankText.slice(valueStart, valueEnd).trim());
    }
    if (values.size < minimumLabels) continue;

    const normalizedOptions = options.map((option) => {
      if (plainText(option.blocks)) return option;
      const text = values.get(option.label.toUpperCase()) || values.get(option.id.toUpperCase());
      return text ? { ...option, blocks: [{ type: "paragraph" as const, runs: [{ type: "text" as const, text }] }] } : option;
    });
    return {
      options: normalizedOptions,
      stimulus: [...blocks.slice(0, start), ...blocks.slice(end + 1)],
    };
  }

  return { options, stimulus: blocks };
}

function clipTextBlock(block: SeniorHighBlock, cutoff: number): SeniorHighBlock | null {
  if (block.type !== "paragraph" && block.type !== "richText") return block;
  let remaining = cutoff;
  const runs = [];
  for (const run of block.runs) {
    if (run.type === "text") {
      if (remaining <= 0) break;
      const text = run.text.slice(0, remaining).trimEnd();
      if (text) runs.push({ ...run, text });
      remaining -= run.text.length;
    } else {
      if (remaining < 4) break;
      runs.push(run);
      remaining -= 4;
    }
  }
  return runs.length ? { ...block, runs } : null;
}

function duplicateQuestionStart(text: string, questions: SeniorHighQuestion[]) {
  for (const question of questions) {
    const number = question.sourceQuestionNumber ?? question.displayNumber;
    const prompt = normalizedText(plainText(question.promptBlocks));
    if (!prompt) continue;
    const marker = new RegExp(`(?:^|\\s)${number}\\s*[.．、)]\\s*`, "g");
    for (const match of text.matchAll(marker)) {
      const start = match.index ?? 0;
      const promptStart = start + match[0].length;
      if (normalizedText(text.slice(promptStart)).startsWith(prompt)) return start;
    }
  }
  return -1;
}

function isDuplicateOptionBlock(block: SeniorHighBlock, questions: SeniorHighQuestion[]) {
  const text = plainText([block]).trim();
  const match = text.match(/^([A-O])[).、]\s*([\s\S]+)$/i);
  if (!match) return false;
  const optionText = normalizedText(match[2]);
  return questions.some((question) => question.options.some((option) => {
    const expected = normalizedText(plainText(option.blocks));
    return option.label.toUpperCase() === match[1].toUpperCase() && expected && optionText.startsWith(expected);
  }));
}

function removeDuplicateQuestionText(blocks: SeniorHighBlock[], questions: SeniorHighQuestion[]) {
  return blocks.flatMap((block) => {
    if (isDuplicateOptionBlock(block, questions)) return [];
    const duplicateStart = duplicateQuestionStart(plainText([block]), questions);
    if (duplicateStart < 0) return [block];
    if (block.type !== "paragraph" && block.type !== "richText") return [];
    const clipped = clipTextBlock(block, duplicateStart);
    return clipped ? [clipped] : [];
  });
}

function setOptionDragData(dataTransfer: DataTransfer, optionId: string, sourceQuestionId?: string) {
  dataTransfer.setData("text/senior-high-option", optionId);
  if (sourceQuestionId) dataTransfer.setData("text/senior-high-source-question", sourceQuestionId);
  dataTransfer.setData("text/plain", JSON.stringify({ optionId, sourceQuestionId: sourceQuestionId || "" }));
  dataTransfer.effectAllowed = "move";
}

function readOptionDragData(dataTransfer: DataTransfer) {
  let payload: { optionId?: string; sourceQuestionId?: string } = {};
  try {
    payload = JSON.parse(dataTransfer.getData("text/plain")) as typeof payload;
  } catch {
    // Other browsers may expose only the plain option id.
  }
  return {
    optionId: dataTransfer.getData("text/senior-high-option") || payload.optionId || dataTransfer.getData("text/plain"),
    sourceQuestionId: dataTransfer.getData("text/senior-high-source-question") || payload.sourceQuestionId || "",
  };
}

function displayNumber(question: SeniorHighQuestion, _kind: SeniorHighSet["kind"]) {
  return question.displayLabel ?? question.displayNumber;
}

const QUESTION_NAV_PAGE_SIZE = 50;
const SOLUTION_MARKER = /(?:^|\n)\s*(?:【\s*(?:(?:参考)?(?:答案|解析|导语)|\d{1,3}\s*题详解)\s*】|(?:(?:选择题|英语|参考)?答案|解析|导语|故填|故选)\s*(?:[：:]|是|为|\d|[（(]|[A-Ha-h]|[a-z]|$)|\d{1,3}\s*题详解\s*(?:[：:]|是|为|\d|[（(]|和|$))/i;
const NUMBERED_ANSWER_LINE = /^\s*\d{1,3}\s*[.．、]\s*(?:[a-z][a-z'-]*|[A-H])(?:\s+\d{1,3}\s*[.．、]\s*(?:[a-z][a-z'-]*|[A-H]))*\s*$/;
const WRITING_LINE_RE = /_{4,}|＿{4,}|-{8,}|—{6,}/g;

function clozeTextWithoutSourceLines(text: string) {
  return text.replace(/[_＿]+\s*\d{1,3}\s*[_＿]+/g, "").replace(/[_＿]+/g, "");
}

function clozeRunsWithoutSourceLines(
  runs: Extract<SeniorHighBlock, { type: "paragraph" | "richText" }>["runs"],
) {
  return runs.map((run, index) => {
    if (run.type !== "text") return run;
    let text = clozeTextWithoutSourceLines(run.text);
    const original = run.text;
    if (runs[index + 1]?.type === "blank" && /[_＿]\s*\d{1,3}\s*$/.test(original)) text = text.replace(/\d{1,3}\s*$/, "");
    if (runs[index - 1]?.type === "blank" && /^\s*\d{1,3}\s*[_＿]/.test(original)) text = text.replace(/^\s*\d{1,3}/, "");
    return { ...run, text };
  });
}

function solutionMarkerIndex(text: string) {
  const markerIndex = text.search(SOLUTION_MARKER);
  return markerIndex >= 0 || NUMBERED_ANSWER_LINE.test(text) ? Math.max(markerIndex, 0) : -1;
}

function isWritingLineBlock(block: SeniorHighBlock) {
  if (block.type !== "paragraph" && block.type !== "richText") return false;
  const text = block.runs.filter((run) => run.type === "text").map((run) => run.text).join("");
  return Boolean(text.trim()) && !text.replace(WRITING_LINE_RE, "").trim();
}

function writingPromptPieces(blocks: SeniorHighBlock[]) {
  const pieces: Array<{ kind: "blocks"; blocks: SeniorHighBlock[] } | { kind: "input"; index: number }> = [];
  let pendingInput = false;
  let inputIndex = 0;
  for (const block of blocks) {
    const continuationStarter = (block.type === "paragraph" || block.type === "richText")
      && /^\s*(?:para(?:graph)?\s*)\d+\s*[:：]/i.test(block.runs.filter((run) => run.type === "text").map((run) => run.text).join(""));
    if (continuationStarter) {
      pendingInput = false;
      const previous = pieces[pieces.length - 1];
      if (previous?.kind === "blocks") previous.blocks.push(block);
      else pieces.push({ kind: "blocks", blocks: [block] });
      pieces.push({ kind: "input", index: inputIndex++ });
      continue;
    }
    if (isWritingLineBlock(block)) {
      if (!pendingInput) pieces.push({ kind: "input", index: inputIndex++ });
      pendingInput = true;
      continue;
    }
    pendingInput = false;
    const previous = pieces[pieces.length - 1];
    if (previous?.kind === "blocks") previous.blocks.push(block);
    else pieces.push({ kind: "blocks", blocks: [block] });
  }
  return pieces;
}

function withoutLeadingQuestionNumber(blocks: SeniorHighBlock[]) {
  let handledFirstText = false;
  return blocks.map((block) => {
    if (handledFirstText || (block.type !== "paragraph" && block.type !== "richText")) return block;
    const runs = block.runs.map((run) => {
      if (handledFirstText || run.type !== "text" || !run.text.trim()) return run;
      handledFirstText = true;
      return { ...run, text: run.text.replace(/^\s*\d{1,3}\s*[.．、]\s*/, "") };
    });
    return { ...block, runs };
  });
}

function splitWritingSignature(blocks: SeniorHighBlock[]) {
  const signature: string[] = [];
  let signatureStarted = false;
  const content = blocks.filter((block) => {
    if (block.type !== "paragraph" && block.type !== "richText") return true;
    const text = block.runs.filter((run) => run.type === "text").map((run) => run.text).join("").trim();
    if (/^(?:best\s+wishes|yours(?:\s+(?:sincerely|faithfully))?)\s*,?$/i.test(text)) {
      signatureStarted = true;
      signature.push(text);
      return false;
    }
    if (signatureStarted && /^[A-Z][A-Za-z .'-]{1,40}$/.test(text)) {
      signature.push(text);
      return false;
    }
    return true;
  });
  return { content, signature };
}

function visibleRuns(
  runs: Extract<SeniorHighBlock, { type: "paragraph" | "richText" }>["runs"],
  revealSolutions: boolean,
) {
  if (revealSolutions) return runs;
  const output: typeof runs = [];
  let solutionStarted = false;
  for (const run of runs) {
    if (solutionStarted) continue;
    if (run.type === "blank") {
      output.push(run);
      continue;
    }
    const markerIndex = solutionMarkerIndex(run.text);
    if (markerIndex < 0) {
      output.push(run);
      continue;
    }
    solutionStarted = true;
    const prefix = run.text.slice(0, markerIndex).trimEnd();
    if (prefix.trim()) output.push({ ...run, text: prefix });
  }
  return output;
}

function BlockRenderer({
  answers,
  assets,
  bindings,
  blocks,
  basePath = "/senior-high",
  kind,
  onAnswer,
  onOptionDrop,
  wordBankQuestions,
  revealSolutions = true,
  writingPlaceholder,
  hideWritingImages = false,
  hideWritingLines = false,
  hideClozeLines = false,
}: {
  answers: SeniorHighV2Answers;
  assets: Map<string, SeniorHighAssetRef>;
  bindings: Map<string, BlankBinding>;
  blocks: SeniorHighBlock[];
  basePath?: string;
  kind: SeniorHighSet["kind"];
  onAnswer: (key: string, value: string) => void;
  onOptionDrop?: OptionDropHandler;
  wordBankQuestions?: Map<number, SeniorHighQuestion>;
  revealSolutions?: boolean;
  writingPlaceholder?: string;
  hideWritingImages?: boolean;
  hideWritingLines?: boolean;
  hideClozeLines?: boolean;
}) {
  const renderRuns = (sourceRuns: Extract<SeniorHighBlock, { type: "paragraph" | "richText" }>["runs"]) => {
    const runs = hideClozeLines ? clozeRunsWithoutSourceLines(sourceRuns) : sourceRuns;
    return runs.map((run, index) => {
    if (run.type === "text") {
      const text = hideWritingLines ? run.text.replace(WRITING_LINE_RE, "") : writingPlaceholder ? run.text.replace(WRITING_LINE_RE, writingPlaceholder) : run.text;
      if (!text) return null;
      if (wordBankQuestions?.size && onOptionDrop) {
        const pieces: ReactNode[] = [];
        const sourceBlank = /_{1,}\s*(\d{1,3})\s*_{1,}|_{1,}\s*(\d{1,3})\b|\b(\d{1,3})\s*_{1,}/g;
        let cursor = 0;
        for (const match of text.matchAll(sourceBlank)) {
          const sourceNumber = Number(match[1] || match[2] || match[3]);
          const question = wordBankQuestions.get(sourceNumber);
          if (!question || match.index === undefined) continue;
          if (match.index > cursor) pieces.push(text.slice(cursor, match.index));
          const assigned = answers[question.id] || "";
          const assignedCorrect = revealSolutions && question.answerSpec.gradingMode === "auto" && question.answerSpec.kind === "choice" ? seniorHighAnswerMatches(assigned, question.answerSpec.acceptedAnswers || [], question.answerSpec) : null;
          const choiceState = assignedCorrect === true ? " correct" : assignedCorrect === false ? " incorrect" : "";
          pieces.push(<span className="senior-high-v2-inline-control cet4-word-bank-inline-control" id={question.id} key={`word-bank-${question.id}`}><b>{sourceNumber}</b><button aria-label={`第 ${sourceNumber} 题选词答案空`} className={`senior-high-v2-choice-blank drop-target${assigned ? " assigned" : ""}${choiceState}`} data-senior-high-drop-target="true" draggable={Boolean(assigned)} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDragStart={(event) => { if (!assigned) return; setOptionDragData(event.dataTransfer, assigned, question.id); }} onDrop={(event) => { event.preventDefault(); const { optionId, sourceQuestionId } = readOptionDragData(event.dataTransfer); if (!optionId) return; onOptionDrop(question.id, optionId, sourceQuestionId || undefined); }} type="button"><span>{assigned}</span>{assignedCorrect === true ? <strong aria-label="正确选项" className="senior-high-option-status">✓</strong> : assignedCorrect === false ? <strong aria-label="回答错误" className="senior-high-option-status">×</strong> : null}</button></span>);
          cursor = match.index + match[0].length;
        }
        if (pieces.length) {
          if (cursor < text.length) pieces.push(text.slice(cursor));
          return <Fragment key={`text-${index}`}>{pieces}</Fragment>;
        }
      }
      return run.underline ? <u key={`text-${index}`}>{text}</u> : <Fragment key={`text-${index}`}>{text}</Fragment>;
    }
    const binding = bindings.get(run.blankId);
    if (!binding) return <span className="senior-high-v2-missing-blank" key={run.blankId}>____</span>;
    const { question } = binding;
    const number = displayNumber(question, kind);
    if (["inline_fill", "multi_blank", "table_fill"].includes(question.type)) {
      const blankCorrect = revealSolutions && question.answerSpec.gradingMode === "auto" && question.answerSpec.kind === "per_blank" ? seniorHighAnswerMatches(answers[run.blankId] || "", question.answerSpec.perBlankAnswers?.[run.blankId] || [], question.answerSpec) : null;
      const answerState = blankCorrect === true ? " correct" : blankCorrect === false ? " incorrect" : "";
      return <span className="senior-high-v2-inline-control" id={question.id} key={run.blankId}><b>{number}</b><input aria-label={`第 ${number} 题答案`} autoCapitalize="none" autoComplete="off" autoCorrect="off" className={`senior-high-inline-answer${answerState}`} data-1p-ignore="true" data-form-type="other" data-lpignore="true" data-senior-high-inline-answer="true" name={`senior-high-${kind}-${run.blankId}`} onChange={(event) => onAnswer(run.blankId, event.target.value)} onKeyDown={(event) => { if (event.key !== "Enter" || event.nativeEvent.isComposing) return; event.preventDefault(); focusNextSeniorHighInlineAnswer(event.currentTarget); }} spellCheck={false} type="text" value={answers[run.blankId] || ""} /></span>;
    }
    if (question.type === "shared_option_matching") {
      const assigned = answers[question.id] || "";
      const assignedCorrect = revealSolutions && question.answerSpec.gradingMode === "auto" && question.answerSpec.kind === "choice" ? seniorHighAnswerMatches(assigned, question.answerSpec.acceptedAnswers || [], question.answerSpec) : null;
      const choiceState = assignedCorrect === true ? " correct" : assignedCorrect === false ? " incorrect" : "";
      if (question.typeLabel === "选词填空") {
        return <span className="senior-high-v2-inline-control" id={question.id} key={run.blankId}><b>{number}</b><button aria-label={`第 ${number} 题选词答案空`} className={`senior-high-v2-choice-blank drop-target${assigned ? " assigned" : ""}${choiceState}`} data-senior-high-drop-target="true" draggable={Boolean(assigned)} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDragStart={(event) => { if (!assigned) return; setOptionDragData(event.dataTransfer, assigned, question.id); }} onDrop={(event) => { event.preventDefault(); const { optionId, sourceQuestionId } = readOptionDragData(event.dataTransfer); if (optionId) onOptionDrop?.(question.id, optionId, sourceQuestionId || undefined); }} type="button"><span>{assigned}</span></button></span>;
      }
      const paragraphSelect = <select aria-label={`第 ${number} 题段落`} className={`senior-high-inline-answer${choiceState}`} onChange={(event) => { if (event.target.value) onOptionDrop?.(question.id, event.target.value, question.id); else if (assigned) onOptionDrop?.(null, assigned, question.id); }} value={assigned}><option value="" />{binding.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>;
      return <span className="senior-high-v2-inline-control" id={question.id} key={run.blankId}><b>{number}</b><span className="senior-high-v2-inline-select"><span aria-hidden="true" className="senior-high-v2-inline-select-value">{binding.options.find((option) => option.id === assigned)?.label || ""}</span>{paragraphSelect}</span>{assignedCorrect === true ? <strong aria-label="正确选项" className="senior-high-option-status">✓</strong> : assignedCorrect === false ? <strong aria-label="回答错误" className="senior-high-option-status">×</strong> : null}</span>;
    }
    return <button aria-label={`跳到第 ${number} 题选项`} className="senior-high-v2-choice-blank" id={`${question.id}-blank`} key={run.blankId} onClick={() => document.getElementById(question.id)?.scrollIntoView({ behavior: "smooth", block: "center" })} type="button"><b>{number}</b><span>{answers[question.id] || ""}</span></button>;
    });
  };

  let solutionStarted = false;
  return <>{blocks.map((block, index) => {
    const key = block.id || `${block.type}-${index}`;
    if (!revealSolutions && solutionStarted) return null;
    if (block.type === "heading") {
      if (!revealSolutions && solutionMarkerIndex(block.text) >= 0) {
        solutionStarted = true;
        return null;
      }
      if (block.level === 1) return <h2 key={key}>{block.text}</h2>;
      if (block.level === 2) return <h3 key={key}>{block.text}</h3>;
      return <h4 key={key}>{block.text}</h4>;
    }
    if (block.type === "paragraph") {
      const runs = visibleRuns(block.runs, revealSolutions);
      if (!revealSolutions && block.runs.some((run) => run.type === "text" && solutionMarkerIndex(run.text) >= 0)) solutionStarted = true;
      const visibleText = hideWritingLines || hideClozeLines ? runs.filter((run) => run.type === "blank" || run.text.replace(hideClozeLines ? /[_＿]+/g : WRITING_LINE_RE, "").trim()) : runs;
      return visibleText.length > 0 ? <p className="senior-high-v2-paragraph" key={key}>{renderRuns(visibleText)}</p> : null;
    }
    if (block.type === "richText") {
      const runs = visibleRuns(block.runs, revealSolutions);
      if (!revealSolutions && block.runs.some((run) => run.type === "text" && solutionMarkerIndex(run.text) >= 0)) solutionStarted = true;
      const visibleText = hideWritingLines || hideClozeLines ? runs.filter((run) => run.type === "blank" || run.text.replace(hideClozeLines ? /[_＿]+/g : WRITING_LINE_RE, "").trim()) : runs;
      return visibleText.length > 0 ? <div className="senior-high-v2-paragraph" key={key}>{renderRuns(visibleText)}</div> : null;
    }
    if (block.type === "notice") {
      if (!revealSolutions && solutionMarkerIndex(block.text) >= 0) {
        solutionStarted = true;
        return null;
      }
      return <div className={`senior-high-v2-notice ${block.tone || "info"}`} key={key}>{block.text}</div>;
    }
    if (block.type === "image") {
      if (hideWritingImages && block.alt.trim().toLowerCase() === "source image") return null;
      const asset = assets.get(block.assetId);
      return asset ? <figure className="senior-high-v2-figure" key={key}>{asset.url.startsWith("/cet4/evidence/") ? <a href={asset.url} rel="noreferrer" target="_blank"><img alt={block.alt} decoding="async" loading="lazy" src={asset.url} /></a> : <img alt={block.alt} src={asset.url} />}{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure> : null;
    }
    if (block.type === "audio") {
      const asset = assets.get(block.assetId);
      return asset ? <div className="senior-high-v2-media" key={key}><span>{block.label || "听力音频"}</span><audio controls preload="metadata" src={asset.url} /></div> : null;
    }
    if (block.type === "video") {
      const asset = assets.get(block.assetId);
      return asset ? <div className="senior-high-v2-media" key={key}><span>{block.label || "视频"}</span><video controls preload="metadata" src={asset.url} /></div> : null;
    }
    if (block.type === "dialogue") return <div className="senior-high-v2-dialogue" key={key}>{block.turns.map((turn, turnIndex) => <div key={`${turn.speaker}-${turnIndex}`}><strong>{turn.speaker}</strong><div><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={turn.blocks} basePath={basePath} kind={kind} onAnswer={onAnswer} onOptionDrop={onOptionDrop} wordBankQuestions={wordBankQuestions} revealSolutions={revealSolutions} writingPlaceholder={writingPlaceholder} hideWritingImages={hideWritingImages} hideWritingLines={hideWritingLines} hideClozeLines={hideClozeLines} /></div></div>)}</div>;
    return <div className="senior-high-v2-table-wrap" key={key}><table><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.cells.map((cell, cellIndex) => <td key={cellIndex}><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={cell} basePath={basePath} kind={kind} onAnswer={onAnswer} onOptionDrop={onOptionDrop} wordBankQuestions={wordBankQuestions} revealSolutions={revealSolutions} writingPlaceholder={writingPlaceholder} hideWritingImages={hideWritingImages} hideWritingLines={hideWritingLines} hideClozeLines={hideClozeLines} /></td>)}</tr>)}</tbody></table></div>;
  })}</>;
}

function Feedback({
  answers,
  assets,
  bindings,
  basePath,
  grade,
  kind,
  onAnswer,
  question,
  hasGroupExplanation = false,
}: {
  answers: SeniorHighV2Answers;
  assets: Map<string, SeniorHighAssetRef>;
  bindings: Map<string, BlankBinding>;
  basePath?: string;
  grade: SeniorHighGrade;
  kind: SeniorHighSet["kind"];
  onAnswer: (key: string, value: string) => void;
  question: SeniorHighQuestion;
  hasGroupExplanation?: boolean;
}) {
  const labels: Record<SeniorHighGrade, string> = {
    conflict: "答案存在冲突，待人工复核",
    correct: "✓ 正确",
    incorrect: "✕ 未答对",
    manual: "已提交，请对照参考答案自行评阅",
    none: "已提交，暂无标准答案",
    unanswered: "未作答",
  };
  const answer = seniorHighCorrectAnswer(question);
  const hasReference = question.answerSpec.kind === "reference" && question.answerSpec.referenceAnswer;
  return <div className={`senior-high-feedback ${grade}`}>
    <span>{labels[grade]}</span>
    {answer ? <strong>答案：{answer}</strong> : null}
    {hasReference ? <strong>参考答案／范文见下方</strong> : null}
    {question.explanationBlocks.length === 0 && !hasReference && !hasGroupExplanation ? <small>{answer ? "暂无解析" : ""}</small> : null}
    {hasReference ? <div className="senior-high-analysis"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={Array.isArray(question.answerSpec.referenceAnswer) ? question.answerSpec.referenceAnswer : [{ type: "paragraph", runs: [{ type: "text", text: question.answerSpec.referenceAnswer || "" }] }]} basePath={basePath} kind={kind} onAnswer={onAnswer} /></div> : null}
    {question.explanationBlocks.length > 0 ? <div className="senior-high-analysis"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={question.explanationBlocks} basePath={basePath} kind={kind} onAnswer={onAnswer} /></div> : null}
  </div>;
}

function QuestionCard({
  answers,
  assets,
  bindings,
  basePath,
  kind,
  onAnswer,
  onOptionDrop,
  question,
  hideMeta = false,
  hasGroupExplanation = false,
  feedbackOnly = false,
  submitted,
}: {
  answers: SeniorHighV2Answers;
  assets: Map<string, SeniorHighAssetRef>;
  bindings: Map<string, BlankBinding>;
  basePath?: string;
  kind: SeniorHighSet["kind"];
  onAnswer: (key: string, value: string) => void;
  onOptionDrop?: OptionDropHandler;
  question: SeniorHighQuestion;
  hideMeta?: boolean;
  hasGroupExplanation?: boolean;
  feedbackOnly?: boolean;
  submitted: boolean;
}) {
  const writingSignature = question.type === "essay" ? splitWritingSignature(question.promptBlocks) : { content: question.promptBlocks, signature: [] };
  const promptBlocks = withoutLeadingQuestionNumber(writingSignature.content);
  const writingAfterLines = [...(question.writingFrame?.after || []), ...writingSignature.signature];
  const inlineOnly = ["inline_fill", "multi_blank", "table_fill", "shared_option_matching"].includes(question.type) && promptBlocks.length === 0 && question.options.length === 0;
  const grade = gradeSeniorHighQuestion(question, answers);
  if (feedbackOnly) return submitted ? <div className="senior-high-v2-inline-feedback" key={question.id}><b>第 {displayNumber(question, kind)} 题</b><Feedback answers={answers} assets={assets} bindings={bindings} basePath={basePath} grade={grade} kind={kind} onAnswer={onAnswer} question={question} hasGroupExplanation={hasGroupExplanation} /></div> : null;
  if (inlineOnly) return submitted ? <div className="senior-high-v2-inline-feedback" key={question.id}><b>第 {displayNumber(question, kind)} 题</b><Feedback answers={answers} assets={assets} bindings={bindings} basePath={basePath} grade={grade} kind={kind} onAnswer={onAnswer} question={question} hasGroupExplanation={hasGroupExplanation} /></div> : null;
  const value = answers[question.id] || "";
  const selected = new Set(value.split(",").filter(Boolean));
  const correctOptionIds = new Set((question.answerSpec.acceptedAnswers || []).map((optionId) => optionId.trim().toUpperCase()));
  const hasChoiceAnswer = question.answerSpec.kind === "choice" && correctOptionIds.size > 0;
  const showChoiceFeedback = hasChoiceAnswer && (submitted || (kind === "practice" && Boolean(value)));
  const choose = (optionId: string) => {
    if (question.type !== "multi_choice") return onAnswer(question.id, optionId);
    const next = new Set(selected);
    if (next.has(optionId)) next.delete(optionId); else next.add(optionId);
    onAnswer(question.id, [...next].sort().join(","));
  };
  const textInput = ["short_answer", "translation", "error_correction", "essay", "oral_response"].includes(question.type);
  const writingPlaceholder = question.type === "essay" ? "请在这里完成正文…" : question.correctionStatement ? "请在这里说明错误及理由…" : question.type === "oral_response" ? "请在这里记录口语回答要点…" : "请在这里完成答案…";
  const writingPieces = question.type === "essay" && !question.writingFrame ? writingPromptPieces(promptBlocks) : [];
  const embeddedWriting = writingPieces.some((piece) => piece.kind === "input");
  const writingInputCount = embeddedWriting ? writingPieces.filter((piece) => piece.kind === "input").length : 1;
  const writingValues = Array.from({ length: writingInputCount }, (_, index) => writingInputCount === 1 ? value : answers[`${question.id}:writing:${index}`] || "");
  const updateWriting = (index: number, nextValue: string) => {
    if (writingInputCount === 1) return onAnswer(question.id, nextValue);
    const nextValues = [...writingValues];
    nextValues[index] = nextValue;
    onAnswer(`${question.id}:writing:${index}`, nextValue);
    onAnswer(question.id, nextValues.join("\n\n"));
  };
  const markedWords = new Set((answers[`${question.id}:marked`] || "").split(",").filter(Boolean));
  return <article className="senior-high-question-card" id={question.type === "shared_option_matching" && promptBlocks.length ? `${question.id}-card` : question.id}>
    {!hideMeta && !(question.type === "shared_option_matching" && question.blanks.length > 0) ? <div className="senior-high-question-meta"><span>{question.displayLabel || `第 ${displayNumber(question, kind)} 题`}</span><small>{question.typeLabel || TYPE_LABELS[question.type] || question.type}{question.sourceQuestionNumber !== undefined && (question.sourceQuestionNumber !== question.displayNumber || question.sourceQuestionLabel && question.sourceQuestionLabel !== String(question.sourceQuestionNumber)) ? ` · 原题 ${question.sourceQuestionLabel || question.sourceQuestionNumber}` : ""}</small></div> : null}
    {promptBlocks.length > 0 ? <div className={`senior-high-v2-question-prompt${embeddedWriting ? " senior-high-writing-prompt" : ""}`}>{embeddedWriting ? writingPieces.map((piece) => piece.kind === "blocks" ? <BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={piece.blocks} basePath={basePath} kind={kind} key={`writing-blocks-${piece.blocks[0]?.id || piece.blocks.length}`} onAnswer={onAnswer} revealSolutions={submitted} hideWritingImages={question.type === "essay"} hideWritingLines /> : <textarea aria-label={`第 ${displayNumber(question, kind)} 题正文第 ${piece.index + 1} 段`} className="senior-high-answer-input senior-high-writing-input" data-senior-high-writing-input="true" key={`writing-input-${piece.index}`} onChange={(event) => updateWriting(piece.index, event.target.value)} placeholder={writingPlaceholder} rows={6} value={writingValues[piece.index]} />) : <BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={promptBlocks} basePath={basePath} kind={kind} onAnswer={onAnswer} onOptionDrop={onOptionDrop} revealSolutions={submitted} hideWritingImages={question.type === "essay"} hideWritingLines={textInput} />}</div> : null}
    {question.options.length > 0 ? <div className="senior-high-options">{question.options.map((option) => { const isSelected = selected.has(option.id); const isCorrect = correctOptionIds.has(option.id.trim().toUpperCase()); const optionState = showChoiceFeedback && isCorrect ? "correct-option" : showChoiceFeedback && isSelected ? "incorrect-option" : isSelected ? "selected" : ""; return <button aria-pressed={isSelected} className={optionState} key={option.id} onClick={() => choose(option.id)} type="button"><b>{option.label}.</b><span>{plainText(option.blocks)}</span>{showChoiceFeedback && isCorrect ? <strong aria-label="正确选项" className="senior-high-option-status">✓</strong> : null}{showChoiceFeedback && isSelected && !isCorrect ? <strong aria-label="回答错误" className="senior-high-option-status">×</strong> : null}</button>; })}</div> : null}
    {question.correctionStatement ? <div className="senior-high-correction"><small>点击句中词语划线标错，再在下方说明原因；再次点击可取消。</small><p>{question.correctionStatement.split(/\s+/).map((word, index) => <Fragment key={index}><button aria-pressed={markedWords.has(String(index))} className={markedWords.has(String(index)) ? "marked" : ""} onClick={() => { const next = new Set(markedWords); if (next.has(String(index))) next.delete(String(index)); else next.add(String(index)); onAnswer(`${question.id}:marked`, [...next].sort((a, b) => Number(a) - Number(b)).join(",")); }} type="button">{word}</button>{" "}</Fragment>)}</p></div> : null}
    {textInput && !embeddedWriting ? <div className="senior-high-writing-response">{question.writingFrame?.before.map((line) => <p key={line}>{line.replace(WRITING_LINE_RE, "")}</p>)}<textarea aria-label={`第 ${displayNumber(question, kind)} 题答案`} className={`senior-high-answer-input${question.type === "translation" ? " senior-high-auto-grow" : ""}`} data-senior-high-writing-input="true" onChange={(event) => { if (question.type === "translation") { event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`; } updateWriting(0, event.target.value); }} placeholder={writingPlaceholder} rows={question.type === "essay" ? 6 : 4} value={writingValues[0]} />{writingAfterLines.length > 0 ? <div className="senior-high-letter-signature">{writingAfterLines.map((line, index) => <p key={`${line}-${index}`}>{line.replace(WRITING_LINE_RE, "")}</p>)}</div> : null}{question.type === "essay" ? <small className="senior-high-v2-word-count">当前 {writingValues.join(" ").trim() ? writingValues.join(" ").trim().split(/\s+/).length : 0} 词{question.writingFrame ? "（不含已给出的开头和结尾）" : ""}</small> : null}</div> : null}
    {question.type === "essay" && embeddedWriting ? <>{writingAfterLines.length > 0 ? <div className="senior-high-letter-signature">{writingAfterLines.map((line, index) => <p key={`${line}-${index}`}>{line.replace(WRITING_LINE_RE, "")}</p>)}</div> : null}<small className="senior-high-v2-word-count">当前 {writingValues.join(" ").trim() ? writingValues.join(" ").trim().split(/\s+/).length : 0} 词</small></> : null}
    {submitted && question.type !== "instruction_only" ? <Feedback answers={answers} assets={assets} bindings={bindings} grade={grade} kind={kind} onAnswer={onAnswer} question={question} hasGroupExplanation={hasGroupExplanation} /> : null}
  </article>;
}

export function SeniorHighRunner({ kind, setId, basePath = "/senior-high", backHref, storageNamespace = "senior-high:v2:2" }: RunnerProps) {
  const [data, setData] = useState<SeniorHighSet | null>(null);
  const [answers, setAnswers] = useState<SeniorHighV2Answers>({});
  const [submittedGroups, setSubmittedGroups] = useState<Record<string, boolean>>({});
  const [restoredStorageKey, setRestoredStorageKey] = useState("");
  const [error, setError] = useState("");
  const [openQuestionGroup, setOpenQuestionGroup] = useState<number | null>(null);
  const [practiceSection, setPracticeSection] = useState("");
  const [practiceYear, setPracticeYear] = useState("");
  const practiceYears = useMemo(() => ["/cet4", "/cet6", "/kaoyan"].includes(basePath) && kind === "practice" ? [...new Set(data?.sections.map((section) => section.sourceYear).filter((year): year is string => Boolean(year)))].sort((a, b) => (Number(b) || 0) - (Number(a) || 0)) : [], [basePath, data, kind]);
  const activePracticeYear = practiceYear === "全部" || practiceYears.includes(practiceYear) ? practiceYear : practiceYears[0];
  const selectPracticePaper = basePath === "/cet6" && kind === "practice";
  const visibleSections = useMemo(() => {
    const sections = data?.sections.filter((section) => !practiceYears.length || activePracticeYear === "全部" || section.sourceYear === activePracticeYear) || [];
    if (!selectPracticePaper) return sections;
    const selected = sections.find((section) => section.id === practiceSection) || sections.at(-1);
    return selected ? [selected] : [];
  }, [activePracticeYear, data, practiceYears.length, practiceSection, selectPracticePaper]);
  const storageKey = `${storageNamespace}:${kind}:${setId}`;
  const restored = restoredStorageKey === storageKey;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setData(null);
    setError("");
    const exam: ExamContentId | null = basePath === "/cet4" ? "cet4" : basePath === "/cet6" ? "cet6" : basePath === "/kaoyan" ? "postgraduate" : null;
    const loadSet = async () => {
      if (exam) {
        const stored = await getExamContentOverride(exam, setId).catch(() => null);
        if (controller.signal.aborted) return;
        const override = stored && !stored.error ? stored.override : null;
        if (override?.is_deleted) throw new Error("这套资料已从管理员后台删除，请返回列表。");
        if (override?.bank_data) {
          if (active) setData(cleanExamSetNotice(override.bank_data as SeniorHighSet));
          return;
        }
      }
      const response = await fetch(`${basePath}/${kind === "paper" ? "papers" : "practice"}/${encodeURIComponent(setId)}.json`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("这套资料暂时无法载入，请返回后重试。");
      const payload = await response.json() as SeniorHighSet;
      if (active) setData(cleanExamSetNotice(payload));
    };
    void loadSet().catch((loadError: unknown) => {
      if (active && !controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "这套资料暂时无法载入，请返回后重试。");
    });
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null") as { answers?: SeniorHighV2Answers; submittedGroups?: Record<string, boolean> } | null;
      setAnswers(saved?.answers || {});
      setSubmittedGroups(saved?.submittedGroups || {});
    } catch {
      setAnswers({});
    } finally {
      setRestoredStorageKey(storageKey);
    }
    return () => { active = false; controller.abort(); };
  }, [basePath, kind, setId, storageKey]);

  useEffect(() => {
    if (restored) window.localStorage.setItem(storageKey, JSON.stringify({ answers, submittedGroups }));
  }, [answers, restored, storageKey, submittedGroups]);

  useEffect(() => {
    if (!restored || !data?.answerAliases) return;
    setAnswers((current) => {
      const migrated = { ...current };
      for (const [alias, canonical] of Object.entries(data.answerAliases || {})) {
        for (const [key, value] of Object.entries(current)) {
          if (key !== alias && !key.startsWith(alias + ":")) continue;
          const target = canonical + key.slice(alias.length);
          if (!(target in migrated)) migrated[target] = value;
        }
      }
      return migrated;
    });
  }, [data, restored]);

  useEffect(() => {
    if (!data || typeof ResizeObserver === "undefined") return;
    const groups = [...document.querySelectorAll<HTMLElement>(
      ".senior-high-v2-group[data-side-questions=\"true\"]",
    )];
    const observers = groups.map((group) => {
      const stimulus = group.querySelector<HTMLElement>(".senior-high-v2-stimulus");
      if (!stimulus) return null;
      const updateHeight = () => {
        group.style.setProperty("--senior-high-article-height", `${stimulus.getBoundingClientRect().height}px`);
      };
      updateHeight();
      const observer = new ResizeObserver(updateHeight);
      observer.observe(stimulus);
      window.addEventListener("resize", updateHeight);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", updateHeight);
      };
    });
    return () => observers.forEach((disconnect) => disconnect?.());
  }, [activePracticeYear, data, submittedGroups]);

  const questions = useMemo(() => visibleSections.flatMap((section) => section.groups.flatMap((group) => group.questions)).filter((question) => question.type !== "instruction_only"), [visibleSections]);
  const questionGroupKeys = useMemo(() => {
    const keys = new Map<string, string>();
    for (const section of data?.sections || []) for (const group of section.groups) for (const question of group.questions) keys.set(question.id, `${section.id}:${group.id}`);
    return keys;
  }, [data]);
  const assets = useMemo(() => new Map((data?.assetRefs || []).map((asset) => [asset.assetId, asset])), [data]);
  const answeredCount = questions.filter((question) => seniorHighQuestionAnswered(question, answers)).length;
  const allSubmitted = questions.length > 0 && questions.every((question) => submittedGroups[questionGroupKeys.get(question.id) || ""]);
  const autoQuestions = questions.filter((question) => question.answerSpec.gradingMode === "auto");
  const submitPaper = () => {
    const missing = questions.length - answeredCount;
    if (missing && !window.confirm(`还有 ${missing} 题未作答，仍要提交整卷并查看答案与解析吗？`)) return;
    setSubmittedGroups(Object.fromEntries([...questionGroupKeys.values()].map((key) => [key, true])));
    window.requestAnimationFrame(() => document.getElementById("senior-high-paper-review")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const onAnswer = (key: string, value: string, groupKey?: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    if (groupKey) setSubmittedGroups((current) => {
      if (!current[groupKey]) return current;
      const next = { ...current };
      delete next[groupKey];
      return next;
    });
  };
  const questionNavigationStatus = (question: SeniorHighQuestion) => {
    const groupKey = questionGroupKeys.get(question.id);
    const grade = groupKey && (submittedGroups[groupKey] || kind === "practice") ? gradeSeniorHighQuestion(question, answers) : null;
    return grade || (seniorHighQuestionAnswered(question, answers) ? "answered" : "");
  };
  const navigationButton = (question: SeniorHighQuestion) => <button className={[questionNavigationStatus(question), question.type === "essay" ? "essay-label" : "", question.type === "translation" ? "translation-label" : ""].filter(Boolean).join(" ")} key={question.id} onClick={() => document.getElementById(question.id)?.scrollIntoView({ behavior: "smooth", block: "center" })} type="button">{displayNumber(question, kind)}</button>;
  const questionNavigation = (position: "top" | "bottom") => {
    if (questions.length < QUESTION_NAV_PAGE_SIZE * 2) return <nav aria-label={`题号导航（${position === "top" ? "顶部" : "底部"}）`} className={`senior-high-v2-question-nav direct ${position}`}>{questions.map(navigationButton)}</nav>;
    const ranges = [];
    for (let start = 0; start < questions.length; start += QUESTION_NAV_PAGE_SIZE) {
      const end = Math.min(start + QUESTION_NAV_PAGE_SIZE, questions.length);
      ranges.push({ start, end, first: displayNumber(questions[start], kind), last: displayNumber(questions[end - 1], kind) });
    }
    const expandedRange = openQuestionGroup === null ? null : ranges[openQuestionGroup];
    return <nav aria-label={`题号导航（${position === "top" ? "顶部" : "底部"}）`} className={`senior-high-v2-question-nav ${position}`}><div className="senior-high-v2-question-nav-groups">{ranges.map((range, rangeIndex) => {
      const expanded = openQuestionGroup === rangeIndex;
      return <button aria-expanded={expanded} className="senior-high-question-nav-group-toggle" key={`${range.start}-${range.end}`} onClick={() => setOpenQuestionGroup((current) => current === rangeIndex ? null : rangeIndex)} type="button">{range.first}-{range.last}</button>;
    })}</div>{expandedRange ? <div aria-label={`${expandedRange.first}-${expandedRange.last}题号`} className="senior-high-question-nav-group-items">{questions.slice(expandedRange.start, expandedRange.end).map(navigationButton)}</div> : null}</nav>;
  };

  if (error) return <section className="senior-high-page"><div className="senior-high-alert">{error}</div></section>;
  if (!data) return <section className="senior-high-page"><div className="senior-high-loading">正在载入真实题目与作答结构…</div></section>;

  return <section className={`senior-high-page senior-high-v2-runner${basePath === "/cet4" && setId === "practice-cet4-grammar" ? " cet4-grammar-runner" : ""}`} data-paper-mode={data.submissionMode} data-paper-font-size={usesCetRunnerLayout(basePath || "") ? "large" : undefined}>
    <header className="senior-high-v2-runner-header">
    {usesCetRunnerLayout(basePath || "") ? <VocabularyMobileBackLink ariaLabel="返回上一页" className="senior-high-back" desktopLabel="‹" href={backHref || (data.kind === "paper" ? `${basePath}?entry=papers` : basePath || "/senior-high")} /> : <Link aria-label="返回上一页" className="senior-high-back" href={backHref || (data.kind === "paper" ? `${basePath}?entry=papers` : basePath || "/senior-high")} title="返回上一页">← 返回{basePath === "/senior-high" ? "高考英语" : basePath === "/cet6" ? "大学英语六级" : basePath === "/kaoyan" ? "考研英语" : "大学英语四级"}</Link>}
      <div className="senior-high-v2-runner-title"><h1>{data.title}</h1>{practiceYears.length ? <div className="senior-high-v2-practice-year"><label><span className="sr-only">来源年份</span><select aria-label="来源年份" onChange={(event) => setPracticeYear(event.target.value)} value={activePracticeYear}><option>全部</option>{practiceYears.map((year) => <option key={year}>{year}</option>)}</select></label></div> : null}</div>
      <div aria-label={`${answeredCount}/${questions.length}`} className="senior-high-v2-progress"><strong>{answeredCount}/{questions.length}</strong></div>
    </header>
    {selectPracticePaper ? <div className="senior-high-v2-filters"><label>选择题卷<select onChange={(event) => setPracticeSection(event.target.value)} value={visibleSections[0]?.id || ""}>{[...data.sections.filter((section) => !practiceYears.length || activePracticeYear === "全部" || section.sourceYear === activePracticeYear)].reverse().map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label></div> : null}
    {questionNavigation("top")}
    {!isCetExam(basePath || "") && kind === "paper" && data.submissionMode === "whole-paper" ? <div aria-live="polite" className="senior-high-paper-review" id="senior-high-paper-review"><div><strong>{allSubmitted ? "整卷已提交 · 答案与解析已展开" : "整卷练习"}</strong><p>{allSubmitted ? `客观题答对 ${autoQuestions.filter((question) => gradeSeniorHighQuestion(question, answers) === "correct").length}/${autoQuestions.length} 题；${questions.length - autoQuestions.length} 道主观题请结合参考答案自行评阅。` : "按题号依次作答，完成后点击页面最下方的提交按钮查看答案与解析。"}</p></div></div> : null}
    {(kind === "paper" || basePath === "/cet4" || basePath === "/cet6") && data.instructions.length > 0 ? <div className="senior-high-v2-instructions"><BlockRenderer answers={answers} assets={assets} bindings={new Map()} blocks={data.instructions} basePath={basePath} kind={data.kind} onAnswer={onAnswer} revealSolutions={allSubmitted} /></div> : null}
    <div className="senior-high-v2-sections">{visibleSections.map((section) => { const titleWithoutSet = section.title.replace(/\s*[·•]\s*第\s*\d+\s*套\s*[·•]\s*/u, " · "); const sectionHeading = titleWithoutSet.replace(/^Part\s+(?:[IVX]+|[ⅠⅡⅢⅣⅤⅥ]+|\d+)\s*[·•—–-]\s*/i, "").trim(); const isListeningSection = section.id.toLowerCase().includes("listening") || section.title.includes("听力"); return <section className="senior-high-v2-section" key={section.id}><header><h2>{titleWithoutSet}</h2>{section.score ? <span>{section.score} 分</span> : null}</header>{section.instructions.length > 0 ? <BlockRenderer answers={answers} assets={assets} bindings={new Map()} blocks={section.instructions} basePath={basePath} kind={data.kind} onAnswer={onAnswer} revealSolutions={allSubmitted} /> : null}<div className="senior-high-v2-groups">{section.groups.map((group) => {
      const bindings = new Map<string, BlankBinding>();
      const cet4WordBankQuestionIds = new Set(isCetExam(basePath || "") && group.sharedOptions.length > 0
        ? group.questions.filter((question) => question.type === "shared_option_matching" && question.typeLabel === "选词填空").map((question) => question.id)
        : []);
      const cet4WordBankQuestions = group.questions.filter((question) => cet4WordBankQuestionIds.has(question.id));
      const cet4WordBankQuestionsByNumber = new Map(cet4WordBankQuestions.map((question) => [question.sourceQuestionNumber ?? question.displayNumber, question]));
      const separatedDirections = group.presentation === "reading"
        ? extractGroupDirections(group.stimulusBlocks)
        : { directions: [] as SeniorHighBlock[], stimulus: group.stimulusBlocks };
      const normalizedWordBank = parseLegacyWordBank(separatedDirections.stimulus, group.sharedOptions, cet4WordBankQuestions.length > 0);
      for (const question of group.questions) for (const blank of question.blanks) bindings.set(blank.blankId, { options: normalizedWordBank.options, question });
      const displayStimulusBlocks = removeDuplicateQuestionText(normalizedWordBank.stimulus, group.questions);
      const groupDirectionsBlocks = [...group.instructions, ...separatedDirections.directions].filter((block, index, blocks) => {
        const text = normalizedText(plainText([block]));
        return !text || blocks.findIndex((candidate) => normalizedText(plainText([candidate])) === text) === index;
      });
      const displaySharedOptions = normalizedWordBank.options;
      const inlineQuestions = group.questions.filter((question) => !cet4WordBankQuestionIds.has(question.id) && ["inline_fill", "multi_blank", "table_fill", "shared_option_matching"].includes(question.type) && question.promptBlocks.length === 0 && question.options.length === 0);
      const standaloneQuestions = group.questions.filter((question) => !cet4WordBankQuestionIds.has(question.id) && !inlineQuestions.includes(question));
      const groupKey = `${section.id}:${group.id}`;
      const hasStimulusQuestions = displayStimulusBlocks.length > 0 && group.questions.length > 0;
      const isClozeGroup = group.stimulusBlocks.length > 0
        && group.sharedOptions.length === 0
        && group.questions.length > 0
        && group.questions.every((question) => question.type === "single_choice" && question.placement.kind === "inline");
      const stimulusText = plainText(group.stimulusBlocks);
      const instructionOnlyStimulus = /(?:选出|选择|填入).*(?:最佳|正确)选项|(?:^|\s)例[：:]|听第?\s*\d+\s*段材料|听下面.*(?:材料|对话|独白)|回答第?\s*\d+/i.test(stimulusText);
      const groupSubmitted = Boolean(submittedGroups[groupKey]);
      const groupAnswered = group.questions.filter((question) => seniorHighQuestionAnswered(question, answers)).length;
      const assignedOptionIds = new Set(group.questions.map((question) => answers[question.id]).filter(Boolean));
      const perGroupSubmission = kind === "practice" && (group.questions.some((question) => question.type === "essay") || group.sharedOptions.length > 0);
      const answerGroup = (key: string, value: string) => onAnswer(key, value, groupKey);
      const moveOption = (targetQuestionId: string | null, optionId: string, sourceQuestionId?: string) => {
        setAnswers((current) => {
          const next = { ...current };
          if (sourceQuestionId && sourceQuestionId !== targetQuestionId) delete next[sourceQuestionId];
          if (targetQuestionId) {
            if (!group.sharedOptionsReusable) for (const question of group.questions) if (question.id !== targetQuestionId && next[question.id] === optionId) delete next[question.id];
            next[targetQuestionId] = optionId;
          }
          return next;
        });
        if (groupSubmitted) setSubmittedGroups((current) => {
          if (!current[groupKey]) return current;
          const next = { ...current };
          delete next[groupKey];
          return next;
        });
      };
      const showQuestionColumn = standaloneQuestions.length > 0 || inlineQuestions.length > 0 || group.sharedOptions.length > 0 || groupSubmitted || group.stimulusBlocks.length === 0;
      const hasSideQuestions = hasStimulusQuestions
        && !isListeningSection
        && group.presentation === "reading"
        && !instructionOnlyStimulus
        && showQuestionColumn
        && (standaloneQuestions.length > 0 || group.sharedOptions.length > 0);
      const groupLabel = group.stimulusBlocks.length > 0 ? "本篇" : "本组";
      const groupSubmit = <div className="senior-high-v2-group-submit"><span>{groupAnswered}/{group.questions.length} 已作答</span><button onClick={() => setSubmittedGroups((current) => ({ ...current, [groupKey]: true }))} type="button">{groupSubmitted ? `重新提交${groupLabel}` : `提交${groupLabel}`}</button></div>;
      return <article className={`senior-high-v2-group ${section.layout}${isListeningSection ? " listening" : ""}${hasSideQuestions ? " with-stimulus-questions" : ""}`} data-has-options={group.sharedOptions.length > 0 ? "true" : "false"} data-presentation={group.presentation} data-side-questions={hasSideQuestions ? "true" : "false"} key={group.id}>
        {group.title && group.title.trim() !== sectionHeading && group.title.trim() !== section.title.trim() ? <h3>{group.title}</h3> : null}
        {groupDirectionsBlocks.length > 0 ? <div className="senior-high-v2-group-directions"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={groupDirectionsBlocks} basePath={basePath} kind={data.kind} onAnswer={answerGroup} revealSolutions={groupSubmitted} /></div> : null}
        <div className="senior-high-v2-group-body">
          {displayStimulusBlocks.length > 0 ? <div className="senior-high-v2-stimulus"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={displayStimulusBlocks} basePath={basePath} kind={data.kind} onAnswer={answerGroup} onOptionDrop={moveOption} wordBankQuestions={cet4WordBankQuestionsByNumber} revealSolutions={groupSubmitted} hideClozeLines={isClozeGroup} /></div> : null}
          {showQuestionColumn ? <div className="senior-high-v2-question-column">
            {(data.submissionMode !== "whole-paper" || perGroupSubmission) && groupSubmitted ? groupSubmit : null}
        {group.sharedOptions.length > 0 && !(isCetExam(basePath || "") && group.questions.some((question) => question.typeLabel === "长篇阅读")) ? <div aria-label="可拖动选项词库；将已选词拖回此处可取消" className="senior-high-v2-shared-options" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); const { optionId, sourceQuestionId } = readOptionDragData(event.dataTransfer); if (optionId) moveOption(null, optionId, sourceQuestionId || undefined); }}><strong>{basePath === "/kaoyan" ? "在每道题的下拉菜单中选择对应选项，也可点击选项作答" : "拖动右侧选项到左侧任意空格；拖回此处可取消"}</strong>{displaySharedOptions.filter((option) => isCetExam(basePath || "") || group.sharedOptionsReusable || basePath === "/kaoyan" || !assignedOptionIds.has(option.id)).map((option) => <div aria-label={`选项 ${option.label}${assignedOptionIds.has(option.id) ? "（已放入空格，可拖动调整）" : ""}`} className={`senior-high-v2-shared-option${(isCetExam(basePath || "") || basePath === "/kaoyan") && assignedOptionIds.has(option.id) ? " assigned" : ""}`} draggable={basePath !== "/kaoyan"} role="button" tabIndex={0} key={option.id} onClick={() => { const target = group.questions.find((question) => question.type === "shared_option_matching" && !answers[question.id])?.id; if (target) moveOption(target, option.id); }} onDragStart={(event) => setOptionDragData(event.dataTransfer, option.id)} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); const target = group.questions.find((question) => question.type === "shared_option_matching" && !answers[question.id])?.id; if (target) moveOption(target, option.id); }}><b>{option.label}.</b><div><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={option.blocks} basePath={basePath} kind={data.kind} onAnswer={answerGroup} onOptionDrop={moveOption} revealSolutions={groupSubmitted} /></div></div>)}</div> : null}
            {standaloneQuestions.map((question) => <QuestionCard answers={answers} assets={assets} bindings={bindings} basePath={basePath} hideMeta={isCetExam(basePath || "") && kind === "paper" && ["essay", "translation"].includes(question.type)} key={question.id} kind={data.kind} onAnswer={answerGroup} question={question} onOptionDrop={moveOption} hasGroupExplanation={Boolean(group.explanationBlocks?.length)} submitted={groupSubmitted} />)}
    {(data.submissionMode !== "whole-paper" || perGroupSubmission) && !groupSubmitted && (standaloneQuestions.length > 0 || inlineQuestions.length > 0 || group.sharedOptions.length > 0 || group.stimulusBlocks.length === 0) ? groupSubmit : null}
            {groupSubmitted && inlineQuestions.length > 0 ? <div className="senior-high-v2-inline-results">{inlineQuestions.map((question) => <QuestionCard answers={answers} assets={assets} bindings={bindings} basePath={basePath} hideMeta={isCetExam(basePath || "") && kind === "paper" && ["essay", "translation"].includes(question.type)} key={question.id} kind={data.kind} onAnswer={answerGroup} question={question} onOptionDrop={moveOption} hasGroupExplanation={Boolean(group.explanationBlocks?.length)} submitted />)}</div> : null}
            {groupSubmitted && !group.explanationBlocks?.length && cet4WordBankQuestions.some((question) => question.explanationBlocks.length > 0) ? <div className="senior-high-v2-inline-results">{cet4WordBankQuestions.filter((question) => question.explanationBlocks.length > 0).map((question) => <QuestionCard answers={answers} assets={assets} bindings={bindings} basePath={basePath} feedbackOnly key={question.id} kind={data.kind} onAnswer={answerGroup} question={question} hasGroupExplanation={false} submitted />)}</div> : null}
          </div> : null}
        </div>
        {groupSubmitted && group.explanationBlocks?.length ? <details className="senior-high-analysis"><summary>查看本组原卷解析</summary><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={group.explanationBlocks} kind={data.kind} onAnswer={answerGroup} /></details> : null}
      </article>;
    })}</div></section>; })}</div>
    {questionNavigation("bottom")}
    {kind === "paper" && data.submissionMode === "whole-paper" ? <div className="senior-high-paper-finish"><span>{answeredCount}/{questions.length} 已作答</span><button onClick={submitPaper} type="button">{allSubmitted ? "重新提交整卷" : "提交整卷并查看解析"}</button></div> : null}
  </section>;
}
