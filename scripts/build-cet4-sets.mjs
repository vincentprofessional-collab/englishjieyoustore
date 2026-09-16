import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const EXAM = process.env.CET_EXAM === "cet6" ? "cet6" : "cet4";
const EXAM_LABEL = EXAM === "cet6" ? "大学英语六级" : "大学英语四级";
const ROOT = path.resolve("public", EXAM);
const libraryData = JSON.parse(await readFile(path.resolve("src/data", EXAM, "library.json"), "utf8"));
const entries = libraryData.entries;
const PART_RE = /^\s*Part\s+(?:[IVX]+|[ⅠⅡⅢⅣⅤⅥ]+|\d+)\b/i;
const SECTION_RE = /^\s*Section\s+[A-C]\b/i;
const RANGE_RE = /^\s*Questions?\s+(\d{1,3})\s*(?:to|[-–])\s*(\d{1,3})/i;
const NUMBER_RE = /^\s*(\d{1,3})\s*[.．、)]\s*(.*)$/;
const OPTION_RE = /(?:^|\s{1,3})([A-O])\s*[).．、:：]\s*/g;
const ANSWER_LINE_RE = /^\s*(\d{1,3})\s*[.．、):：]\s*(.*)$/;

function idFor(prefix, value) {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function paragraphBlocks(lines) {
  return lines.filter(Boolean).map((line) => ({ type: "paragraph", runs: [{ type: "text", text: line }] }));
}

function sourceRef(entry) {
  return {
    sourceDocumentId: entry.sourceHash,
    relativePath: entry.sourceFiles.join("；"),
    sha256: entry.sourceHash,
    locator: {},
    extractionMethod: "manual-review",
    confidence: 0.86,
  };
}

function cleanLines(text) {
  return text.replaceAll("\f", "\n").split(/[\n\u2028\u2029]+/).map((line) => line
    .replace(/HYPERLINK\s+"[^"]+"\s+\\o\s+"[^"]+"\s*/gi, "")
    .replace(/HYPERLINK\s+"[^"]+"\s*/gi, "")
    .replace(/INCLUDEPICTURE\s+"[^"]+"\s*/gi, "")
    .replace(/EQ\s+\\X\\BO\(大\s*/g, "")
    .replace(/大家网是大家的学习好帮手\s*/g, "")
    .replace(/[\u00a0\u200b]/g, " ")
    .replace(/\s+$/g, "").trim()).filter((line) => {
    if (!line) return false;
    if (/^英语(?:四|六)级考试网\b|^www\.CET[46]V\.com\b/i.test(line)) return false;
    if (/尊重劳动尊重版权|文档发布，只好用PDF格式/i.test(line)) return false;
    if (/真题试卷及答案解析考后第一时间发布|预测卷三套含答案解析及听力/i.test(line)) return false;
    if (/^\d+\s*$/.test(line)) return false;
    return true;
  });
}

function answerStart(text) {
  const lines = text.split(/[\n\u2028\u2029]+/);
  let offset = 0;
  for (const line of lines) {
    const strongMarker = /参考答案\s*[（(]|(?:19|20)\d{2}年.*参考答案/i.test(line);
    const marker = strongMarker
      || /^(?:\s*(?:参考答案(?:与解析|及解析)?|答案解析|答案|Key)\s*[：:]?\s*)$/i.test(line)
      || /^(?:\s*\d{4}年.*)\s*[—-]{1,2}\s*答案\s*$/i.test(line);
    if (marker && (offset > text.length * 0.35 || (strongMarker && offset > text.length * 0.2))) return offset;
    offset += line.length + 1;
  }
  return -1;
}

function practiceFamily(title) {
  if (/听力|listening/i.test(title)) return "听力";
  if (/翻译|translation/i.test(title)) return "翻译";
  if (/选词|cloze|完形/i.test(title)) return "选词填空";
  if (/阅读|匹配|reading|surviving|textbook|sugar|integrity|merit/i.test(title)) return "阅读";
  return "综合题型";
}

function splitSource(entry) {
  const start = answerStart(entry.body);
  const body = start < 0 ? entry.body : entry.body.slice(0, start);
  const tail = start < 0 ? "" : entry.body.slice(start);
  return { body, answerText: cleanLines([entry.answers, tail].filter(Boolean).join("\n")).join("\n") };
}

function parseAnswerMap(text) {
  const map = new Map();
  const lines = text.split(/[\n\u2028\u2029]+/);
  for (const line of lines) {
    const range = line.match(/^\s*(\d{1,3})\s*[-–]\s*(\d{1,3})\s+([A-O]{2,})\s*$/i);
    if (range && range[3].length === Number(range[2]) - Number(range[1]) + 1) {
      [...range[3]].forEach((value, index) => map.set(Number(range[1]) + index, value.toUpperCase()));
      continue;
    }
    const matches = [...line.matchAll(/(?:^|\s)(\d{1,3})\s*[.．、:：)]\s*([A-O])\b/gi)];
    for (const match of matches) map.set(Number(match[1]), match[2].toUpperCase());
    const textMatch = line.match(ANSWER_LINE_RE);
    if (textMatch && !map.has(Number(textMatch[1])) && textMatch[2].trim()) map.set(Number(textMatch[1]), textMatch[2].trim());
  }
  return map;
}

function parseOptions(lines) {
  const options = [];
  for (const line of lines) {
    const matches = [...line.matchAll(OPTION_RE)];
    if (matches.length === 0 || (matches.length === 1 && !/^\s*[A-O]\s*[).．、:：]/i.test(line))) {
      if (options.length && line.trim()) options[options.length - 1].text += ` ${line.trim()}`;
      continue;
    }
    matches.forEach((match, index) => {
      const start = match.index + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : line.length;
      options.push({ label: match[1].toUpperCase(), text: line.slice(start, end).trim() });
    });
  }
  return options.filter((option) => option.text);
}

function numberedRecords(lines) {
  const records = [];
  for (const line of lines) {
    const match = line.match(NUMBER_RE);
    if (match) records.push({ number: Number(match[1]), lines: [match[2]] });
    else if (records.length && line.trim()) records[records.length - 1].lines.push(line.trim());
  }
  return records;
}

function questionFromRecord(record, index, context, answerMap, ref, prefix) {
  const options = [];
  const stemLines = [];
  let optionStarted = false;
  for (const line of record.lines) {
    const parsed = parseOptions([line]);
    if (parsed.length) {
      optionStarted = true;
      options.push(...parsed);
    } else if (optionStarted && line.trim() && options.length) {
      options[options.length - 1].text += ` ${line.trim()}`;
    } else {
      stemLines.push(line);
    }
  }
  const stem = stemLines.join(" ").trim();
  const answer = answerMap.get(record.number);
  const type = options.length ? "single_choice" : context === "translation" ? "translation" : "short_answer";
  const answerSpec = options.length && /^[A-O]$/.test(String(answer || ""))
    ? { availability: "answered", gradingMode: "auto", kind: "choice", acceptedAnswers: [answer], normalization: { unicodeNfkc: true, trim: true, collapseSpaces: true, caseSensitive: false } }
    : { availability: "none", gradingMode: "none", kind: type === "translation" ? "reference" : "none", ...(type === "translation" && answer ? { referenceAnswer: answer } : {}) };
  return {
    id: `${prefix}-q-${record.number}-${index + 1}`,
    displayNumber: record.number,
    sourceQuestionNumber: record.number,
    type,
    promptBlocks: stem ? paragraphBlocks([stem]) : [],
    placement: { kind: "standalone" },
    options: options.map((option) => ({ id: option.label, label: option.label, blocks: paragraphBlocks([option.text]) })),
    blanks: [],
    answerSpec,
    explanationBlocks: [],
    sourceRefs: [ref],
    reviewStatus: answerSpec.availability === "answered" ? "approved" : "review_required",
  };
}

function splitByStarts(lines, predicate) {
  const starts = lines.map((line, index) => predicate(line) ? index : -1).filter((index) => index >= 0);
  if (!starts.length) return [{ title: "", lines }];
  return starts.map((start, index) => ({ title: lines[start], lines: lines.slice(start + 1, starts[index + 1] ?? lines.length) }));
}

function clozeGroup(lines, answerMap, ref, prefix, title) {
  const textLines = [];
  const optionLines = [];
  let optionStarted = false;
  for (const line of lines) {
    if (/^\s*[A-O]\s*[).．、:：]/i.test(line) || (optionStarted && /^[A-O]\s/.test(line))) optionStarted = true;
    if (optionStarted) optionLines.push(line); else textLines.push(line);
  }
  const text = textLines.join(" ").replace(/\s+/g, " ").trim();
  const matches = [...text.matchAll(/[_＿]{2,}\s*(\d{1,3})\s*[_＿]{2,}/g)];
  if (!matches.length) return null;
  const runs = [];
  let cursor = 0;
  const questions = [];
  matches.forEach((match, index) => {
    if (match.index > cursor) runs.push({ type: "text", text: text.slice(cursor, match.index) });
    const number = Number(match[1]);
    const blankId = `${prefix}-blank-${number}`;
    runs.push({ type: "blank", blankId });
    const answer = answerMap.get(number);
    const isChoice = /^[A-O]$/.test(String(answer || ""));
    questions.push({
      id: `${prefix}-q-${number}`,
      displayNumber: number,
      sourceQuestionNumber: number,
      type: isChoice ? "shared_option_matching" : "inline_fill",
      promptBlocks: [],
      placement: { kind: "inline", blankIds: [blankId] },
      options: [],
      blanks: [{ blankId, label: `第 ${number} 题` }],
      answerSpec: isChoice
        ? { availability: "answered", gradingMode: "auto", kind: "choice", acceptedAnswers: [answer], normalization: { unicodeNfkc: true, trim: true, collapseSpaces: true, caseSensitive: false } }
        : { availability: answer ? "answered" : "none", gradingMode: answer ? "auto" : "none", kind: "per_blank", ...(answer ? { perBlankAnswers: { [blankId]: [answer] }, normalization: { unicodeNfkc: true, trim: true, collapseSpaces: true, caseSensitive: false } } : {}) },
      explanationBlocks: [], sourceRefs: [ref], reviewStatus: answer ? "approved" : "review_required",
    });
    cursor = match.index + match[0].length;
  });
  if (cursor < text.length) runs.push({ type: "text", text: text.slice(cursor) });
  const sharedOptions = parseOptions(optionLines).map((option) => ({ id: option.label, label: option.label, blocks: paragraphBlocks([option.text]) }));
  return {
    id: prefix,
    title,
    presentation: sharedOptions.length ? "reading" : "cloze",
    instructions: [],
    stimulusBlocks: [{ type: "paragraph", runs }],
    sharedOptions,
    sharedOptionsReusable: false,
    questions,
  };
}

