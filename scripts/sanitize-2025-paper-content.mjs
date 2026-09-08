import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const files = [
  "paper-2024-beijing.json",
  "paper-2024-new-gaokao-i.json",
  "paper-2024-new-gaokao-ii.json",
  "paper-2024-national-eaf467d6a8f1.json",
  "paper-2024-tianjin-27a290d25555.json",
  "paper-2024-zhejiang-bb3fb00e8526.json",
  "paper-2025-beijing.json",
  "paper-2025-new-gaokao-i.json",
  "paper-2025-new-gaokao-ii.json",
  "paper-2025-zhejiang-january.json",
];

function blockText(block) {
  if (block.type === "paragraph" || block.type === "richText") return block.runs.map((run) => run.type === "text" ? run.text : "").join("").trim();
  return block.type === "heading" || block.type === "notice" ? block.text.trim() : "";
}

function blocksText(blocks) {
  return (blocks || []).map(blockText).join(" ").trim();
}

function isExplanationArticleBoundary(text) {
  return /^[A-D]$/.test(text) || /^第二节[（(]/.test(text) || /^第三部分/.test(text) || /^第[一二三四]部分/.test(text);
}

function isGrammarInstruction(text) {
  return text.includes("阅读下列短文") || text.includes("根据短文内容填空") || text.includes("未给提示词") || text.includes("请在答题卡指定区域作答");
}

function isWritingFormatInstruction(text) {
  return /请按如下格式在答题(?:卡|纸)/.test(text);
}

function paragraph(text) {
  return { type: "paragraph", runs: [{ type: "text", text }] };
}

const BEIJING_2024_SHORT_ARTICLE = [
  "Growing up, I idealised independence. I always wanted my own efforts to be enough. When I decided to pursue a postgraduate degree, I wanted to develop a novel research programme and quickly establish myself as an independent scientist. But I was unrealistically optimistic about what I could achieve.",
  "As I began designing experiments, my committee members warned me about the challenges I would face. But my need for independence drove me to push forward with my research plan. As a result, the first four years of my postgraduate career were defined by a series of failures.",
  "During my second year, I failed my comprehensive exam because my proposal was unclear. During my third year, I discovered that after treating thousands of seeds, I obtained just one plant I could use for experiments. By my fourth year, my desperation to succeed overshadowed my desire for independence.",
  "My adviser and I devised (想出) a somewhat unusual solution: I would spend three months in a collaborating (合作的) lab to obtain specialised training. I worked extensively with other students, constantly asked questions, and helped with ongoing projects to learn everything I could. Finally, I conducted an elegant experiment that would not have been possible without the help of the members in the lab.",
  "My adviser saw this experience as a groundbreaking success, emphasising the collaborating skills I acquired. A few months later, when I repeated the experiment in my home lab, I produced more publishable data. By learning when to ask for help, I eventually found myself on the way to becoming an independent scientist.",
].map(paragraph);

const BEIJING_2024_SHORT_ANSWERS = {
  40: "The need to be recognized as an independent scientist.",
  41: "The author would spend three months in a collaborating lab to obtain specialised training.",
  42: "The adviser considered the author’s experience in the lab a groundbreaking success because publishable data had been produced. It is because the author had acquired collaborating skills by working with others there that the adviser considered the author’s experience in the lab a groundbreaking success.",
  43: "Success in becoming an independent scientist was ultimately achieved through collaboration, adaptive learning, and resilience in the face of setbacks. True independence involves recognizing the value of collaboration and learning when to ask for help.",
};

function manualReferenceAnswer(referenceAnswer) {
  return {
    availability: "answered",
    gradingMode: "manual",
    kind: "reference",
    referenceAnswer,
  };
}

function audioBlock(assetId) {
  return { type: "audio", assetId, label: "听力音频" };
}

function audioAsset(assetId, relativePath) {
  return {
    assetId: `asset-${assetId}`,
    kind: "audio",
    url: `/senior-high/assets/${assetId}.mp3`,
    mimeType: "audio/mpeg",
    sha256: assetId,
    sourceRefs: [{
      sourceDocumentId: assetId,
      relativePath,
      sha256: assetId,
      locator: {},
      extractionMethod: "media-manifest",
      confidence: 0.9,
    }],
  };
}

function choiceAnswer(answer) {
  return {
    availability: "answered",
    gradingMode: "auto",
    kind: "choice",
    acceptedAnswers: [answer],
    normalization: { unicodeNfkc: true, trim: true, collapseSpaces: true, caseSensitive: false },
  };
}

function normalizeLegacyPaper(data) {
  const sourceSection = data.sections[0];
  const sourceGroup = sourceSection?.groups[0];
  if (!sourceSection || !sourceGroup || sourceGroup.id !== "group-legacy") return;

  const answerMaps = {
    "paper-2024-national-eaf467d6a8f1": ["A", "C", "B", "C", "A", "B", "B", "C", "A", "B", "A", "B", "A", "B", "C", "A", "C", "B", "C", "A"],
    "paper-2024-zhejiang-bb3fb00e8526": ["A", "C", "A", "C", "B", "A", "C", "B", "B", "C", "A", "A", "B", "B", "C", "A", "B", "C", "C", "B"],
  };
  const mappedAnswers = answerMaps[data.id] || [];
  for (const question of sourceGroup.questions) {
    const sourceNumber = Number(question.sourceQuestionNumber);
    if (mappedAnswers[sourceNumber - 1]) question.answerSpec = choiceAnswer(mappedAnswers[sourceNumber - 1]);
    question.explanationBlocks = [];
  }

  const usableQuestions = sourceGroup.questions.filter((question) => {
    const prompt = blocksText(question.promptBlocks);
    return prompt.length > 0 && question.answerSpec?.availability === "answered";
  });
  usableQuestions.forEach((question, index) => {
    question.displayNumber = index + 1;
    question.id = `q-${index + 1}`;
  });

  const audioInfo = {
    "paper-2024-national-eaf467d6a8f1": {
      assetId: "c04098edcaa54dc8cb4f4da6ea17379902d3d234d590084289aa952f1cfcd736",
      relativePath: "历年真题/【未上传】2024年高考英语试卷（全国甲卷）听力音频.mp3",
      count: 20,
    },
    "paper-2024-zhejiang-bb3fb00e8526": {
      assetId: "384e72b0cd719649da3ff6c563a9f4ba1783da5db36b0fd53286aeebe509af60",
      relativePath: "历年真题/【未上传】2024年高考英语试卷（浙江）（1月）听力音频.mp3",
      count: 16,
    },
  }[data.id];
  if (audioInfo) {
    const asset = audioAsset(audioInfo.assetId, audioInfo.relativePath);
    data.assetRefs = [...(data.assetRefs || []).filter((item) => item.assetId !== asset.assetId), asset];
    const listeningQuestions = usableQuestions.slice(0, audioInfo.count);
    const remainingQuestions = usableQuestions.slice(audioInfo.count);
    const listeningGroup = {
      ...sourceGroup,
      id: "group-legacy-listening",
      title: "听力选择题",
      instructions: [],
      stimulusBlocks: [audioBlock(asset.assetId)],
      questions: listeningQuestions,
      presentation: "reading",
    };
    const groups = [listeningGroup];
    if (remainingQuestions.length > 0) groups.push({
      ...sourceGroup,
      id: "group-legacy-questions",
      title: "其他选择题",
      instructions: [],
      stimulusBlocks: [],
      questions: remainingQuestions,
      presentation: undefined,
    });
    data.sections = [{
      ...sourceSection,
      id: "section-listening",
      title: "第一部分 听力及可做题目",
      instructions: [paragraph("请先播放听力音频，再完成下方选择题。")],
      groups,
    }];
  } else {
    data.sections = [{
      ...sourceSection,
      title: "可做题目",
      instructions: [],
      groups: [{
        ...sourceGroup,
        id: "group-legacy-questions",
        title: "选择题",
        instructions: [],
        stimulusBlocks: [],
        questions: usableQuestions,
        presentation: undefined,
      }],
    }];
  }
  data.instructions = [];
  data.quality = { structureStatus: "approved", structureConfidence: 0.82, issueCount: 0, issues: [] };
}

function setGroupPresentations(data) {
  for (const section of data.sections) {
    for (const group of section.groups) {
      if (group.presentation) continue;
      const questionTypes = group.questions.map((question) => question.type);
      if (questionTypes.includes("essay")) group.presentation = "writing";
      else if (group.stimulusBlocks.length > 0 && group.questions.length > 0) group.presentation = "reading";
      else if (questionTypes.some((type) => ["inline_fill", "multi_blank", "table_fill"].includes(type))) group.presentation = "inline";
    }
    for (const group of section.groups) {
      const inlineOnly = group.questions.length > 0
        && group.sharedOptions.length === 0
        && group.questions.every((question) => ["inline_fill", "multi_blank", "table_fill"].includes(question.type) && question.promptBlocks.length === 0 && question.options.length === 0);
      if (inlineOnly) group.presentation = "inline";
    }
  }
}

function setInstruction(group, text) {
  if (group) group.instructions = [paragraph(text)];
}

function removeStimulus(group, pattern) {
  if (!group) return 0;
  const before = group.stimulusBlocks.length;
  group.stimulusBlocks = group.stimulusBlocks.filter((block) => !pattern.test(blockText(block)));
  return before - group.stimulusBlocks.length;
}

function convertNumberedClozeBlanks(group) {
  if (!group) return 0;
  const questions = group.questions.filter((question) => question.type === "single_choice");
  let questionIndex = 0;
  let converted = 0;
  const pattern = /_+\s*\d{1,3}\s*_+/g;

  group.stimulusBlocks = group.stimulusBlocks.map((block) => {
    if (block.type !== "paragraph" && block.type !== "richText") return block;
    const runs = block.runs.flatMap((run) => {
      if (run.type !== "text" || !pattern.test(run.text)) {
        pattern.lastIndex = 0;
        return [run];
      }
      pattern.lastIndex = 0;
      const output = [];
      let cursor = 0;
      for (const match of run.text.matchAll(pattern)) {
        const question = questions[questionIndex++];
        if (!question) throw new Error(`${group.id}: more article blanks than questions`);
        const blankId = `${question.id}-article-blank`;
        if (match.index > cursor) output.push({ ...run, text: run.text.slice(cursor, match.index) });
        output.push({ type: "blank", blankId });
        question.blanks = [{ blankId, answerShape: "word" }];
        question.placement = { kind: "inline", blankIds: [blankId] };
        cursor = match.index + match[0].length;
        converted += 1;
      }
      if (cursor < run.text.length) output.push({ ...run, text: run.text.slice(cursor) });
      return output;
    });
    return { ...block, runs };
  });

  if (converted > 0 && converted !== questions.length) throw new Error(`${group.id}: converted ${converted}/${questions.length} article blanks`);
  return converted;
}

function normalizeWritingGroups(section) {
  if (!section) return;
  const combinedIndex = section.groups.findIndex((group) => group.id === "group-writing");
  if (combinedIndex >= 0) {
    const combined = section.groups[combinedIndex];
    const [application, continuation] = combined.questions;
    if (application && continuation) {
      section.groups.splice(combinedIndex, 1,
        { ...combined, id: "group-writing-application", title: "第一节 应用文写作", questions: [application] },
        { ...combined, id: "group-writing-continuation", title: "第二节 读后续写", questions: [continuation] },
      );
    }
  }
  const application = section.groups.find((group) => group.id === "group-writing-application");
  const continuation = section.groups.find((group) => group.id === "group-writing-continuation");
  if (application) application.title = "第一节 应用文写作";
  if (continuation) continuation.title = "第二节 读后续写";
}

function normalizeBeijingWriting(section, data) {
  if (!section) return;
  const combinedIndex = section.groups.findIndex((group) => group.id === "group-beijing-written");
  if (combinedIndex >= 0) {
    const combined = section.groups[combinedIndex];
    const shortArticle = combined.stimulusBlocks?.length > 0
      ? combined.stimulusBlocks
      : data?.id === "paper-2024-beijing" ? BEIJING_2024_SHORT_ARTICLE : [];
    const shortAnswer = combined.questions.filter((question) => question.type !== "essay");
    const essay = combined.questions.find((question) => question.type === "essay");
    const groups = [];
    if (shortAnswer.length > 0) groups.push({ ...combined, id: "group-beijing-short-answer", title: "第一节 短文回答", questions: shortAnswer, stimulusBlocks: shortArticle });
    if (essay) groups.push({ ...combined, id: "group-beijing-essay", title: "第二节 写作", questions: [essay], stimulusBlocks: [] });
    if (groups.length > 0) section.groups.splice(combinedIndex, 1, ...groups);
  }
  const shortAnswer = section.groups.find((group) => group.id === "group-beijing-short-answer");
  const essay = section.groups.find((group) => group.id === "group-beijing-essay");
  if (shortAnswer) {
    setInstruction(shortAnswer, "阅读下面短文，根据题目要求用英文回答问题。");
    if (data?.id === "paper-2024-beijing" && shortAnswer.stimulusBlocks.length === 0) shortAnswer.stimulusBlocks = BEIJING_2024_SHORT_ARTICLE;
    if (data?.id === "paper-2024-beijing") {
      for (const question of shortAnswer.questions) {
        const referenceAnswer = BEIJING_2024_SHORT_ANSWERS[question.sourceQuestionNumber];
        if (referenceAnswer && question.answerSpec?.availability !== "answered") question.answerSpec = manualReferenceAnswer(referenceAnswer);
      }
    }
  }
  if (essay) essay.title = "第二节 写作";
}

function splitBeijingGrammar(section) {
  if (!section) return;
  const sourceIndex = section.groups.findIndex((group) => group.id === "group-beijing-grammar");
  if (sourceIndex < 0) return;
  const source = section.groups[sourceIndex];
  const text = (block) => blockText(block);
  const labels = source.stimulusBlocks.map(text).reduce((found, value, index) => {
    if (/^[A-C]$/.test(value)) found.push({ label: value, index });
    return found;
  }, []);
  if (labels.length < 2) return;
  const groups = labels.map(({ label, index }, labelIndex) => {
    const nextIndex = labels[labelIndex + 1]?.index ?? source.stimulusBlocks.length;
    const questionNumbers = source.questions.map((question) => question.displayNumber).filter((number) => {
      const nextStart = labels[labelIndex + 1]?.label === "B" ? 15 : labels[labelIndex + 1]?.label === "C" ? 18 : Number.POSITIVE_INFINITY;
      const start = label === "A" ? 11 : label === "B" ? 15 : 18;
      return number >= start && number < nextStart;
    });
    const questions = source.questions.filter((question) => questionNumbers.includes(question.displayNumber));
    const rawArticleBlocks = source.stimulusBlocks.slice(index + 1, nextIndex);
    const answerStart = rawArticleBlocks.findIndex((block) => /^【(?:答案|解析|导语)|^【\d+题详解】/.test(text(block)));
    const articleBlocks = rawArticleBlocks.slice(0, answerStart >= 0 ? answerStart : rawArticleBlocks.length).filter((block) => {
      const value = text(block);
      return value && !/^【(?:答案|解析|导语)/.test(value) && !/^【\d+题详解】/.test(value) && !isGrammarInstruction(value);
    });
    return {
      ...source,
      id: `group-beijing-grammar-${label.toLowerCase()}`,
      title: `第二节 语法填空 · ${label}`,
      instructions: label === "A" ? [paragraph("阅读下列短文，在空白处填入 1 个恰当的单词或括号内所给词的正确形式。" )] : [],
      stimulusBlocks: articleBlocks,
      questions,
    };
  });
  section.groups.splice(sourceIndex, 1, ...groups);
}

function normalizeListeningInstructions(data) {
  const section = data.sections.find((item) => item.id === "section-listening");
  if (!section) return;
  const listening = [];
  const remaining = [];
  for (const block of data.instructions) {
    const text = blockText(block);
    if (/^第一部分\s*听力|^第一节\s*[（(]|^听下面\d*段|^做题时，先将答案标在试卷上|^注意事项[:：]\s*英语听力|^例[:：]/.test(text)) listening.push(block);
    else remaining.push(block);
  }
  data.instructions = remaining;
  const useful = listening.filter((block) => !/^第一部分\s*听力/.test(blockText(block)));
  section.instructions = useful.length > 0 ? useful : [paragraph("听力共两节，请根据录音内容完成选择题。")];
}

function normalizePaperStructure(data) {
  let removed = 0;
  let convertedClozeBlanks = 0;
  const bySection = (id) => data.sections.find((section) => section.id === id);
  const byGroup = (section, id) => section?.groups.find((group) => group.id === id);
  const knowledge = bySection("section-knowledge");
  const reading = bySection("section-reading");
  const language = bySection("section-language");
  const writing = bySection("section-writing");

  if (data.id.startsWith("paper-2024-") && ["paper-2024-national-eaf467d6a8f1", "paper-2024-tianjin-27a290d25555", "paper-2024-zhejiang-bb3fb00e8526"].includes(data.id)) {
    normalizeLegacyPaper(data);
  } else if (data.id === "paper-2024-beijing" || data.id === "paper-2025-beijing") {
    if (data.id === "paper-2024-beijing") {
      const firstSection = data.instructions.findIndex((block) => /^第一部分/.test(blockText(block)));
      data.instructions = (firstSection >= 0 ? data.instructions.slice(0, firstSection) : data.instructions)
        .filter((block) => { const text = blockText(block); return text && text !== data.title && text !== "英语"; });
    }
    const cloze = byGroup(knowledge, "group-1-10-1");
    if (cloze) cloze.title = "第一节 完形填空";
    setInstruction(cloze, "阅读下面短文，掌握其大意，从每题所给的 A、B、C、D 四个选项中选出最佳选项。");
    removed += removeStimulus(cloze, /^阅读下面短文[，,].*A.*B.*C.*D.*选项/);
    convertedClozeBlanks += convertNumberedClozeBlanks(cloze);

    splitBeijingGrammar(knowledge);
    for (const grammar of knowledge?.groups.filter((group) => /^group-beijing-grammar-[abc]$/.test(group.id)) || []) {
      removed += removeStimulus(grammar, /^(?:第二节[（(]|阅读下列短文|处用括号内所给词|^A$|^B$|^C$)/);
    }

    normalizeBeijingWriting(writing, data);
    const shortAnswer = byGroup(writing, "group-beijing-short-answer");
    removed += removeStimulus(shortAnswer, /^(?:第三部分\s*书面表达|第一节[（(]共\s*4\s*小题|阅读下面短文[，,]\s*根据题目要求用英文回答问题)/);
  } else {
    const cloze = language?.groups[0];
    if (cloze) cloze.title = "第一节 完形填空";
    setInstruction(cloze, "阅读下面短文，从每题所给的 A、B、C、D 四个选项中选出最佳选项。");
    removed += removeStimulus(cloze, /^阅读下面短文[，,].*A.*B.*C.*D.*选项/);
    convertedClozeBlanks += convertNumberedClozeBlanks(cloze);

    const grammar = byGroup(language, "group-grammar-fill");
    if (grammar) grammar.title = "第二节 语法填空";
    setInstruction(grammar, "阅读下面短文，在空白处填入 1 个适当的单词或括号内单词的正确形式。");
    normalizeWritingGroups(writing);
    normalizeListeningInstructions(data);
  }

  if (reading) {
    const articleGroups = reading.groups.filter((group) => group.id !== "group-seven-choice" && group.id !== "group-beijing-seven");
    articleGroups.forEach((group, index) => { group.title = index === 0 ? "第一节 · A" : String.fromCharCode(65 + index); });
    setInstruction(articleGroups[0], "阅读下列短文，从每题所给的 A、B、C、D 四个选项中选出最佳选项。");
    for (const group of articleGroups.slice(1)) group.instructions = [];

    const seven = reading.groups.find((group) => group.id === "group-seven-choice" || group.id === "group-beijing-seven");
    if (seven) seven.title = "第二节 七选五";
    setInstruction(seven, "阅读下面短文，从七个选项中选出能填入空白处的最佳选项。选项中有两项为多余选项。");
    removed += removeStimulus(seven, /^(?:第二节[（(]|阅读下面短文[，,].*选项|根据短文内容[，,].*七个选项|黑。选项中有两项为多余选项)/);
  }

  setGroupPresentations(data);

  return { convertedClozeBlanks, removed };
}

for (const filename of files) {
  const file = path.join(root, "data", "senior-high", "v2", "gold", filename);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  let explanationCuts = 0;
  let removedLeadingLabels = 0;
  let removedRepeatedInstructions = 0;
  let convertedClozeBlanks = 0;

  let seenWritingFormatInstruction = false;

  for (const section of data.sections) {
    for (const group of section.groups) {
      const leadingLabelIndex = group.title && /^[A-D]$/.test(group.title)
        ? group.stimulusBlocks.slice(0, 3).findIndex((block) => blockText(block) === group.title)
        : -1;
      if (leadingLabelIndex >= 0) {
        group.stimulusBlocks = group.stimulusBlocks.filter((_, index) => index !== leadingLabelIndex);
        removedLeadingLabels += 1;
      }
      if (/^group-beijing-grammar-[bc]$/.test(group.id)) {
        const before = group.stimulusBlocks.length;
        group.stimulusBlocks = group.stimulusBlocks.filter((block) => !isGrammarInstruction(blockText(block)));
        removedRepeatedInstructions += before - group.stimulusBlocks.length;
      }
      for (const question of group.questions) {
        if (section.id === "section-writing" && question.type === "essay") {
          const promptBlocks = [];
          for (const block of question.promptBlocks) {
            const text = blockText(block);
            if (isWritingFormatInstruction(text)) {
              if (seenWritingFormatInstruction) {
                removedRepeatedInstructions += 1;
                continue;
              }
              seenWritingFormatInstruction = true;
            }
            promptBlocks.push(block);
          }
          question.promptBlocks = promptBlocks;
        }
        const boundary = question.explanationBlocks.findIndex((block, index) => index > 0 && isExplanationArticleBoundary(blockText(block)));
        if (boundary >= 0) {
          question.explanationBlocks = question.explanationBlocks.slice(0, boundary);
          explanationCuts += 1;
        }
      }
    }
  }

  const normalized = normalizePaperStructure(data);
  removedRepeatedInstructions += normalized.removed;
  convertedClozeBlanks += normalized.convertedClozeBlanks;

  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(JSON.stringify({ file, explanationCuts, removedLeadingLabels, removedRepeatedInstructions, convertedClozeBlanks }));
}
