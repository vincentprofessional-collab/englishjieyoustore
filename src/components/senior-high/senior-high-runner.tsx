"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
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

type RunnerProps = { kind: "paper" | "practice"; setId: string };
type BlankBinding = { options: SeniorHighOption[]; question: SeniorHighQuestion };
type OptionDropHandler = (targetQuestionId: string | null, optionId: string, sourceQuestionId?: string) => void;

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

function displayNumber(question: SeniorHighQuestion, _kind: SeniorHighSet["kind"]) {
  return question.displayNumber;
}

const QUESTION_NAV_PAGE_SIZE = 50;
const QUESTION_NAV_GROUPS_PER_ROW = 9;

const SOLUTION_MARKER = /(?:^|\n)\s*(?:【\s*(?:(?:参考)?(?:答案|解析|导语)|\d{1,3}\s*题详解)\s*】|(?:(?:选择题|英语|参考)?答案|解析|导语|故填|故选)\s*(?:[：:]|是|为|\d|[（(]|[A-Ha-h]|[a-z]|$)|\d{1,3}\s*题详解\s*(?:[：:]|是|为|\d|[（(]|和|$))/i;
const NUMBERED_ANSWER_LINE = /^\s*\d{1,3}\s*[.．、]\s*(?:[a-z][a-z'-]*|[A-H])(?:\s+\d{1,3}\s*[.．、]\s*(?:[a-z][a-z'-]*|[A-H]))*\s*$/;
const WRITING_LINE_RE = /_{4,}|＿{4,}|-{8,}|—{6,}/g;
const SHORT_ANSWER_NUMBER_RE = /^\s*\d{1,3}\s*[.．、:：]\s*(?=\S)/;
const SHORT_ANSWER_QUESTION_RE = /^\s*(?:what|when|where|who|why|how|which|is|are|does|did|can|could|would|should)\b[^.!。！？]*[?？]/i;

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

function isClozeOptionLabelBlock(block: SeniorHighBlock) {
  if (block.type !== "paragraph" && block.type !== "richText") return false;
  const text = block.runs.filter((run) => run.type === "text").map((run) => run.text).join("").replace(/\s+/g, " ").trim();
  return /^(?:[A-H]\s*[.．、:：]?\s*){2,}$/i.test(text);
}

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

function isWritingNoiseBlock(block: SeniorHighBlock) {
  if (block.type !== "paragraph" && block.type !== "richText") return false;
  const text = block.runs.filter((run) => run.type === "text").map((run) => run.text).join("").replace(/\s+/g, " ").trim();
  if (!text) return true;
  if (/^www\.\S+$/i.test(text) || /^绝密/.test(text) || /^试卷类型/.test(text)) return true;
  if (/^\d{4}年.*(?:高考|招生全国统一考试).*(?:试卷|答案)/.test(text)) return true;
  return /^(?:[A-H]\s*)?(?:\d{1,3}\s*[.．、:]?\s*[A-H]\s*){2,}$/i.test(text);
}

function cleanWritingPromptBlocks(blocks: SeniorHighBlock[]) {
  return blocks.map((block) => {
    if (block.type !== "paragraph" && block.type !== "richText") return block;
    return {
      ...block,
      runs: block.runs.map((run) => {
        if (run.type !== "text") return run;
        const metadataIndex = run.text.search(/(?:绝密[☆★]?启用前|试卷类型\s*[:：]?|(?:19|20)\d{2}年普通高等学校招生全国统一考试)/);
        return metadataIndex >= 0 ? { ...run, text: run.text.slice(0, metadataIndex).trimEnd() } : run;
      }),
    };
  }).filter((block) => !isWritingNoiseBlock(block));
}

function splitWritingReference(blocks: SeniorHighBlock[]) {
  const referenceIndex = blocks.findIndex((block) => {
    if (block.type !== "paragraph" && block.type !== "richText") return false;
    const text = block.runs.filter((run) => run.type === "text").map((run) => run.text).join("").trim();
    return /^(?:possible\s+version|sample\s*\d*\s*:|参考答案|参考范文|范文)\s*:?/i.test(text);
  });
  return referenceIndex < 0
    ? { prompt: blocks, reference: [] }
    : { prompt: blocks.slice(0, referenceIndex), reference: blocks.slice(referenceIndex) };
}

function continuationParagraphCount(blocks: SeniorHighBlock[]) {
  const text = plainText(blocks);
  if (!/(续写词数|续写部分|续写两段|续写一段|paragraph\s*2|para\s*2)/i.test(text)) return 0;
  if (/(?:续写|续写部分).{0,24}(?:一|1)\s*段/i.test(text)) return 1;
  if (/(?:续写|续写部分).{0,32}(?:两|2)\s*段|paragraph\s*2|para\s*2/i.test(text)) return 2;
  if (/续写词数|续写部分/.test(text)) return 2;
  return 1;
}

function writingPromptPieces(blocks: SeniorHighBlock[], expectedParagraphs = 0) {
  const starterPattern = /^\s*(?:para(?:graph)?\s*)\d+\s*[.．、:：]/i;
  const starterIndices = new Set<number>();
  blocks.forEach((block, index) => {
    if ((block.type === "paragraph" || block.type === "richText") && starterPattern.test(block.runs.filter((run) => run.type === "text").map((run) => run.text).join(""))) starterIndices.add(index);
  });
  if (expectedParagraphs > starterIndices.size) {
    const noteIndex = blocks.reduce((last, block, index) => {
      const text = block.type === "paragraph" || block.type === "richText" ? block.runs.filter((run) => run.type === "text").map((run) => run.text).join("") : "";
      return /注意|续写词数|续写部分/.test(text) ? index : last;
    }, -1);
    const candidates = blocks.map((block, index) => ({ block, index })).filter(({ block, index }) => {
      if (index <= noteIndex || block.type !== "paragraph" && block.type !== "richText") return false;
      const text = block.runs.filter((run) => run.type === "text").map((run) => run.text).join("").trim();
      return text.length > 0 && !isWritingLineBlock(block) && !/^\s*(?:注意|[（(]?\d+[)）.．、])/.test(text) && !/词数|作答|关键词|续写部分/.test(text);
    });
    for (const candidate of candidates.slice(-expectedParagraphs)) starterIndices.add(candidate.index);
  }
  const pieces: Array<{ kind: "blocks"; blocks: SeniorHighBlock[] } | { kind: "input"; index: number }> = [];
  let pendingInput = false;
  let pendingStarter = false;
  let inputIndex = 0;
  const appendBlock = (block: SeniorHighBlock) => {
    const previous = pieces[pieces.length - 1];
    if (previous?.kind === "blocks") previous.blocks.push(block);
    else pieces.push({ kind: "blocks", blocks: [block] });
  };
  for (const [blockIndex, block] of blocks.entries()) {
    const continuationStarter = starterIndices.has(blockIndex);
    if (continuationStarter) {
      if (pendingStarter && !pendingInput) pieces.push({ kind: "input", index: inputIndex++ });
      appendBlock(block);
      const text = block.type === "paragraph" || block.type === "richText" ? block.runs.filter((run) => run.type === "text").map((run) => run.text).join("") : "";
      const starterOnly = /^\s*(?:para(?:graph)?\s*)\d+\s*[.．、:：]\s*$/i.test(text);
      pendingStarter = starterOnly;
      if (!starterOnly) {
        pieces.push({ kind: "input", index: inputIndex++ });
        pendingInput = true;
      } else pendingInput = false;
      continue;
    }
    if (isWritingLineBlock(block)) {
      if (pendingStarter && !pendingInput) {
        pieces.push({ kind: "input", index: inputIndex++ });
        pendingInput = true;
      }
      if (!pendingInput) pieces.push({ kind: "input", index: inputIndex++ });
      pendingInput = true;
      pendingStarter = false;
      continue;
    }
    appendBlock(block);
    if (!pendingStarter) pendingInput = false;
  }
  if (pendingStarter && !pendingInput) pieces.push({ kind: "input", index: inputIndex++ });
  return pieces;
}

function shortAnswerQuestionStart(block: SeniorHighBlock) {
  if (block.type !== "paragraph" && block.type !== "richText") return false;
  const text = block.runs.filter((run) => run.type === "text").map((run) => run.text).join("").trim();
  if (!text) return false;
  return SHORT_ANSWER_NUMBER_RE.test(text) || SHORT_ANSWER_QUESTION_RE.test(text);
}

function shortAnswerPromptPieces(blocks: SeniorHighBlock[]) {
  const questionIndices = blocks.map((block, index) => shortAnswerQuestionStart(block) ? index : -1).filter((index) => index >= 0);
  const numberedQuestionCount = blocks.filter((block) => {
    if (block.type !== "paragraph" && block.type !== "richText") return false;
    const text = block.runs.filter((run) => run.type === "text").map((run) => run.text).join("");
    return SHORT_ANSWER_NUMBER_RE.test(text) && /(?:\?|？|no more than|不超过|词数|回答问题|answer)/i.test(text);
  }).length;
  const allText = plainText(blocks);
  if (numberedQuestionCount < 2 || !/(?:no more than|不超过|词数|回答问题|answer the following questions)/i.test(allText)) return [];

  const pieces: Array<{ kind: "blocks"; blocks: SeniorHighBlock[] } | { kind: "input"; index: number }> = [];
  let prelude: SeniorHighBlock[] = [];
  let currentQuestion: SeniorHighBlock[] | null = null;
  let inputIndex = 0;
  const appendBlocks = (nextBlocks: SeniorHighBlock[]) => {
    if (nextBlocks.length === 0) return;
    const previous = pieces[pieces.length - 1];
    if (previous?.kind === "blocks") previous.blocks.push(...nextBlocks);
    else pieces.push({ kind: "blocks", blocks: nextBlocks });
  };
  const flushQuestion = () => {
    if (!currentQuestion) return;
    appendBlocks(currentQuestion);
    pieces.push({ kind: "input", index: inputIndex++ });
    currentQuestion = null;
  };

  for (const [index, block] of blocks.entries()) {
    if (questionIndices.includes(index)) {
      flushQuestion();
      appendBlocks(prelude);
      prelude = [];
      currentQuestion = [block];
      continue;
    }
    if (currentQuestion) {
      if (!isWritingLineBlock(block)) currentQuestion.push(block);
    } else prelude.push(block);
  }
  flushQuestion();
  appendBlocks(prelude);
  return pieces;
}

function autoResizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
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
  kind,
  onAnswer,
  onOptionDrop,
  revealSolutions = true,
  writingPlaceholder,
  hideWritingImages = false,
  hideWritingLines = false,
  hideClozeLines = false,
  clozeNumbers,
}: {
  answers: SeniorHighV2Answers;
  assets: Map<string, SeniorHighAssetRef>;
  bindings: Map<string, BlankBinding>;
  blocks: SeniorHighBlock[];
  kind: SeniorHighSet["kind"];
  onAnswer: (key: string, value: string) => void;
  onOptionDrop?: OptionDropHandler;
  revealSolutions?: boolean;
  writingPlaceholder?: string;
  hideWritingImages?: boolean;
  hideWritingLines?: boolean;
  hideClozeLines?: boolean;
  clozeNumbers?: number[];
}) {
  const sourceClozeNumbers = clozeNumbers || [...new Set([...bindings.values()].map(({ question }) => displayNumber(question, kind)))];
  const visibleClozeNumbers = hideClozeLines
    ? sourceClozeNumbers
    : [];
  let clozeNumberIndex = 0;
  const renderRuns = (sourceRuns: Extract<SeniorHighBlock, { type: "paragraph" | "richText" }>["runs"]) => {
    const runs = hideClozeLines ? clozeRunsWithoutSourceLines(sourceRuns) : sourceRuns;
    return runs.map((run, index) => {
    if (run.type === "text") {
      if (hideClozeLines && run.underline && /^\s*\d{1,3}\s*$/.test(run.text)) {
        const number = visibleClozeNumbers[clozeNumberIndex++] ?? Number(run.text.trim());
        return <span className="senior-high-cloze-source-blank" key={`cloze-source-${index}`}>{number}</span>;
      }
      const text = hideWritingLines ? run.text.replace(WRITING_LINE_RE, "") : writingPlaceholder ? run.text.replace(WRITING_LINE_RE, writingPlaceholder) : run.text;
      if (!text) return null;
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
      return <span className="senior-high-v2-inline-control" id={question.id} key={run.blankId}><b>{number}</b><button aria-label={`第 ${number} 题选项`} className={`senior-high-v2-choice-blank drop-target${assigned ? " assigned" : ""}${choiceState}`} data-senior-high-drop-target="true" draggable={Boolean(assigned)} onClick={() => document.getElementById(question.id)?.scrollIntoView({ behavior: "smooth", block: "center" })} onDragOver={(event) => event.preventDefault()} onDragStart={(event) => { if (!assigned) return; event.dataTransfer.setData("text/senior-high-option", assigned); event.dataTransfer.setData("text/senior-high-source-question", question.id); event.dataTransfer.effectAllowed = "move"; }} onDrop={(event) => { event.preventDefault(); const optionId = event.dataTransfer.getData("text/senior-high-option"); if (!optionId) return; onOptionDrop?.(question.id, optionId, event.dataTransfer.getData("text/senior-high-source-question") || undefined); }} type="button"><span>{assigned}</span>{assignedCorrect === true ? <strong aria-label="正确选项" className="senior-high-option-status">✓</strong> : assignedCorrect === false ? <strong aria-label="回答错误" className="senior-high-option-status">×</strong> : null}</button></span>;
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
      if (hideClozeLines && isClozeOptionLabelBlock(block)) return null;
      const runs = visibleRuns(block.runs, revealSolutions);
      if (!revealSolutions && block.runs.some((run) => run.type === "text" && solutionMarkerIndex(run.text) >= 0)) solutionStarted = true;
      const visibleText = runs.filter((run) => run.type === "blank" || (hideClozeLines ? run.text.replace(/[_＿]+/g, "") : hideWritingLines ? run.text.replace(WRITING_LINE_RE, "") : run.text).trim());
      return visibleText.length > 0 ? <p className="senior-high-v2-paragraph" key={key}>{renderRuns(visibleText)}</p> : null;
    }
    if (block.type === "richText") {
      if (hideClozeLines && isClozeOptionLabelBlock(block)) return null;
      const runs = visibleRuns(block.runs, revealSolutions);
      if (!revealSolutions && block.runs.some((run) => run.type === "text" && solutionMarkerIndex(run.text) >= 0)) solutionStarted = true;
      const visibleText = runs.filter((run) => run.type === "blank" || (hideClozeLines ? run.text.replace(/[_＿]+/g, "") : hideWritingLines ? run.text.replace(WRITING_LINE_RE, "") : run.text).trim());
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
      if (block.alt.trim().toLowerCase() === "source image") return null;
      const asset = assets.get(block.assetId);
      return asset ? <figure className="senior-high-v2-figure" key={key}><img alt={block.alt} src={asset.url} />{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure> : null;
    }
    if (block.type === "audio") {
      const asset = assets.get(block.assetId);
      return asset ? <div className="senior-high-v2-media" key={key}><span>{block.label || "听力音频"}</span><audio controls preload="metadata" src={asset.url} /></div> : null;
    }
    if (block.type === "video") {
      const asset = assets.get(block.assetId);
      return asset ? <div className="senior-high-v2-media" key={key}><span>{block.label || "视频"}</span><video controls preload="metadata" src={asset.url} /></div> : null;
    }
    if (block.type === "dialogue") return <div className="senior-high-v2-dialogue" key={key}>{block.turns.map((turn, turnIndex) => <div key={`${turn.speaker}-${turnIndex}`}><strong>{turn.speaker}</strong><div><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={turn.blocks} kind={kind} onAnswer={onAnswer} onOptionDrop={onOptionDrop} revealSolutions={revealSolutions} writingPlaceholder={writingPlaceholder} hideWritingImages={hideWritingImages} hideWritingLines={hideWritingLines} hideClozeLines={hideClozeLines} clozeNumbers={clozeNumbers} /></div></div>)}</div>;
    return <div className="senior-high-v2-table-wrap" key={key}><table><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.cells.map((cell, cellIndex) => <td key={cellIndex}><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={cell} kind={kind} onAnswer={onAnswer} onOptionDrop={onOptionDrop} revealSolutions={revealSolutions} writingPlaceholder={writingPlaceholder} hideWritingImages={hideWritingImages} hideWritingLines={hideWritingLines} hideClozeLines={hideClozeLines} clozeNumbers={clozeNumbers} /></td>)}</tr>)}</tbody></table></div>;
  })}</>;
}

