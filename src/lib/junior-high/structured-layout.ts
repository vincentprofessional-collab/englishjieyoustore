import type { JuniorHighBlock, JuniorHighQuestionGroup } from "./paper-types";

export type StructuredRenderableGroup = JuniorHighQuestionGroup & {
  sourceOnly?: boolean;
};

function blocksFor(group: JuniorHighQuestionGroup) {
  return group.displayBlocks ?? group.blocks;
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

export function normalizeStructuredGroups(groups: JuniorHighQuestionGroup[]): StructuredRenderableGroup[] {
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
      if (mergePreviousHeading && previous) {
        renderGroups.push({
          ...group,
          title: previous.title,
          instructions: [...previous.instructions, ...group.instructions],
          blocks: mergeBlocks(previous.blocks, group.blocks),
          displayBlocks: previous.displayBlocks || group.displayBlocks
            ? mergeBlocks(blocksFor(previous), blocksFor(group))
            : undefined,
        });
      } else {
        renderGroups.push(group);
      }
      continue;
    }

    const groupBlocks = blocksFor(group);
    const isStandaloneSource = groupBlocks.length > 0 && (!next || next.questionIds.length === 0 || isSectionHeading(next.title));
    if (isStandaloneSource && !isWritingHeading(group.title)) {
      renderGroups.push({ ...group, sourceOnly: true });
    }
  }

  return renderGroups;
}

export { isSectionHeading };
