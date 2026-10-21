const normalization = { unicodeNfkc: true, trim: true, collapseSpaces: true, caseSensitive: false };
export const CET6_ADVERTISING = /公众号|公眾號|^老师说|视频解析中.{0,8}老师|(?:淘宝|淘寶).{0,12}(?:[底店]铺|[店底]鋪|工作室|搜|客服|资料)|^淘宝$|非此店铺|(?:微信|微\s*信)(?:号|群|公众|ID|[：:])|添加微信|扫码.{0,12}(?:关注|领取|购买|加群)|(?:快来|请|欢迎).{0,12}(?:扫码|扫描).{0,20}(?:视频|课|关注|观看|收看)|(?:扫描|扫码).{0,15}(?:本页|视频课|二维码).{0,12}(?:观看|收看|领取|关注)|关注我们|关注领取|关注.*(?:资料|公号)|加群|QQ群|群号|资料领取|资料购买|购买.*资料|免费领取|领取.*资料|练习方式|练习方法|备考建议|刷题建议|备考方法|打印说明|下载说明|下载地址|版权所有|如有侵权.{0,8}(?:联系|删除)|侵权.{0,4}(?:必究|请联系|联系删除)|翻版必究|水印|taobao\.com|weixin\.qq|pan\.baidu|lanzou|qun\.qq|t\.me|小红书|哔哩哔哩|星火英语|有道考神|大家网|大家论坛|考虫/i;

export function cleanCet6Source(text) {
  return String(text || "").normalize("NFKC").replace(/\r/g, "").replace(/[\u200b\ufeff]/g, "")
    .split(/[\n\f\u2028\u2029]+/).map(line => line.trim().replace(/(^|\s)([АВСЕНКМОРТХ0])\s*([).、:])/g, (_, lead, label, punctuation) => `${lead}${({ А: "A", В: "B", С: "C", Е: "E", Н: "H", К: "K", М: "M", О: "O", Р: "P", Т: "T", Х: "X", 0: "O" })[label]}${punctuation}`))
    .filter(line => line && !CET6_ADVERTISING.test(line) && !/^\d{1,3}$/.test(line)
      && !/^(?:[•·]?\s*)?20\d\d\s*年.*(?:六级真题|六级.*第.*套).*\d\s*$/.test(line))
    .join("\n");
}

const paragraph = text => ({ type: "paragraph", runs: [{ type: "text", text }] });
const blocks = lines => lines.filter(Boolean).map(paragraph);
const optionPattern = /(?:^|\s)(?:\[([A-O])\]|([A-O])\s*[).、:])\s*/g;
const rangePattern = /^Questions?\s+\d+\s*(?:to|[-–])\s*\d+/i;
const sectionPattern = /^Section\s+([A-C])\b/i;
const numberPattern = /^(\d{1,2})\s*[.、)]\s*(.*)$/;
const partPattern = /^Part\s*(?:\S{1,6}\s*)?(Writing|Listening\s+Comprehension|Reading\s+Comprehension|Translation)\b/i;

export function splitParts(body) {
  const lines = cleanCet6Source(body).split("\n");
  // OCR can place the Roman numeral and section title on adjacent lines.
  for (let i = 0; i + 1 < lines.length; i++) if (/^Part\s*[IVX1]+\s*$/i.test(lines[i]) && /^(Writing|Listening Comprehension|Reading Comprehension|Translation)\b/i.test(lines[i + 1])) {
    lines[i] += ` ${lines[i + 1]}`; lines[i + 1] = "";
  }
  const result = new Map(); let current;
  for (const line of lines) {
    const match = line.match(partPattern);
    if (match) { current = match[1].toLowerCase().split(" ")[0]; if (!result.has(current)) result.set(current, []); continue; }
    if (current && line) result.get(current).push(line);
  }
  return result;
}

function splitSections(lines) {
  const result = new Map(); let current;
  for (const line of lines || []) {
    const match = line.match(sectionPattern);
    if (match) { current = match[1].toUpperCase(); result.set(current, []); continue; }
    if (current) result.get(current).push(line);
  }
  return result;
}