function makeGroups(lines, context, answerMap, ref, prefix) {
  const firstRangeIndex = lines.findIndex((line) => RANGE_RE.test(line));
  const ranges = splitByStarts(lines, (line) => RANGE_RE.test(line));
  if (firstRangeIndex > 0 && lines.slice(0, firstRangeIndex).some((line) => NUMBER_RE.test(line))) ranges.unshift({ title: "题目", lines: lines.slice(0, firstRangeIndex) });
  const groups = [];
  for (const [groupIndex, range] of ranges.entries()) {
    const source = range.lines;
    const records = numberedRecords(source);
    const rangeTitle = range.title || "题目";
    if (!records.length) {
      const cloze = clozeGroup(source, answerMap, ref, `${prefix}-group-${groupIndex + 1}`, rangeTitle);
      if (cloze) groups.push(cloze);
      continue;
    }
    const firstRecordIndex = source.findIndex((line) => NUMBER_RE.test(line));
    const stimulusLines = context === "listening" ? [] : firstRecordIndex > 0 ? source.slice(0, firstRecordIndex).filter((line) => !/^Directions?\b/i.test(line) && !SECTION_RE.test(line) && !/^注意[：:]/.test(line)) : [];
    const questions = records.map((record, index) => questionFromRecord(record, index, context, answerMap, ref, `${prefix}-group-${groupIndex + 1}`));
    groups.push({
      id: `${prefix}-group-${groupIndex + 1}`,
      title: rangeTitle,
      presentation: stimulusLines.length ? "reading" : "inline",
      instructions: [],
      stimulusBlocks: paragraphBlocks(stimulusLines),
      sharedOptions: [],
      questions,
    });
  }
  if (!groups.length) {
    const records = numberedRecords(lines);
    if (records.length) groups.push({ id: `${prefix}-group-1`, title: "题组", presentation: "inline", instructions: [], stimulusBlocks: [], sharedOptions: [], questions: records.map((record, index) => questionFromRecord(record, index, context, answerMap, ref, `${prefix}-group-1`)) });
  }
  return groups;
}

