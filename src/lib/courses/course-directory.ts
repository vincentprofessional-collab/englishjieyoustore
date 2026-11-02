export const COURSE_DIRECTORY_SLUG = "course-directory";

export type CoursePageNode = {
  children: CoursePageNode[];
  content: string;
  id: string;
  label: string;
  slug: string;
  summary: string;
};

export type CourseHomepage = {
  content: string;
  summary: string;
  title: string;
};

export type CourseDirectory = {
  groups: CoursePageNode[];
  homepage: CourseHomepage;
  version: 1;
};

function courseNode(id: string, slug: string, label: string, children: CoursePageNode[] = [], summary = ""): CoursePageNode {
  return { children, content: "", id, label, slug, summary };
}

export const DEFAULT_COURSE_DIRECTORY: CourseDirectory = {
  homepage: {
    content: "",
    summary: "暂无内容，稍晚会有演示课及课程介绍等内容。",
    title: "英语课程",
  },
  groups: [
    courseNode("exam-courses", "exam-courses", "应试课程", [
      courseNode("senior-high", "senior-high", "高中"),
      courseNode("cet4", "cet4", "四级"),
      courseNode("cet6", "cet6", "六级"),
      courseNode("postgraduate", "postgraduate", "考研"),
      courseNode("toefl", "toefl", "托福"),
      courseNode("ielts", "ielts", "雅思"),
      courseNode("sat", "sat", "SAT"),
    ], "高中、四六级、考研、托福、雅思与 SAT 课程。"),
    courseNode("single-courses", "single-courses", "单项课程", [
      courseNode("vocabulary-course", "vocabulary", "词汇课程"),
      courseNode("long-sentences", "long-sentences", "长难句课程"),
      courseNode("reading-boost", "reading-boost", "阅读强化提升"),
      courseNode("listening-boost", "listening-boost", "听力强化提升"),
      courseNode("speaking-boost", "speaking-boost", "口语强化提升"),
      courseNode("writing-boost", "writing-boost", "写作强化提升"),
      courseNode("integrated-english-boost", "integrated-english-boost", "综合英语强化提升"),
    ], "围绕词汇、长难句与听说读写能力提升。"),
  ],
  version: 1,
};

const MAX_NODES = 200;
const MAX_DEPTH = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parseCourseDirectory(value: unknown): CourseDirectory | null {
  const source = isRecord(value) ? value : null;
  const rawGroups = Array.isArray(source?.groups) ? source.groups : null;
  if (!rawGroups) return null;

  const ids = new Set<string>();
  let nodeCount = 0;

  function parseNodes(rows: unknown[], depth: number): CoursePageNode[] | null {
    if (depth > MAX_DEPTH || rows.length > MAX_NODES - nodeCount) return null;
    const slugs = new Set<string>();
    const nodes: CoursePageNode[] = [];

    for (const row of rows) {
      if (!isRecord(row)) return null;
      const id = typeof row.id === "string" ? row.id.trim() : "";
      const slug = typeof row.slug === "string" ? row.slug.trim().toLowerCase() : "";
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const summary = typeof row.summary === "string" ? row.summary.trim() : "";
      const content = typeof row.content === "string" ? row.content : "";
      const rawChildren = Array.isArray(row.children) ? row.children : [];

      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || ids.has(id)) return null;
      if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug) || slugs.has(slug)) return null;
      if (!label || label.length > 80 || summary.length > 500 || content.length > 12000) return null;
      ids.add(id);
      slugs.add(slug);
      nodeCount += 1;
      if (nodeCount > MAX_NODES) return null;

      const children = parseNodes(rawChildren, depth + 1);
      if (!children) return null;
      nodes.push({ children, content, id, label, slug, summary });
    }

    return nodes;
  }

  const groups = parseNodes(rawGroups, 0);
  if (!groups) return null;

  const rawHomepage = isRecord(source?.homepage) ? source.homepage : {};
  const homepageTitle = typeof rawHomepage.title === "string" ? rawHomepage.title.trim() : DEFAULT_COURSE_DIRECTORY.homepage.title;
  const homepageSummary = typeof rawHomepage.summary === "string" ? rawHomepage.summary.trim() : DEFAULT_COURSE_DIRECTORY.homepage.summary;
  const homepageContent = typeof rawHomepage.content === "string" ? rawHomepage.content : "";
  if (!homepageTitle || homepageTitle.length > 80 || homepageSummary.length > 500 || homepageContent.length > 12000) return null;

  return {
    groups,
    homepage: { content: homepageContent, summary: homepageSummary, title: homepageTitle },
    version: 1,
  };
}

export function normalizeCourseDirectory(value: unknown): CourseDirectory {
  const source = isRecord(value) && isRecord(value.meta_json) ? value.meta_json : value;
  return parseCourseDirectory(source) ?? DEFAULT_COURSE_DIRECTORY;
}

export function coursePageHref(slugs: string[]) {
  return `/courses/${slugs.map(encodeURIComponent).join("/")}`;
}

export function findCoursePage(directory: CourseDirectory, route: string[]) {
  let nodes = directory.groups;
  const trail: CoursePageNode[] = [];

  for (const slug of route) {
    const match = nodes.find((node) => node.slug === slug);
    if (!match) return null;
    trail.push(match);
    nodes = match.children;
  }

  const node = trail.at(-1);
  return node ? { node, trail, children: node.children, href: coursePageHref(route) } : null;
}

export function coursePagePlacementOptions(directory: CourseDirectory) {
  const options: { label: string; path: string }[] = [];

  function visit(nodes: CoursePageNode[], slugs: string[], labels: string[]) {
    for (const node of nodes) {
      const nextSlugs = [...slugs, node.slug];
      const nextLabels = [...labels, node.label];
      options.push({ label: `英语课程 / ${nextLabels.join(" / ")}`, path: coursePageHref(nextSlugs) });
      visit(node.children, nextSlugs, nextLabels);
    }
  }

  visit(directory.groups, [], []);
  return options;
}

export function createCoursePageNode(label = "新课程页面"): CoursePageNode {
  const id = globalThis.crypto?.randomUUID?.() ?? `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    children: [],
    content: "",
    id,
    label,
    slug: `page-${id.replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase()}`,
    summary: "",
  };
}
