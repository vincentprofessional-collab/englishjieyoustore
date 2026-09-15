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

export function ensureSeniorHighExamMenu<T extends SiteChromeNavNode>(
  items: T[],
  exams: T,
  seniorHigh: T,
): T[] {
  const existingExams = items.find((item) => item.id === exams.id);

  if (!existingExams) {
    return [
      ...items,
      {
        ...exams,
        children: ensureJuniorHighExamLink(exams.children, seniorHigh),
      },
    ];
  }

  return items.map((item) =>
    item.id === exams.id
      ? {
          ...item,
          label: exams.label,
          children: ensureJuniorHighExamLink(item.children, seniorHigh),
        }
      : item,
  );
}

export function ensureSatExamMenu<T extends SiteChromeNavNode>(
  items: T[],
  exams: T,
  sat: T,
): T[] {
  const existingExams = items.find((item) => item.id === exams.id);

  if (!existingExams) {
    return [
      ...items,
      {
        ...exams,
        children: ensureJuniorHighExamLink(exams.children, sat),
      },
    ];
  }

  return items.map((item) =>
    item.id === exams.id
      ? {
          ...item,
          children: ensureJuniorHighExamLink(item.children, sat),
        }
      : item,
  );
}

export function ensureCet4ExamMenu<T extends SiteChromeNavNode>(
  items: T[],
  exams: T,
  cet4: T,
): T[] {
  const ensureCet4Link = (children: SiteChromeNavNode[]): SiteChromeNavNode[] => {
    const cleanedChildren = children.filter(
      (item) => item.id !== "other-exams" && item.label !== "其他考试正在开发中",
    );
    const existingCet4 = cleanedChildren.find((item) => item.id === cet4.id);

    if (!existingCet4) {
      return [...cleanedChildren, cet4];
    }

    return cleanedChildren.map((item) =>
      item.id === cet4.id ? { ...item, ...cet4, children: item.children } : item,
    );
  };
  const existingExams = items.find((item) => item.id === exams.id);

  if (!existingExams) {
    return [
      ...items,
      {
        ...exams,
        children: ensureCet4Link(exams.children),
      },
    ];
  }

  return items.map((item) =>
    item.id === exams.id
      ? {
          ...item,
          children: ensureCet4Link(item.children),
        }
      : item,
  );
}