function writingSection(lines, answerText, ref, prefix) {
  const prompt = lines.filter((line) => !/^Directions?\b/i.test(line) && !/^注意[：:]/.test(line) && !/^[_＿-]{5,}$/.test(line));
  const partOneReference = answerText.match(/(?:^|\n)\s*Part\s+I\s+Writing\b([\s\S]*?)(?=\n\s*Part\s+II\b|$)/i)?.[1] || "";
  const labeledReference = answerText.match(/(?:^|\n)\s*(?:参考范文|范文|Possible Version|Sample)\s*[:：]?([\s\S]*)/im)?.[1] || "";
  const usablePartOneReference = /(?:^|\n)\s*Directions?\b/i.test(partOneReference.slice(0, 220)) ? "" : partOneReference;
  const reference = (usablePartOneReference || labeledReference).replace(/^\s*(?:参考答案|(?:四|六)级英语参考范文|参考范文)\s*[:：]?/i, "").trim();
  return { id: `${prefix}-writing`, title: "Writing 写作", layout: "flow", instructions: [], groups: [{ id: `${prefix}-writing-group`, title: "写作题", presentation: "writing", instructions: [], stimulusBlocks: [], sharedOptions: [], questions: [{ id: `${prefix}-q-1`, displayNumber: 1, sourceQuestionNumber: 1, type: "essay", promptBlocks: paragraphBlocks(prompt), placement: { kind: "standalone" }, options: [], blanks: [], answerSpec: reference ? { availability: "answered", gradingMode: "manual", kind: "reference", referenceAnswer: reference } : { availability: "none", gradingMode: "none", kind: "none" }, explanationBlocks: [], sourceRefs: [ref], reviewStatus: reference ? "approved" : "review_required" }] }] };
}