function splitDirections(lines) {
  let start = lines.findIndex(line => /^Directions?\s*:/i.test(line));
  if (start < 0) return { instructions: [], body: lines };
  const instructionLines = []; let end = start;
  const terminal = /(?:single line through the cent(?:er|re)|more than once|Answer Sheet\s*2|Answer Sheet\s*1|Answer the questions|no more than 200 words|beginning of your essay)\s*[.。]?$/i;
  for (; end < lines.length; end++) {
    const line = lines[end]; instructionLines.push(line);
    if (terminal.test(line)) { end++; break; }
    if (end + 1 < lines.length && (rangePattern.test(lines[end + 1]) || /^(?:Passage|Conversation|Recording)\s+(?:One|Two|Three)/i.test(lines[end + 1]))) { end++; break; }
    if (end - start > 15) break;
  }
  return { instructions: blocks([instructionLines.join(" ")]), body: [...lines.slice(0, start), ...lines.slice(end)] };
}

function readOptions(lines, allowed = "ABCDEFGHIJKLMNO") {
  const map = new Map(); let last;
  for (const line of lines) {
    const matches = [...line.matchAll(optionPattern)].filter(m => allowed.includes(m[1] || m[2]));
    if (!matches.length) { if (last) map.set(last, `${map.get(last)} ${line}`.trim()); continue; }
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i], label = m[1] || m[2];
      const text = line.slice(m.index + m[0].length, matches[i + 1]?.index ?? line.length).trim();
      map.set(label, `${map.get(label) || ""} ${text}`.trim()); last = label;
    }
  }
  return [...map].sort(([a], [b]) => a.localeCompare(b)).map(([label, text]) => ({ id: label, label, blocks: blocks([text]) }));
}

function records(lines, first, last) {
  const result = []; let current;
  for (const line of lines) {
    if (rangePattern.test(line) || sectionPattern.test(line) || /^(?:Passage|Conversation|Recording)\s+(?:One|Two|Three)/i.test(line)) { current = undefined; continue; }
    const match = line.match(numberPattern);
    if (match && Number(match[1]) >= first && Number(match[1]) <= last) {
      current = { number: Number(match[1]), lines: [match[2]] }; result.push(current);
    } else if (current) current.lines.push(line);
  }
  return result;
}

