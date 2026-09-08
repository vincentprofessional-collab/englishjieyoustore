import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, "data", "senior-high", "v2", "gold", "paper-2025-beijing.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const readingSection = data.sections.find((section) => section.id === "section-reading");
const sevenGroup = readingSection?.groups.find((group) => group.id === "group-beijing-seven");
const q39 = sevenGroup?.questions.find((question) => question.displayNumber === 39);
const writingSection = data.sections.find((section) => section.id === "section-writing");
const writingGroup = writingSection?.groups.find((group) => group.id === "group-beijing-written");

if (!sevenGroup || !q39 || !writingSection || !writingGroup) throw new Error("2025 Beijing writing structure was not found");
const sectionHeadingIndex = q39.explanationBlocks.findIndex((block) => block.type === "paragraph" && block.runs?.some((run) => run.type === "text" && run.text.includes("第三部分 书面表达")));
if (sectionHeadingIndex < 0) throw new Error("embedded writing section was not found in question 39 explanation");

const writingStimulusBlocks = q39.explanationBlocks.slice(sectionHeadingIndex, sectionHeadingIndex + 20);
if (!writingStimulusBlocks.some((block) => JSON.stringify(block).includes("There’s something magical about the way imagination works"))) {
  throw new Error("2025 Beijing writing article was not found");
}

const shortAnswerQuestions = writingGroup.questions.filter((question) => question.displayNumber >= 40 && question.displayNumber <= 43);
const essayQuestion = writingGroup.questions.find((question) => question.displayNumber === 44);
if (shortAnswerQuestions.length !== 4 || !essayQuestion) throw new Error("2025 Beijing writing questions are incomplete");

const referenceAnswers = {
  40: "Seeing that many plastic bottles littered the parks and sidewalks.",
  41: "It helps people explore hidden places like small local parks and gardens in their own cities.",
  42: "错误部分：With encouragement from his friends and parents。理由：朋友们只是笑了一下，甚至 Mark 的父母也认为他应该放弃。",
  43: "First, identify a problem or an idea. Then, experiment bravely, learn relevant skills if needed, and keep trying despite difficulties.",
};

for (const question of shortAnswerQuestions) {
  question.promptBlocks = question.promptBlocks.filter((block) => !(block.type === "paragraph" && block.runs?.every((run) => run.type === "text" && /^\s*_{4,}\s*$/.test(run.text))));
  question.explanationBlocks = [];
  question.answerSpec = {
    availability: "answered",
    gradingMode: "manual",
    kind: "reference",
    referenceAnswer: referenceAnswers[question.displayNumber],
  };
}

const correctionQuestion = shortAnswerQuestions.find((question) => question.displayNumber === 42);
correctionQuestion.promptBlocks = correctionQuestion.promptBlocks.slice(0, 1);
correctionQuestion.correctionStatement = "With encouragement from his friends and parents, Mark built a small bike shelter for his neighbourhood after months of trial and error.";

q39.explanationBlocks = q39.explanationBlocks.slice(0, sectionHeadingIndex);

const knowledgeSection = data.sections.find((section) => section.id === "section-knowledge");
const clozeQuestion = knowledgeSection?.groups.find((group) => group.id === "group-1-10-1")?.questions.find((question) => question.displayNumber === 10);
const grammarGroup = knowledgeSection?.groups.find((group) => group.id === "group-beijing-grammar");
if (!clozeQuestion || !grammarGroup) throw new Error("2025 Beijing grammar section was not found");
clozeQuestion.explanationBlocks = clozeQuestion.explanationBlocks.slice(0, 4);
grammarGroup.stimulusBlocks = [
  ...grammarGroup.stimulusBlocks.slice(0, 8),
  ...grammarGroup.stimulusBlocks.slice(22, 30),
  ...grammarGroup.stimulusBlocks.slice(47, 55),
];
if (JSON.stringify(grammarGroup.stimulusBlocks).match(/【答案】|【解析】|【导语】|题详解/)) {
  throw new Error("grammar answers or explanations remain in the question stimulus");
}

writingSection.groups = [
  {
    id: "group-beijing-short-answer",
    title: "第一节 短文回答",
    instructions: [],
    stimulusBlocks: writingStimulusBlocks,
    sharedOptions: [],
    questions: shortAnswerQuestions,
  },
  {
    id: "group-beijing-essay",
    title: "第二节 写作",
    instructions: [],
    stimulusBlocks: [],
    sharedOptions: [],
    questions: [essayQuestion],
  },
];

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify({ file, writingStimulusBlocks: writingStimulusBlocks.length, shortAnswerQuestions: shortAnswerQuestions.map((question) => question.displayNumber), essayQuestion: essayQuestion.displayNumber }));