function Feedback({
  answers,
  assets,
  bindings,
  grade,
  kind,
  onAnswer,
  question,
}: {
  answers: SeniorHighV2Answers;
  assets: Map<string, SeniorHighAssetRef>;
  bindings: Map<string, BlankBinding>;
  grade: SeniorHighGrade;
  kind: SeniorHighSet["kind"];
  onAnswer: (key: string, value: string) => void;
  question: SeniorHighQuestion;
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
    {question.explanationBlocks.length === 0 && !hasReference ? <small>{answer ? "暂无解析" : ""}</small> : null}
    {hasReference ? <div className="senior-high-analysis"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={Array.isArray(question.answerSpec.referenceAnswer) ? question.answerSpec.referenceAnswer : [{ type: "paragraph", runs: [{ type: "text", text: question.answerSpec.referenceAnswer || "" }] }]} kind={kind} onAnswer={onAnswer} /></div> : null}
    {question.explanationBlocks.length > 0 ? <div className="senior-high-analysis"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={question.explanationBlocks} kind={kind} onAnswer={onAnswer} /></div> : null}
  </div>;
}

function QuestionCard({
  answers,
  assets,
  bindings,
  kind,
  onAnswer,
  question,
  submitted,
}: {
  answers: SeniorHighV2Answers;
  assets: Map<string, SeniorHighAssetRef>;
  bindings: Map<string, BlankBinding>;
  kind: SeniorHighSet["kind"];
  onAnswer: (key: string, value: string) => void;
  question: SeniorHighQuestion;
  submitted: boolean;
}) {
  const writingSource = question.type === "essay" ? splitWritingReference(question.promptBlocks) : { prompt: question.promptBlocks, reference: [] };
  const sourcePromptBlocks = question.type === "essay" ? cleanWritingPromptBlocks(writingSource.prompt) : writingSource.prompt;
  const writingReferenceBlocks = writingSource.reference;
  const writingSignature = question.type === "essay" ? splitWritingSignature(sourcePromptBlocks) : { content: sourcePromptBlocks, signature: [] };
  const promptBlocks = withoutLeadingQuestionNumber(writingSignature.content);
  const writingAfterLines = [...(question.writingFrame?.after || []), ...writingSignature.signature];
  const inlineOnly = ["inline_fill", "multi_blank", "table_fill", "shared_option_matching"].includes(question.type) && promptBlocks.length === 0 && question.options.length === 0;
  const grade = gradeSeniorHighQuestion(question, answers);
  if (inlineOnly) return submitted ? <div className="senior-high-v2-inline-feedback" key={question.id}><b>第 {displayNumber(question, kind)} 题</b><Feedback answers={answers} assets={assets} bindings={bindings} grade={grade} kind={kind} onAnswer={onAnswer} question={question} /></div> : null;
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
  const shortAnswerPieces = textInput ? shortAnswerPromptPieces(promptBlocks) : [];
  const continuationParagraphs = question.type === "essay" ? continuationParagraphCount(promptBlocks) : 0;
  const writingPieces = textInput && !question.writingFrame
    ? question.type === "essay" && continuationParagraphs > 0 ? writingPromptPieces(promptBlocks, continuationParagraphs) : shortAnswerPieces
    : [];
  const embeddedWriting = writingPieces.some((piece) => piece.kind === "input");
  const embeddedShortAnswer = shortAnswerPieces.length > 0 && writingPieces === shortAnswerPieces;
  const writingPlaceholder = embeddedShortAnswer ? "请输入答案…" : question.type === "essay" ? "请在这里完成正文…" : question.correctionStatement ? "请在这里说明错误及理由…" : question.type === "oral_response" ? "请在这里记录口语回答要点…" : "请在这里完成答案…";
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
  return <article className="senior-high-question-card" id={question.id}>
    <div className="senior-high-question-meta"><span>第 {displayNumber(question, kind)} 题</span><small>{TYPE_LABELS[question.type] || question.type}</small></div>
    {promptBlocks.length > 0 ? <div className={`senior-high-v2-question-prompt${embeddedWriting ? " senior-high-writing-prompt" : ""}`}>{embeddedWriting ? writingPieces.map((piece) => piece.kind === "blocks" ? <BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={piece.blocks} kind={kind} key={`writing-blocks-${piece.blocks[0]?.id || piece.blocks.length}`} onAnswer={onAnswer} revealSolutions={submitted} hideWritingImages={question.type === "essay"} hideWritingLines /> : <textarea aria-label={embeddedShortAnswer ? `第 ${displayNumber(question, kind)} 题第 ${piece.index + 1} 小题答案` : `第 ${displayNumber(question, kind)} 题正文第 ${piece.index + 1} 段`} className={`senior-high-answer-input${embeddedShortAnswer ? " senior-high-auto-grow" : " senior-high-writing-input"}`} data-senior-high-writing-input="true" key={`writing-input-${piece.index}`} onChange={(event) => updateWriting(piece.index, event.target.value)} onInput={(event) => embeddedShortAnswer && autoResizeTextarea(event.currentTarget)} placeholder={writingPlaceholder} rows={embeddedShortAnswer ? 1 : 6} value={writingValues[piece.index]} />) : <BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={promptBlocks} kind={kind} onAnswer={onAnswer} revealSolutions={submitted} hideWritingImages={question.type === "essay"} hideWritingLines={textInput} />}</div> : null}
    {question.options.length > 0 ? <div className="senior-high-options">{question.options.map((option) => { const isSelected = selected.has(option.id); const isCorrect = correctOptionIds.has(option.id.trim().toUpperCase()); const optionState = showChoiceFeedback && isCorrect ? "correct-option" : showChoiceFeedback && isSelected ? "incorrect-option" : isSelected ? "selected" : ""; return <button aria-pressed={isSelected} className={optionState} key={option.id} onClick={() => choose(option.id)} type="button"><b>{option.label}.</b><span>{plainText(option.blocks)}</span>{showChoiceFeedback && isCorrect ? <strong aria-label="正确选项" className="senior-high-option-status">✓</strong> : null}{showChoiceFeedback && isSelected && !isCorrect ? <strong aria-label="回答错误" className="senior-high-option-status">×</strong> : null}</button>; })}</div> : null}
    {question.correctionStatement ? <div className="senior-high-correction"><small>点击句中词语划线标错，再在下方说明原因；再次点击可取消。</small><p>{question.correctionStatement.split(/\s+/).map((word, index) => <Fragment key={index}><button aria-pressed={markedWords.has(String(index))} className={markedWords.has(String(index)) ? "marked" : ""} onClick={() => { const next = new Set(markedWords); if (next.has(String(index))) next.delete(String(index)); else next.add(String(index)); onAnswer(`${question.id}:marked`, [...next].sort((a, b) => Number(a) - Number(b)).join(",")); }} type="button">{word}</button>{" "}</Fragment>)}</p></div> : null}
    {textInput && !embeddedWriting ? <div className="senior-high-writing-response">{question.writingFrame?.before.map((line) => <p key={line}>{line.replace(WRITING_LINE_RE, "")}</p>)}<textarea aria-label={`第 ${displayNumber(question, kind)} 题答案`} className={`senior-high-answer-input${question.type === "essay" ? "" : " senior-high-auto-grow"}`} data-senior-high-writing-input="true" onChange={(event) => updateWriting(0, event.target.value)} onInput={(event) => question.type !== "essay" && autoResizeTextarea(event.currentTarget)} placeholder={writingPlaceholder} rows={question.type === "essay" ? 6 : 1} value={writingValues[0]} />{writingAfterLines.length > 0 ? <div className="senior-high-letter-signature">{writingAfterLines.map((line, index) => <p key={`${line}-${index}`}>{line.replace(WRITING_LINE_RE, "")}</p>)}</div> : null}{question.type === "essay" ? <small className="senior-high-v2-word-count">当前 {writingValues.join(" ").trim() ? writingValues.join(" ").trim().split(/\s+/).length : 0} 词{question.writingFrame ? "（不含已给出的开头和结尾）" : ""}</small> : null}</div> : null}
    {question.type === "essay" && embeddedWriting ? <>{writingAfterLines.length > 0 ? <div className="senior-high-letter-signature">{writingAfterLines.map((line, index) => <p key={`${line}-${index}`}>{line.replace(WRITING_LINE_RE, "")}</p>)}</div> : null}<small className="senior-high-v2-word-count">当前 {writingValues.join(" ").trim() ? writingValues.join(" ").trim().split(/\s+/).length : 0} 词</small></> : null}
    {submitted && writingReferenceBlocks.length > 0 ? <div className="senior-high-writing-reference"><strong>参考范文</strong><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={writingReferenceBlocks} kind={kind} onAnswer={onAnswer} revealSolutions /></div> : null}
    {submitted && question.type !== "instruction_only" ? <Feedback answers={answers} assets={assets} bindings={bindings} grade={grade} kind={kind} onAnswer={onAnswer} question={question} /> : null}
  </article>;
}

export function SeniorHighRunner({ kind, setId }: RunnerProps) {
  const [data, setData] = useState<SeniorHighSet | null>(null);
  const [answers, setAnswers] = useState<SeniorHighV2Answers>({});
  const [submittedGroups, setSubmittedGroups] = useState<Record<string, boolean>>({});
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState("");
  const [openQuestionGroup, setOpenQuestionGroup] = useState<number | null>(null);
  const storageKey = `senior-high:v2:2:${kind}:${setId}`;

  useEffect(() => {
    const basePath = `/senior-high/${kind === "paper" ? "papers" : "practice"}`;
    const urls = setId === "practice-gaokao-writing-2000-2019"
      ? [`${basePath}/${setId}.json`, `${basePath}/practice-gaokao-application-writing-2000-2019.json`]
      : [`${basePath}/${setId}.json`];
    Promise.all(urls.map((url) => fetch(url).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<SeniorHighSet>;
    })))
      .then(([payload, applicationWriting]) => {
        if (!applicationWriting) return payload;
        const existingQuestionCount = payload.sections.reduce((count, section) => count + section.groups.reduce((groupCount, group) => groupCount + group.questions.length, 0), 0);
        let nextQuestionNumber = existingQuestionCount + 1;
        const appendedGroups = applicationWriting.sections.flatMap((section) => section.groups).map((group) => ({
          ...group,
          questions: group.questions.map((question) => ({ ...question, displayNumber: nextQuestionNumber++ })),
        }));
        return { ...payload, assetRefs: [...(payload.assetRefs || []), ...(applicationWriting.assetRefs || [])], sections: payload.sections.map((section, index) => index === 0 ? { ...section, groups: [...section.groups, ...appendedGroups] } : section) };
      })
      .then((payload) => setData(payload))
      .catch(() => setError("这套资料暂时无法载入，请返回后重试。"));
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null") as { answers?: SeniorHighV2Answers; submittedGroups?: Record<string, boolean> } | null;
      setAnswers(saved?.answers || {});
      setSubmittedGroups(saved?.submittedGroups || {});
    } catch {
      setAnswers({});
    } finally {
      setRestored(true);
    }
  }, [setId, storageKey]);

  useEffect(() => {
    if (restored) window.localStorage.setItem(storageKey, JSON.stringify({ answers, submittedGroups }));
  }, [answers, restored, storageKey, submittedGroups]);

  useEffect(() => {
    if (!data || kind !== "paper") return;
    const runner = document.querySelector<HTMLElement>(".senior-high-v2-runner");
    if (!runner) return;
    const groups = [...runner.querySelectorAll<HTMLElement>('.senior-high-v2-group[data-side-questions="true"]')];
    const syncQuestionColumnHeights = () => {
      const compact = window.matchMedia("(max-width: 900px)").matches;
      for (const group of groups) {
        const stimulus = group.querySelector<HTMLElement>(".senior-high-v2-stimulus");
        const questionColumn = group.querySelector<HTMLElement>(".senior-high-v2-question-column");
        if (!stimulus || !questionColumn) continue;
        if (compact) {
          questionColumn.style.maxHeight = "";
          questionColumn.style.overflowY = "";
          continue;
        }
        const articleHeight = Math.floor(stimulus.getBoundingClientRect().height);
        if (articleHeight > 0) {
          questionColumn.style.maxHeight = `${articleHeight}px`;
          questionColumn.style.overflowY = "auto";
        }
      }
    };
    syncQuestionColumnHeights();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncQuestionColumnHeights);
    for (const group of groups) {
      const stimulus = group.querySelector<HTMLElement>(".senior-high-v2-stimulus");
      if (stimulus) observer?.observe(stimulus);
    }
    window.addEventListener("resize", syncQuestionColumnHeights);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncQuestionColumnHeights);
    };
  }, [data, kind]);

  const questions = useMemo(() => data?.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).filter((question) => question.type !== "instruction_only") || [], [data]);
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
  const navigationButton = (question: SeniorHighQuestion) => <button className={questionNavigationStatus(question)} key={question.id} onClick={() => document.getElementById(question.id)?.scrollIntoView({ behavior: "smooth", block: "center" })} type="button">{displayNumber(question, kind)}</button>;
  const questionNavigation = (position: "top" | "bottom") => {
    if (questions.length < QUESTION_NAV_PAGE_SIZE * 2) return <nav aria-label={`题号导航（${position === "top" ? "顶部" : "底部"}）`} className={`senior-high-v2-question-nav direct ${position}`}>{questions.map(navigationButton)}</nav>;
    const ranges: Array<{ start: number; end: number; first: number; last: number }> = [];
    for (let start = 0; start < questions.length; start += QUESTION_NAV_PAGE_SIZE) {
      const end = Math.min(start + QUESTION_NAV_PAGE_SIZE, questions.length);
      ranges.push({ start, end, first: displayNumber(questions[start], kind), last: displayNumber(questions[end - 1], kind) });
    }
    const expandedRange = openQuestionGroup === null ? null : ranges[openQuestionGroup];
    const rangeRows = Array.from({ length: Math.ceil(ranges.length / QUESTION_NAV_GROUPS_PER_ROW) }, (_, rowIndex) => ranges.slice(rowIndex * QUESTION_NAV_GROUPS_PER_ROW, (rowIndex + 1) * QUESTION_NAV_GROUPS_PER_ROW));
    return <nav aria-label={`题号导航（${position === "top" ? "顶部" : "底部"}）`} className={`senior-high-v2-question-nav ${position}`}><div className="senior-high-v2-question-nav-groups">{rangeRows.map((row, rowIndex) => <div className={`senior-high-question-nav-group-row${row.length < QUESTION_NAV_GROUPS_PER_ROW ? " sparse" : ""}`} key={`range-row-${rowIndex}`}>{row.map((range) => {
      const rangeIndex = ranges.indexOf(range);
      const expanded = openQuestionGroup === rangeIndex;
      return <button aria-expanded={expanded} className="senior-high-question-nav-group-toggle" key={`${range.start}-${range.end}`} onClick={() => setOpenQuestionGroup((current) => current === rangeIndex ? null : rangeIndex)} type="button">{range.first}-{range.last}</button>;
    })}</div>)}</div>{expandedRange ? <div aria-label={`${expandedRange.first}-${expandedRange.last}题号`} className="senior-high-question-nav-group-items">{questions.slice(expandedRange.start, expandedRange.end).map(navigationButton)}</div> : null}</nav>;
  };

  if (error) return <section className="senior-high-page"><div className="senior-high-alert">{error}</div></section>;
  if (!data) return <section className="senior-high-page"><div className="senior-high-loading">正在载入真实题目与作答结构…</div></section>;

  return <section className="senior-high-page senior-high-v2-runner" data-paper-mode={data.submissionMode}>
    <header className="senior-high-v2-runner-header">
      <Link className="senior-high-back" href={data.kind === "paper" ? "/senior-high?entry=papers" : "/senior-high"}>← 返回高考英语</Link>
      <div className="senior-high-v2-runner-title"><h1>{data.title}</h1></div>
      <div className="senior-high-v2-progress"><strong>{answeredCount}/{questions.length}</strong><span>已作答</span></div>
    </header>
    {questionNavigation("top")}
    {kind === "paper" && data.submissionMode === "whole-paper" ? <div aria-live="polite" className="senior-high-paper-review" id="senior-high-paper-review"><div><strong>{allSubmitted ? "整卷已提交 · 答案与解析已展开" : "整卷练习"}</strong><p>{allSubmitted ? `客观题答对 ${autoQuestions.filter((question) => gradeSeniorHighQuestion(question, answers) === "correct").length}/${autoQuestions.length} 题；${questions.length - autoQuestions.length} 道主观题请结合参考答案自行评阅。` : "按题号依次作答，完成后点击页面最下方的提交按钮查看答案与解析。"}</p></div></div> : null}
    {kind === "paper" && data.instructions.length > 0 ? <div className="senior-high-v2-instructions"><BlockRenderer answers={answers} assets={assets} bindings={new Map()} blocks={data.instructions} kind={data.kind} onAnswer={onAnswer} revealSolutions={allSubmitted} /></div> : null}
    <div className="senior-high-v2-sections">{data.sections.map((section) => { const isListeningSection = section.id.toLowerCase().includes("listening") || section.title.includes("听力"); return <section className="senior-high-v2-section" key={section.id}><header><h2>{section.title}</h2>{section.score ? <span>{section.score} 分</span> : null}</header>{section.instructions.length > 0 ? <BlockRenderer answers={answers} assets={assets} bindings={new Map()} blocks={section.instructions} kind={data.kind} onAnswer={onAnswer} revealSolutions={allSubmitted} /> : null}<div className="senior-high-v2-groups">{section.groups.map((group) => {
      const bindings = new Map<string, BlankBinding>();
      for (const question of group.questions) for (const blank of question.blanks) bindings.set(blank.blankId, { options: group.sharedOptions, question });
      const inlineQuestions = group.questions.filter((question) => ["inline_fill", "multi_blank", "table_fill", "shared_option_matching"].includes(question.type) && question.promptBlocks.length === 0 && question.options.length === 0);
      const standaloneQuestions = group.questions.filter((question) => !inlineQuestions.includes(question));
      const groupKey = `${section.id}:${group.id}`;
      const hasStimulusQuestions = group.stimulusBlocks.length > 0 && group.questions.length > 0;
      const isClozeGroup = group.stimulusBlocks.length > 0
        && group.sharedOptions.length === 0
        && group.questions.length > 0
        && group.questions.every((question) => question.type === "single_choice")
        && (group.questions.every((question) => question.placement.kind === "inline") || group.stimulusBlocks.reduce((count, block) => count + (block.type === "paragraph" || block.type === "richText" ? block.runs.filter((run) => run.type === "text" && run.underline && /^\s*[_＿]*\d{1,3}[_＿]*\s*$/.test(run.text)).length : 0), 0) >= Math.min(group.questions.length, 5));
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
        && group.presentation !== "inline"
        && showQuestionColumn
        && (standaloneQuestions.length > 0 || group.sharedOptions.length > 0);
      const groupLabel = group.stimulusBlocks.length > 0 ? "本篇" : "本组";
      const groupSubmit = <div className="senior-high-v2-group-submit"><span>{groupAnswered}/{group.questions.length} 已作答</span><button onClick={() => setSubmittedGroups((current) => ({ ...current, [groupKey]: true }))} type="button">{groupSubmitted ? `重新提交${groupLabel}` : `提交${groupLabel}`}</button></div>;
      return <article className={`senior-high-v2-group ${section.layout}${isListeningSection ? " listening" : ""}${hasSideQuestions ? " with-stimulus-questions" : ""}`} data-has-options={group.sharedOptions.length > 0 ? "true" : "false"} data-presentation={group.presentation} data-side-questions={hasSideQuestions ? "true" : "false"} key={group.id}>
        {group.title ? <h3>{group.title}</h3> : null}
        {group.instructions.length > 0 ? <BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={group.instructions} kind={data.kind} onAnswer={answerGroup} revealSolutions={groupSubmitted} /> : null}
        <div className="senior-high-v2-group-body">
          {group.stimulusBlocks.length > 0 ? <div className="senior-high-v2-stimulus"><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={group.stimulusBlocks} kind={data.kind} onAnswer={answerGroup} onOptionDrop={moveOption} revealSolutions={groupSubmitted} hideClozeLines={isClozeGroup} clozeNumbers={isClozeGroup ? group.questions.map((question) => displayNumber(question, data.kind)) : undefined} /></div> : null}
          {showQuestionColumn ? <div className="senior-high-v2-question-column">
            {(data.submissionMode !== "whole-paper" || perGroupSubmission) && groupSubmitted ? groupSubmit : null}
            {group.sharedOptions.length > 0 ? <div className="senior-high-v2-shared-options" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const optionId = event.dataTransfer.getData("text/senior-high-option"); const sourceQuestionId = event.dataTransfer.getData("text/senior-high-source-question"); if (optionId) moveOption(null, optionId, sourceQuestionId || undefined); }}><strong>拖动选项到下划线处</strong>{group.sharedOptions.filter((option) => group.sharedOptionsReusable || !assignedOptionIds.has(option.id)).map((option) => <div aria-label={`选项 ${option.label}`} className="senior-high-v2-shared-option" draggable role="button" tabIndex={0} key={option.id} onClick={() => { const target = group.questions.find((question) => question.type === "shared_option_matching" && !answers[question.id])?.id; if (target) moveOption(target, option.id); }} onDragStart={(event) => { event.dataTransfer.setData("text/senior-high-option", option.id); event.dataTransfer.effectAllowed = "move"; }} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); const target = group.questions.find((question) => question.type === "shared_option_matching" && !answers[question.id])?.id; if (target) moveOption(target, option.id); }}><b>{option.label}.</b><div><BlockRenderer answers={answers} assets={assets} bindings={bindings} blocks={option.blocks} kind={data.kind} onAnswer={answerGroup} onOptionDrop={moveOption} revealSolutions={groupSubmitted} /></div></div>)}</div> : null}
            {standaloneQuestions.map((question) => <QuestionCard answers={answers} assets={assets} bindings={bindings} key={question.id} kind={data.kind} onAnswer={answerGroup} question={question} submitted={groupSubmitted} />)}
            {(data.submissionMode !== "whole-paper" || perGroupSubmission) && !groupSubmitted && (standaloneQuestions.length > 0 || inlineQuestions.length > 0 || group.sharedOptions.length > 0 || group.stimulusBlocks.length === 0) ? groupSubmit : null}
            {groupSubmitted && inlineQuestions.length > 0 ? <div className="senior-high-v2-inline-results">{inlineQuestions.map((question) => <QuestionCard answers={answers} assets={assets} bindings={bindings} key={question.id} kind={data.kind} onAnswer={answerGroup} question={question} submitted />)}</div> : null}
          </div> : null}
        </div>
      </article>;
    })}</div></section>; })}</div>
    {questions.length < QUESTION_NAV_PAGE_SIZE * 2 ? questionNavigation("bottom") : null}
    {kind === "paper" && data.submissionMode === "whole-paper" ? <div className="senior-high-paper-finish"><span>{answeredCount}/{questions.length} 已作答</span><button onClick={submitPaper} type="button">{allSubmitted ? "重新提交整卷" : "提交整卷并查看解析"}</button></div> : null}
  </section>;
}
