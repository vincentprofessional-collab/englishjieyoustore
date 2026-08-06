export type SiteChromeNavNode = {
  children: SiteChromeNavNode[];
  id: string;
  label: string;
};

export function ensureJuniorHighExamLink<T extends SiteChromeNavNode>(items: T[], juniorHigh: T): T[] {
  return items.some((item) => item.id === juniorHigh.id) ? items : [...items, juniorHigh];
}

export function ensureJuniorHighExamMenu<T extends SiteChromeNavNode>(
  items: T[],
  exams: T,
  juniorHigh: T,
): T[] {
  const existingExams = items.find((item) => item.id === exams.id);

  if (!existingExams) {
    return [
      ...items,
      {
        ...exams,
        children: ensureJuniorHighExamLink(exams.children, juniorHigh),
      },
    ];
  }

  return items.map((item) =>
    item.id === exams.id
      ? {
          ...item,
          label: exams.label,
          children: ensureJuniorHighExamLink(item.children, juniorHigh),
        }
      : item,
  );
}