function translationSection(lines, answerText, ref, prefix) {
  const records = numberedRecords(lines);
  const answerLines = new Map();
  let current = null;
  for (const line of answerText.split(/[\n\u2028\u2029]+/)) {
    const match = line.match(ANSWER_LINE_RE);
    if (match) { current = Number(match[1]); answerLines.set(current, match[2].trim()); }
    else if (current && line.trim()) answerLines.set(current, `${answerLines.get(current)} ${line.trim()}`);
  }
  const translationRecords = records.length ? records : [{ number: 1, lines: lines.filter((line) => !/^Directions?\b/i.test(line) && !/^注意[：:]/.test(line) && !/^翻译/i.test(line)) }];
  const questions = translationRecords.filter((record) => record.lines.length).map((record, index) => {
    const reference = answerLines.get(record.number) || "";
    return { id: `${prefix}-q-${record.number}-${index + 1}`, displayNumber: record.number, sourceQuestionNumber: record.number, type: "translation", promptBlocks: paragraphBlocks([record.lines.join(" ")]), placement: { kind: "standalone" }, options: [], blanks: [], answerSpec: reference ? { availability: "answered", gradingMode: "manual", kind: "reference", referenceAnswer: reference } : { availability: "none", gradingMode: "none", kind: "none" }, explanationBlocks: [], sourceRefs: [ref], reviewStatus: reference ? "approved" : "review_required" };
  });
  return { id: `${prefix}-translation`, title: "Translation 翻译", layout: "flow", instructions: [], groups: [{ id: `${prefix}-translation-group`, title: "翻译题", presentation: "writing", instructions: [], stimulusBlocks: [], sharedOptions: [], questions }] };
}

