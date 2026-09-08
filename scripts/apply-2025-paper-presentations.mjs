import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const files = [
  "paper-2025-beijing.json",
  "paper-2025-new-gaokao-i.json",
  "paper-2025-new-gaokao-ii.json",
  "paper-2025-zhejiang-january.json",
];

for (const filename of files) {
  const file = path.join(root, "data", "senior-high", "v2", "gold", filename);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const section of data.sections) {
    for (const group of section.groups) {
      const hasOptions = group.sharedOptions.length > 0 || group.questions.some((question) => question.options.length > 0 || ["single_choice", "multi_choice", "shared_option_matching"].includes(question.type));
      const hasStimulus = group.stimulusBlocks.length > 0;
      if (section.id === "section-reading" || hasOptions) group.presentation = "reading";
      else if (section.id === "section-writing") group.presentation = hasStimulus ? "reading" : "writing";
      else if (hasStimulus && group.questions.some((question) => ["inline_fill", "multi_blank", "table_fill"].includes(question.type))) group.presentation = "inline";
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(JSON.stringify({ file, presentations: data.sections.flatMap((section) => section.groups.map((group) => ({ id: group.id, presentation: group.presentation }))) }));
}
