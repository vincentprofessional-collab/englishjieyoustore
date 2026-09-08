import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, "data", "senior-high", "v2", "gold", "paper-2025-beijing.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const knowledgeSection = data.sections.find((section) => section.id === "section-knowledge");
const clozeGroup = knowledgeSection?.groups.find((group) => group.id === "group-1-10-1");
const clozeQuestion = clozeGroup?.questions.find((question) => question.displayNumber === 10);
const grammarGroup = knowledgeSection?.groups.find((group) => group.id === "group-beijing-grammar");
const existingGrammarGroups = knowledgeSection?.groups.filter((group) => /^group-beijing-grammar-[abc]$/.test(group.id)) || [];

if (!clozeQuestion || (!grammarGroup && existingGrammarGroups.length !== 3)) throw new Error("2025 Beijing grammar section was not found");

if (grammarGroup?.stimulusBlocks.some((block) => JSON.stringify(block).match(/【答案】|【解析】|【导语】|题详解/))) {
  grammarGroup.stimulusBlocks = [
    ...grammarGroup.stimulusBlocks.slice(0, 8),
    ...grammarGroup.stimulusBlocks.slice(22, 30),
    ...grammarGroup.stimulusBlocks.slice(47, 55),
  ];
}
clozeQuestion.explanationBlocks = clozeQuestion.explanationBlocks.slice(0, 4);

if (grammarGroup?.stimulusBlocks.length === 24) {
  const grammarQuestions = grammarGroup.questions;
  knowledgeSection.groups = [
    ...knowledgeSection.groups.filter((group) => group.id !== grammarGroup.id),
    {
      id: "group-beijing-grammar-a",
      title: "A",
      presentation: "inline",
      instructions: [],
      stimulusBlocks: grammarGroup.stimulusBlocks.slice(0, 8),
      sharedOptions: [],
      questions: grammarQuestions.slice(0, 3),
    },
    {
      id: "group-beijing-grammar-b",
      title: "B",
      presentation: "inline",
      instructions: [],
      stimulusBlocks: grammarGroup.stimulusBlocks.slice(8, 16),
      sharedOptions: [],
      questions: grammarQuestions.slice(3, 6),
    },
    {
      id: "group-beijing-grammar-c",
      title: "C",
      presentation: "inline",
      instructions: [],
      stimulusBlocks: grammarGroup.stimulusBlocks.slice(16, 24),
      sharedOptions: [],
      questions: grammarQuestions.slice(6, 10),
    },
  ];
}

const currentGrammarGroups = knowledgeSection.groups.filter((group) => /^group-beijing-grammar-[abc]$/.test(group.id));
if (currentGrammarGroups.some((group) => JSON.stringify(group.stimulusBlocks).match(/【答案】|【解析】|【导语】|题详解/))) throw new Error("grammar answers or explanations remain in the question stimulus");
if (JSON.stringify(clozeQuestion.explanationBlocks).match(/第二节|Most days after school/)) throw new Error("section two remains in question 10 explanation");

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify({ file, grammarGroups: currentGrammarGroups.map((group) => ({ id: group.id, stimulusBlocks: group.stimulusBlocks.length, questions: group.questions.map((question) => question.displayNumber) })), question10ExplanationBlocks: clozeQuestion.explanationBlocks.length }));