function buildSet(entry, kind) {
  const { body, answerText } = splitSource(entry);
  const lines = cleanLines(body);
  const ref = sourceRef(entry);
  const answerMap = parseAnswerMap(answerText);
  const partSegments = splitByStarts(lines, (line) => PART_RE.test(line));
  let parts = partSegments.length && partSegments[0].title ? partSegments : [{ title: "", lines }];
  if (parts.length === 1 && /writing|写作/i.test(parts[0].title)) {
    const firstQuestion = parts[0].lines.findIndex((line) => NUMBER_RE.test(line));
    if (firstQuestion > 0) {
      parts = [
        { title: parts[0].title, lines: parts[0].lines.slice(0, firstQuestion) },
        { title: "Part II 试题", lines: parts[0].lines.slice(firstQuestion) },
      ];
    }
  }
  const sections = [];
  for (const [partIndex, part] of parts.entries()) {
    const title = part.title || (entry.topic === "翻译" ? "Translation 翻译" : entry.topic === "写作" ? "Writing 写作" : entry.title);
    const context = /translation|翻译/i.test(title) || entry.topic === "翻译" ? "translation" : /writing|写作/i.test(title) || entry.topic === "写作" ? "writing" : /listening|听力/i.test(title) ? "listening" : "reading";
    let section;
    if (context === "writing") section = writingSection(part.lines, answerText, ref, `${entry.id}-part-${partIndex + 1}`);
    else if (context === "translation") section = translationSection(part.lines, answerText, ref, `${entry.id}-part-${partIndex + 1}`);
    else {
      const subsections = splitByStarts(part.lines, (line) => SECTION_RE.test(line));
      const groups = [];
      for (const [subIndex, subsection] of subsections.entries()) groups.push(...makeGroups(subsection.lines, context, answerMap, ref, `${entry.id}-part-${partIndex + 1}-section-${subIndex + 1}`));
      section = { id: `${entry.id}-part-${partIndex + 1}`, title, layout: "flow", instructions: [], groups };
    }
    if (section.groups.length) sections.push(section);
  }
  const questionCount = sections.reduce((sum, section) => sum + section.groups.reduce((groupSum, group) => groupSum + group.questions.length, 0), 0);
  if (!questionCount) return null;
  const assetRefs = entry.audioUrl ? [{ assetId: `${entry.id}-audio`, kind: "audio", url: entry.audioUrl, mimeType: "audio/mpeg", sha256: "", sourceRefs: [ref] }] : [];
  if (assetRefs.length && sections[0]) sections[0].instructions = [{ type: "audio", assetId: assetRefs[0].assetId, label: "听力音频" }];
  return {
    schemaVersion: 2,
    id: entry.id,
    kind,
    title: entry.title,
    year: entry.title.match(/20\d{2}/)?.[0] || "",
    region: "全国",
    variant: entry.title.match(/第\s*([123])\s*套/)?.[1] ? `第${entry.title.match(/第\s*([123])\s*套/)[1]}套` : "",
    submissionMode: kind === "paper" ? "whole-paper" : undefined,
    instructions: [{ type: "notice", tone: "info", text: kind === "paper" ? "按原卷分区作答。提交整卷后显示可用答案与原资料参考内容。" : "按题组作答。提交本组后显示可用答案；开放题仅提供参考内容，不作伪自动判分。" }],
    sections,
    assetRefs,
    sourceRefs: [ref],
    quality: { structureStatus: "approved", structureConfidence: 0.86, issueCount: 0, issues: [] },
  };
}

await rm(path.join(ROOT, "practice"), { recursive: true, force: true });
await rm(path.join(ROOT, "papers"), { recursive: true, force: true });
await mkdir(path.join(ROOT, "practice"), { recursive: true });
await mkdir(path.join(ROOT, "papers"), { recursive: true });