export function buildCet6Paper(entry) {
  const review = entry.sourceReview || {};
  const versionNotes = entry.id.startsWith("cet6-paper-2015") ? [{ type: "notice", tone: "info", text: "本套使用原资料收录的25题听力版本。" }] : [];
  if (review.sharedSupplement) versionNotes.push({ type: "notice", tone: "info", text: "阅读部分按原卷说明引用本次第2套完全相同的题目与解析。" });
  if (review.sharedSection) versionNotes.push({ type: "notice", tone: "info", text: "选词填空按原卷说明引用本次第2套相同题目与解析。" });
  const ref = { sourceDocumentId: entry.sourceHash, relativePath: entry.sourceFiles[0], sha256: entry.sourceHash, locator: {}, extractionMethod: review.extractionMethod || "docx-text", confidence: 1 };
  const issues = [...(review.issues || [])];
  const parts = splitParts(entry.body);
  const assetRefs = [...(review.assets || []), ...(review.questionAssets || [])];
  const explanations = review.explanations || {};
  const qref = n => [ref, ...(typeof n === "number" && n >= 26 && n <= 55 ? review.sharedSupplementSourceRefs || [] : []), ...(explanations[n]?.sourceRefs || [])];
  const question = (number, type, promptBlocks = [], options = [], extra = {}) => {
    const evidence = explanations[number];
    const answer = evidence?.answer;
    const answerSpec = answer && /^[A-Z]$/.test(answer) ? { availability: "answered", gradingMode: "auto", kind: "choice", acceptedAnswers: [answer], normalization }
      : evidence?.blocks?.length ? { availability: "answered", gradingMode: "manual", kind: "reference", referenceAnswer: evidence.blocks } : { availability: "none", gradingMode: "none", kind: "none" };
    return { id: `${entry.id}-${type}-${number}`, displayNumber: typeof number === "number" ? number : type === "essay" ? 56 : 57, ...(typeof number === "number" ? { sourceQuestionNumber: number } : {}), type, promptBlocks, placement: { kind: "standalone" }, options, blanks: [], answerSpec, explanationBlocks: answerSpec.kind === "reference" ? [] : evidence?.blocks || [], sourceRefs: qref(number), reviewStatus: evidence?.blocks?.length ? "approved" : "review_required", ...extra };
  };
  const makeSection = (name, title, groups, instructions = []) => ({ id: `${entry.id}-${name}`, title, layout: "flow", instructions, groups });
  const makeGroup = (id, title, stimulusBlocks, questions, extra = {}) => ({ id: `${entry.id}-${id}-group`, title, presentation: "reading", instructions: [], stimulusBlocks, sharedOptions: [], questions, ...extra });
  const matchingQuestion = (number, prompt) => {
    const blankId = `${entry.id}-paragraph-${number}`;
    return question(number, "shared_option_matching", [...prompt, { type: "paragraph", runs: [{ type: "blank", blankId }] }], [], { placement: { kind: "inline", blankIds: [blankId] }, blanks: [{ blankId, label: `第${number}题` }] });
  };
  const openQuestion = (name, type, lines) => {
    const evidence = explanations[name];
    return question(name, type, blocks(lines || []), [], {
      answerSpec: evidence?.blocks?.length ? { availability: "answered", gradingMode: "manual", kind: "reference", referenceAnswer: evidence.blocks } : { availability: "none", gradingMode: "none", kind: "none" },
      explanationBlocks: [], reviewStatus: evidence?.blocks?.length ? "approved" : "review_required",
    });
  };
  if (review.imagePaper) {
    const views = review.sourceImages;
    const sections = [];
    const sourceIssues = [...(review.issues || [])];
    const labelOptions = labels => [...labels].map(label => ({ id: label, label, blocks: [] }));
    if (views["写作"]?.length) sections.push(makeSection("writing", "Writing 写作", [makeGroup("writing", "写作", [], [{ ...openQuestion("写作", "essay", []), promptBlocks: views["写作"] }], { presentation: "writing" })]));
    if (views.listening?.length && review.hasListeningQuestions) {
      const questions = Array.from({ length: 25 }, (_, index) => question(index + 1, "single_choice", [], labelOptions("ABCD")));
      sections.push(makeSection("listening", "Listening Comprehension 听力", [makeGroup("listening", "听力理解", views.listening, questions)], review.audio ? [{ type: "audio", assetId: review.audio, label: "听力音频" }] : []));
      if (!review.audio) sourceIssues.push("听力音频尚未核对入库");
    } else if (views.listening?.length) {
      sections.push(makeSection("listening", "原卷听力说明", [makeGroup("listening-notice", "原卷说明", views.listening, [], { presentation: "inline" })]));
    }
    const groups = [];
    if (views.readingA?.length) {
      const questions = Array.from({ length: 10 }, (_, index) => {
        const number = index + 26, blankId = `${entry.id}-blank-${number}`;
        return question(number, "shared_option_matching", [{ type: "paragraph", runs: [{ type: "blank", blankId }] }], [], { placement: { kind: "inline", blankIds: [blankId] }, blanks: [{ blankId, label: `第${number}题` }] });
      });
      groups.push(makeGroup("word-bank", "Section A 选词填空", views.readingA, questions, { sharedOptions: labelOptions("ABCDEFGHIJKLMNO"), sharedOptionsReusable: false }));
    }
    if (views.readingB?.length) {
      const labels = review.paragraphLabels || "";
      if (labels.length < 5) sourceIssues.push("长篇阅读段落选项范围尚未核对");
      groups.push(makeGroup("matching", "Section B 长篇阅读（段落可重复选择）", views.readingB, Array.from({ length: 10 }, (_, index) => matchingQuestion(index + 36, [])), { sharedOptions: labelOptions(labels), sharedOptionsReusable: true }));
    }
    if (views.readingC?.length) groups.push(makeGroup("reading-c", "Section C 仔细阅读（两篇）", views.readingC, Array.from({ length: 10 }, (_, index) => question(index + 46, "single_choice", [], labelOptions("ABCD")))));
    if (groups.length) sections.push(makeSection("reading", "Reading Comprehension 阅读", groups));
    if (groups.length && groups.length !== 3) sourceIssues.push("阅读三个分区未完整定位");
    if (views["翻译"]?.length) sections.push(makeSection("translation", "Translation 翻译", [makeGroup("translation", "汉译英", [], [{ ...openQuestion("翻译", "translation", []), promptBlocks: views["翻译"] }], { presentation: "writing" })]));
    for (const q of sections.flatMap(s => s.groups.flatMap(g => g.questions))) if (!q.explanationBlocks.length && !q.answerSpec.referenceAnswer) sourceIssues.push(`第${q.displayNumber}题解析未核对`);
    return { schemaVersion: 2, id: entry.id, kind: "paper", title: entry.title, year: entry.title.match(/20\d\d/)[0], region: "全国", variant: `第${entry.title.match(/第\s*([123])\s*套/)[1]}套`, submissionMode: "whole-paper", instructions: [...versionNotes, ...(!review.hasListeningQuestions ? [{ type: "notice", tone: "info", text: groups.length ? "本卷原资料收录写作、阅读和翻译。" : "本卷原资料收录写作和翻译。" }] : [])], sections, assetRefs, sourceRefs: [ref], quality: { structureStatus: sourceIssues.length ? "review_required" : "approved", structureConfidence: sourceIssues.length ? 0 : 1, issueCount: [...new Set(sourceIssues)].length, issues: [...new Set(sourceIssues)] } };
  }
  const sections = [];
  const writing = parts.get("writing");
  if (writing?.length) sections.push(makeSection("writing", "Writing 写作", [makeGroup("writing", "写作", [], [openQuestion("写作", "essay", writing)], { presentation: "writing" })]));
  else issues.push("写作题面缺失");

  const listening = parts.get("listening") || [];
  const listeningRecords = records(listening, 1, 25);
  const listeningGroups = [];
  if (listeningRecords.length) {
    const questions = listeningRecords.map(record => {
      const optionStart = record.lines.findIndex(line => [...line.matchAll(optionPattern)].length);
      const options = readOptions(record.lines.slice(optionStart), "ABCD");
      if (options.map(o => o.label).join("") !== "ABCD") issues.push(`听力第${record.number}题选项不完整`);
      return question(record.number, "single_choice", optionStart > 0 ? blocks(record.lines.slice(0, optionStart)) : [], options);
    });
    listeningGroups.push(makeGroup("listening", "听力理解", [], questions, { presentation: "inline" }));
    if (questions.length !== 25) issues.push(`听力题数为${questions.length}，须核对原卷`);
  } else if (listening.length) {
    issues.push("原卷未列出本套听力，不能据其他套推测选项顺序");
    listeningGroups.push(makeGroup("listening-notice", "原卷听力说明", blocks(listening), [], { presentation: "inline" }));
  } else issues.push("听力分区缺失");
  const listeningInstructions = review.audio ? [{ type: "audio", assetId: review.audio, label: "听力音频" }] : [];
  if (!review.audio && listeningRecords.length) issues.push("听力音频尚未核对入库");
  if (listeningGroups.length) sections.push(makeSection("listening", "Listening Comprehension 听力", listeningGroups, listeningInstructions));

  const reading = splitSections(parts.get("reading"));
  const groups = [];
  const a = splitDirections(reading.get("A") || []);
  let aBody = a.body.filter(line => !rangePattern.test(line));
  const bankStart = aBody.findIndex(line => /^(?:\[A\]|A\s*[).、:])/.test(line));
  if (bankStart >= 0) {
    const sharedOptions = readOptions(aBody.slice(bankStart));
    const text = aBody.slice(0, bankStart).join(" ");
    let cursor = 0; const runs = []; const questions = [];
    for (let number = 26; number <= 35; number++) {
      const match = new RegExp(`(?:[_＿]+\\s*)?(?<!\\d)${number}(?!\\d)(?:\\s*[_＿]+)?`).exec(text.slice(cursor));
      if (!match) { issues.push(`选词填空第${number}题空格缺失`); continue; }
      const start = cursor + match.index, blankId = `${entry.id}-blank-${number}`;
      if (start > cursor) runs.push({ type: "text", text: text.slice(cursor, start) });
      runs.push({ type: "blank", blankId }); cursor = start + match[0].length;
      questions.push(question(number, "shared_option_matching", [], [], { placement: { kind: "inline", blankIds: [blankId] }, blanks: [{ blankId, label: `第${number}题` }] }));
    }
    if (cursor < text.length) runs.push({ type: "text", text: text.slice(cursor) });
    if (sharedOptions.map(o => o.label).join("") !== "ABCDEFGHIJKLMNO") issues.push("选词填空词库须包含A—O共15项");
    groups.push(makeGroup("word-bank", "Section A 选词填空", [{ type: "paragraph", runs }], questions, { instructions: a.instructions, sharedOptions, sharedOptionsReusable: false }));
  } else issues.push("选词填空词库缺失");

  const b = splitDirections(reading.get("B") || []);
  const statements = records(b.body, 36, 45);
  const firstStatement = b.body.findIndex(line => /^36\s*[.、)]/.test(line));
  const paragraphs = firstStatement >= 0 ? b.body.slice(0, firstStatement) : b.body;
  const labels = [...new Set([...paragraphs.join("\n").matchAll(/(?:^|\n)\s*(?:\[([A-Z])\]|([A-Z])\s*[).、:])/g)].map(m => m[1] || m[2]))].sort();
  if (statements.length !== 10 || labels.length < 5) issues.push("长篇阅读段落或36—45题不完整");
  groups.push(makeGroup("matching", "Section B 长篇阅读（段落可重复选择）", blocks(paragraphs), statements.map(record => matchingQuestion(record.number, blocks([record.lines.join(" ")]))), { instructions: b.instructions, sharedOptions: labels.map(label => ({ id: label, label, blocks: [] })), sharedOptionsReusable: true }));

  const c = splitDirections(reading.get("C") || []);
  const cLines = c.body;
  const starts = cLines.map((line, index) => /^Questions?\s+(?:46|51)\s*(?:to|[-–])\s*(?:50|55)/i.test(line) ? index : -1).filter(i => i >= 0);
  for (const [i, start] of starts.entries()) {
    const first = /\b51\b/.test(cLines[start]) ? 51 : 46;
    const passage = cLines.slice(start + 1, starts[i + 1] ?? cLines.length).filter(line => !/^(?:Passage\s+(?:One|Two)|Questions?\s+\d+)/i.test(line));
    const firstQuestion = passage.findIndex(line => new RegExp(`^${first}\\s*[.、)]`).test(line));
    const found = records(passage, first, first + 4);
    if (found.length !== 5) issues.push(`仔细阅读${first}—${first + 4}题不完整`);
    groups.push(makeGroup(`reading-${first}`, `Section C 仔细阅读 ${first}—${first + 4}`, blocks(passage.slice(0, firstQuestion)), found.map(record => {
      const optionStart = record.lines.findIndex(line => [...line.matchAll(optionPattern)].length);
      const options = readOptions(record.lines.slice(optionStart), "ABCD");
      if (options.map(o => o.label).join("") !== "ABCD") issues.push(`阅读第${record.number}题选项不完整`);
      return question(record.number, "single_choice", blocks(record.lines.slice(0, optionStart)), options);
    }), { instructions: c.instructions }));
  }
  if (starts.length !== 2) issues.push("仔细阅读两篇文章未完整分区");
  sections.push(makeSection("reading", "Reading Comprehension 阅读", groups));
  const translation = parts.get("translation");
  if (translation?.length) sections.push(makeSection("translation", "Translation 翻译", [makeGroup("translation", "汉译英", [], [openQuestion("翻译", "translation", translation)], { presentation: "writing" })]));
  else issues.push("翻译题面缺失");
  const allQuestions = sections.flatMap(s => s.groups.flatMap(g => g.questions));
  const numbers = allQuestions.filter(q => !["essay", "translation"].includes(q.type)).map(q => q.displayNumber);
  if (new Set(numbers).size !== numbers.length) issues.push("客观题题号重复");
  for (const q of allQuestions) if (q.type !== "essay" && q.type !== "translation" && !q.explanationBlocks.length && !q.answerSpec.referenceAnswer) issues.push(`第${q.displayNumber}题解析未核对`);
  const onlyOpen = allQuestions.length === 2 && allQuestions.every(q => ["essay", "translation"].includes(q.type)) && /写作和翻译|听力(?:和|、)阅读[^\n]*(?:相同|重复)/.test(entry.body);
  const retainedIssues = issues.filter(issue => !/原卷未列出本套听力/.test(issue) && !(onlyOpen && /听力分区缺失|选词填空词库缺失|长篇阅读段落或36—45题不完整|仔细阅读两篇文章未完整分区/.test(issue)));
  return { schemaVersion: 2, id: entry.id, kind: "paper", title: entry.title, year: entry.title.match(/20\d\d/)[0], region: "全国", variant: `第${entry.title.match(/第\s*([123])\s*套/)[1]}套`, submissionMode: "whole-paper", instructions: [...versionNotes, ...(!listeningRecords.length ? [{ type: "notice", tone: "info", text: onlyOpen ? "本卷原资料收录写作和翻译。" : "本卷原资料收录写作、阅读和翻译。" }] : [])], sections: onlyOpen ? sections.filter(s => !s.id.endsWith("-reading")) : sections, assetRefs, sourceRefs: [ref, ...(review.sharedSupplementSourceRefs || [])], quality: { structureStatus: retainedIssues.length ? "review_required" : "approved", structureConfidence: retainedIssues.length ? 0 : 1, issueCount: [...new Set(retainedIssues)].length, issues: [...new Set(retainedIssues)] } };
}
