import type { JuniorHighBlock, JuniorHighQuestion, JuniorHighQuestionGroup } from "./paper-types";

export type StructuredRenderableGroup = JuniorHighQuestionGroup & {
  sourceOnly?: boolean;
};

function blocksFor(group: JuniorHighQuestionGroup) {
  return group.displayBlocks?.length ? group.displayBlocks : group.blocks;
}

function mergeBlocks(left: JuniorHighBlock[], right: JuniorHighBlock[]) {
  const seen = new Set<string>();
  return [...left, ...right].filter((block) => {
    if (seen.has(block.id)) return false;
    seen.add(block.id);
    return true;
  });
}

function isSectionHeading(title: string) {
  const value = title.trim();
  return /^(?:[一二三四五六七八九十百]+[、．.\s]|[IVX]+[、．.\s]|第[一二三四五六七八九十百\d]+(?:部分|节)|Part\s*\d+|\d+[、．.]|[A-H][.)、]\s*)/.test(value);
}

function isWritingHeading(title: string) {
  return /书面表达|写作|作文/.test(title);
}

export function isExamInstructionTitle(title: string) {
  return /考生注意|注意事项|在你答题前/.test(title.trim());
}

function isPassageLabelText(text: string) {
  return /^[A-GＡ-Ｇ]$/.test(text.trim());
}

function splitPassageGroup(group: JuniorHighQuestionGroup, questionsById?: ReadonlyMap<string, Pick<JuniorHighQuestion, "sourceBlockIds">>) {
  const displayBlocks = blocksFor(group);
  const labelIndexes = displayBlocks
    .map((block, index) => ({ block, index, label: (block.text ?? "").trim() }))
    .filter(({ block, label }) => block.kind === "paragraph" && isPassageLabelText(label));

  if (labelIndexes.length < 2 || group.questionIds.length < labelIndexes.length || !questionsById) return [group];

  const sourceBlocks = group.blocks?.length ? group.blocks : displayBlocks;
  const sourceBlockIndex = new Map(sourceBlocks.map((block, index) => [block.id, index]));
  const sourceLabelIndexes = sourceBlocks
    .map((block, index) => ({ index, label: (block.text ?? "").trim() }))
    .filter(({ label }) => isPassageLabelText(label));
  if (sourceLabelIndexes.length < 2) return [group];

  const splitGroups = labelIndexes.map((labelEntry, labelIndex) => {
    const nextLabel = labelIndexes[labelIndex + 1];
    const sourceLabelIndex = sourceLabelIndexes.findIndex((entry) => entry.label === labelEntry.label);
    const sourceLabel = sourceLabelIndex >= 0 ? sourceLabelIndexes[sourceLabelIndex] : undefined;
    const nextSourceLabel = sourceLabelIndex >= 0 ? sourceLabelIndexes[sourceLabelIndex + 1] : undefined;
    const sourceStart = sourceLabel?.index ?? 0;
    const sourceEnd = nextSourceLabel?.index ?? sourceBlocks.length;
    const displayEnd = nextLabel?.index ?? displayBlocks.length;
    const questionIds = group.questionIds.filter((questionId) => {
      const question = questionsById.get(questionId);
      const sourceIndexes = (question?.sourceBlockIds ?? [])
        .map((sourceId) => sourceBlockIndex.get(sourceId))
        .filter((index): index is number => typeof index === "number");
      const questionIndex = sourceIndexes.length ? Math.min(...sourceIndexes) : undefined;
      return typeof questionIndex === "number" && questionIndex >= sourceStart && questionIndex < sourceEnd;
    });

    return {
      ...group,
      id: `${group.id}-${labelEntry.label.toLowerCase()}`,
      marker: labelEntry.label,
      title: labelEntry.label,
      blocks: sourceBlocks.slice(sourceStart, sourceEnd),
      displayBlocks: displayBlocks.slice(labelEntry.index, displayEnd),
      questionIds,
    };
  }).filter((candidate) => candidate.questionIds.length > 0);

  return splitGroups.length >= 2 ? splitGroups : [group];
}

export function normalizeStructuredGroups(groups: JuniorHighQuestionGroup[], questionsById?: ReadonlyMap<string, Pick<JuniorHighQuestion, "sourceBlockIds">>): StructuredRenderableGroup[] {
  const renderGroups: StructuredRenderableGroup[] = [];

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const next = groups[index + 1];

    if (group.questionIds.length > 0) {
      const previous = groups[index - 1];
      const mergePreviousHeading = Boolean(
        previous &&
        previous.questionIds.length === 0 &&
        isSectionHeading(previous.title) &&
        !isSectionHeading(group.title),
      );
      const mergePreviousSource = Boolean(
        previous &&
        previous.questionIds.length === 0 &&
        blocksFor(previous).length > 0 &&
        !isSectionHeading(previous.title) &&
        previous.groupType !== "writing" &&
        !isWritingHeading(previous.title) &&
        !isSectionHeading(group.title),
      );
      if (mergePreviousHeading && previous) {
        renderGroups.push(...splitPassageGroup({
          ...group,
          title: previous.title,
          instructions: [...previous.instructions, ...group.instructions],
          blocks: mergeBlocks(previous.blocks, group.blocks),
          displayBlocks: previous.displayBlocks || group.displayBlocks
            ? mergeBlocks(blocksFor(previous), blocksFor(group))
            : undefined,
        }, questionsById));
      } else if (mergePreviousSource && previous) {
        renderGroups.push(...splitPassageGroup({
          ...group,
          instructions: [...previous.instructions, ...group.instructions],
          blocks: mergeBlocks(previous.blocks, group.blocks),
          displayBlocks: mergeBlocks(blocksFor(previous), blocksFor(group)),
        }, questionsById));
      } else {
        renderGroups.push(...splitPassageGroup(group, questionsById));
      }
      continue;
    }

    const groupBlocks = blocksFor(group);
    const isStandaloneSource = groupBlocks.length > 0 && (!next || next.questionIds.length === 0 || isSectionHeading(next.title));
    if (isStandaloneSource && group.groupType !== "writing" && !isWritingHeading(group.title)) {
      renderGroups.push({ ...group, sourceOnly: true });
    }
  }

  return renderGroups;
}

export { isSectionHeading };