const indexEntries = [];
const practiceSets = [];
for (const entry of entries.filter((item) => item.section !== "知识点")) {
  const kind = entry.section === "试卷" ? "paper" : "practice";
  const set = buildSet(entry, kind);
  if (!set) continue;
  if (kind === "practice") {
    practiceSets.push(set);
    continue;
  }
  await writeFile(path.join(ROOT, "papers", `${entry.id}.json`), `${JSON.stringify(set, null, 2)}\n`);
  const questionCount = set.sections.reduce((sum, section) => sum + section.groups.reduce((groupSum, group) => groupSum + group.questions.length, 0), 0);
  indexEntries.push({ id: entry.id, kind, title: entry.title, year: set.year, region: set.region, variant: set.variant, questionCount, answeredCount: set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).filter((question) => question.answerSpec.availability === "answered").length, explanationCount: 0, answerStatus: "partial", questionTypes: [...new Set(set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions.map((question) => question.type))))], href: `/${EXAM}/${entry.id}`, quality: { structureStatus: set.quality.structureStatus, structureConfidence: set.quality.structureConfidence, issueCount: set.quality.issueCount } });
}
const groupedPractice = new Map();
for (const set of practiceSets) {
  const name = set.sections.some((section) => /听力|listening/i.test(section.title)) ? "听力" : practiceFamily(set.title);
  const group = groupedPractice.get(name) || { name, sections: [], assetRefs: [], sourceRefs: [] };
  group.sections.push(...set.sections.map((section) => ({ ...section, id: `${set.id}-${section.id}`, title: `${set.title} · ${section.title}`, groups: section.groups.map((questionGroup) => ({ ...questionGroup, id: `${set.id}-${questionGroup.id}` })) })));
  group.assetRefs.push(...set.assetRefs);
  group.sourceRefs.push(...set.sourceRefs);
  groupedPractice.set(name, group);
}
for (const group of groupedPractice.values()) {
  const familySlug = { "听力": "listening", "翻译": "translation", "选词填空": "cloze", "阅读": "reading", "综合题型": "mixed" }[group.name] || "mixed";
  const id = `practice-${EXAM}-${familySlug}`;
  const set = { schemaVersion: 2, id, kind: "practice", title: `${EXAM_LABEL}${group.name}专项训练`, year: "历年", region: "全国", variant: "", instructions: [{ type: "notice", tone: "info", text: "同一题型的专项资料集中在本页；按题组提交后显示可用答案。" }], sections: group.sections, assetRefs: group.assetRefs, sourceRefs: group.sourceRefs, quality: { structureStatus: "approved", structureConfidence: 0.84, issueCount: 0, issues: [] } };
  await writeFile(path.join(ROOT, "practice", `${id}.json`), `${JSON.stringify(set, null, 2)}\n`);
  const questions = set.sections.flatMap((section) => section.groups.flatMap((questionGroup) => questionGroup.questions));
  indexEntries.unshift({ id, kind: "practice", title: set.title, year: set.year, region: set.region, variant: set.variant, questionCount: questions.length, answeredCount: questions.filter((question) => question.answerSpec.availability === "answered").length, explanationCount: 0, answerStatus: "partial", questionTypes: [...new Set(questions.map((question) => question.type))], href: `/${EXAM}/${id}`, quality: { structureStatus: set.quality.structureStatus, structureConfidence: set.quality.structureConfidence, issueCount: set.quality.issueCount } });
}
indexEntries.sort((left, right) => (left.kind === right.kind ? right.title.localeCompare(left.title, "zh-CN", { numeric: true }) : left.kind === "practice" ? -1 : 1));
await writeFile(path.join(ROOT, "index.json"), `${JSON.stringify({ schemaVersion: 2, generatedAt: new Date().toISOString(), entries: indexEntries }, null, 2)}\n`);
console.log(JSON.stringify({ output: ROOT, entries: indexEntries.length, practice: indexEntries.filter((entry) => entry.kind === "practice").length, papers: indexEntries.filter((entry) => entry.kind === "paper").length, questions: indexEntries.reduce((sum, entry) => sum + entry.questionCount, 0) }, null, 2));
