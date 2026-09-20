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

const LANGUAGE_EXAM_KEYS: Record<string, string> = {
  "junior-high-english": "junior-high-english",
  "中考英语": "junior-high-english",
  "senior-high-english": "senior-high-english",
  "高考英语": "senior-high-english",
  cet4: "cet4",
  "cet4-english": "cet4",
  "大学英语四级": "cet4",
  "大学四级": "cet4",
  cet6: "cet6",
  "cet6-english": "cet6",
  "大学英语六级": "cet6",
  "大学六级": "cet6",
  ielts: "ielts",
  雅思: "ielts",
  "sat-reading-writing": "sat-reading-writing",
  SAT: "sat-reading-writing",
};

export function languageExamKey(item: SiteChromeNavNode) {
  return LANGUAGE_EXAM_KEYS[item.id] ?? LANGUAGE_EXAM_KEYS[item.label] ?? item.id;
}

/**
 * Older published navigation records can contain the same exam twice: once
 * as a legacy leaf and once as the newer expandable item. Keep one entry and
 * merge its children so the sidebar remains editable without duplicate rows.
 */
export function dedupeLanguageExamMenu<T extends SiteChromeNavNode>(items: T[]): T[] {
  const exams = items.find((item) => item.id === "exams");
  if (!exams) return items;

  const merged = new Map<string, T>();
  for (const item of exams.children) {
    const key = languageExamKey(item);
    const current = merged.get(key);
    if (!current) {
      merged.set(key, item as T);
      continue;
    }

    const preferIncoming = item.children.length > current.children.length;
    const preferred = preferIncoming ? item : current;
    const fallback = preferIncoming ? current : item;
    const children = [...preferred.children, ...fallback.children].filter(
      (child, index, list) => list.findIndex((candidate) => candidate.id === child.id) === index,
    );
    merged.set(key, { ...preferred, children } as T);
  }

  return items.map((item) =>
    item.id === "exams" ? { ...item, children: [...merged.values()] } : item,
  );
}

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
    const existingCet4 = cleanedChildren.find((item) => languageExamKey(item) === languageExamKey(cet4));

    if (!existingCet4) {
      return [...cleanedChildren, cet4];
    }

    return cleanedChildren.map((item) =>
      languageExamKey(item) === languageExamKey(cet4) ? { ...item, ...cet4, children: item.children } : item,
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
    const existingCet6 = cleanedChildren.find((item) => languageExamKey(item) === languageExamKey(cet6));

    if (!existingCet6) return [...cleanedChildren, cet6];

    return cleanedChildren.map((item) =>
      languageExamKey(item) === languageExamKey(cet6) ? { ...item, ...cet6, children: item.children } : item,
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
