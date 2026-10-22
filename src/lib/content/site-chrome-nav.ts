export type SiteChromeNavNode = {
  children: SiteChromeNavNode[];
  id: string;
  label: string;
};

export function ensureCoursesAfterExams<T extends SiteChromeNavNode>(items: T[], fallback: T): T[] {
  const courses = items.find((item) => item.id === fallback.id) ?? fallback;
  const rest = items.filter((item) => item.id !== courses.id);
  const examsIndex = rest.findIndex((item) => item.id === "exams");
  const position = examsIndex < 0 ? rest.length : examsIndex + 1;
  return [...rest.slice(0, position), courses, ...rest.slice(position)];
}

export function removeRetiredCet4KnowledgeLinks<T extends SiteChromeNavNode>(items: T[]): T[] {
  const visit = (item: SiteChromeNavNode): SiteChromeNavNode | null => {
    const href = "href" in item && typeof item.href === "string" ? item.href : "";
    let retiredTarget = false;
    try {
      const target = new URL(href, "https://local.invalid");
      retiredTarget = target.pathname === "/cet4" && target.searchParams.get("entry") === "knowledge";
    } catch {}
    if (item.id === "cet4-knowledge" || (retiredTarget && item.label === "知识点")) return null;
    return {
      ...item,
      ...(retiredTarget ? { href: "/cet4?entry=papers" } : {}),
      children: item.children.map(visit).filter((child): child is SiteChromeNavNode => child !== null),
    };
  };
  return items.map(visit).filter((item): item is T => item !== null) as T[];
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

  return items.map((item) => {
    if (item.id !== exams.id) return item;
    const satLabelledChildren = item.children.map((child) =>
      child.id === sat.id ? { ...child, label: sat.label } : child,
    );
    return {
      ...item,
      children: ensureJuniorHighExamLink(satLabelledChildren, sat),
    };
  });
}

export function ensureCompleteExamMenu<T extends SiteChromeNavNode & { enabled: boolean }>(
  items: T[],
  exams: T,
): T[] {
  const existingExams = items.find((item) => item.id === exams.id);

  if (!existingExams) {
    return [...items, { ...exams, enabled: true }];
  }

  return items.map((item) => item.id === exams.id
    ? {
        ...item,
        enabled: true,
        label: exams.label,
        children: exams.children.reduce(
          (children, fallbackChild) => children.some((child) => child.id === fallbackChild.id)
            ? children
            : [...children, fallbackChild],
          item.children,
        ),
      }
    : item);
}

export function ensureNewConceptMenu<T extends SiteChromeNavNode>(
  items: T[],
  newConcept: T,
): T[] {
  const articles = items.find((item) => item.id === "articles");

  if (!articles) {
    return items;
  }

  if (articles.children.some((child) => child.id === newConcept.id)) {
    return items;
  }

  return items.map((item) =>
    item.id === "articles"
      ? { ...item, children: [...item.children, newConcept] }
      : item,
  );
}
