export type SiteChromeNavNode = {
  children: SiteChromeNavNode[];
  id: string;
  label: string;
};

const LANGUAGE_EXAM_ORDER = [
  "junior-high-english",
  "senior-high-english",
  "cet4",
  "cet6",
  "ielts",
  "sat-reading-writing",
];

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
  const ensureSatLink = (children: SiteChromeNavNode[]): SiteChromeNavNode[] => {
    const existingSat = children.find((item) => item.id === sat.id);

    if (!existingSat) return [...children, sat];

    return children.map((item) =>
      item.id === sat.id ? { ...item, ...sat, children: item.children } : item,
    );
  };
  const existingExams = items.find((item) => item.id === exams.id);

  if (!existingExams) {
    return [
      ...items,
      {
        ...exams,
        children: ensureSatLink(exams.children),
      },
    ];
  }

  return items.map((item) =>
    item.id === exams.id
      ? {
          ...item,
          children: ensureSatLink(item.children),
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

export function ensureCet6ExamMenu<T extends SiteChromeNavNode>(
  items: T[],
  exams: T,
  cet6: T,
): T[] {
  const ensureCet6Link = (children: SiteChromeNavNode[]): SiteChromeNavNode[] => {
    const cleanedChildren = children.filter(
      (item) => item.id !== "other-exams" && item.label !== "其他考试正在开发中",
    );
    const existingCet6 = cleanedChildren.find((item) => item.id === cet6.id);

    if (!existingCet6) return [...cleanedChildren, cet6];

    return cleanedChildren.map((item) =>
      item.id === cet6.id ? { ...item, ...cet6, children: item.children } : item,
    );
  };
  const existingExams = items.find((item) => item.id === exams.id);

  if (!existingExams) {
    return [
      ...items,
      {
        ...exams,
        children: ensureCet6Link(exams.children),
      },
    ];
  }

  return items.map((item) =>
    item.id === exams.id
      ? {
          ...item,
          children: ensureCet6Link(item.children),
        }
      : item,
  );
}

export function orderLanguageExamMenu<T extends SiteChromeNavNode>(items: T[]): T[] {
  const order = new Map(LANGUAGE_EXAM_ORDER.map((id, index) => [id, index]));
  const examsIndex = items.findIndex((item) => item.id === "exams");

  if (examsIndex < 0) return items;

  const exams = items[examsIndex];
  const indexedChildren = exams.children.map((child, index) => ({ child, index }));
  indexedChildren.sort((left, right) => {
    const leftRank = order.get(left.child.id) ?? LANGUAGE_EXAM_ORDER.length;
    const rightRank = order.get(right.child.id) ?? LANGUAGE_EXAM_ORDER.length;
    return leftRank - rightRank || left.index - right.index;
  });

  return items.map((item, index) =>
    index === examsIndex
      ? { ...item, children: indexedChildren.map(({ child }) => child) }
      : item,
  );
}
