export type LanguageExamId = "cet4" | "cet6" | "postgraduate" | "ielts" | "gre" | "gmat" | "sat";

export type ExamMenuNode = {
  id: string;
  label: string;
  href: string;
  children: ExamMenuNode[];
  matchSubroutes?: boolean;
};

export type ExamMenuGroup = ExamMenuNode & { mark: string; disabled?: boolean };

export type ExamPageBlock = {
  id: string;
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

export type ExamPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  blocks: ExamPageBlock[];
};

export type LanguageExamContent = {
  navigation: ExamMenuGroup[];
  pages: Record<LanguageExamId, ExamPageCopy>;
};

export const LANGUAGE_EXAM_CONTENT_SLUG = "language-exam-admin-content";

export const DEFAULT_LANGUAGE_EXAM_NAVIGATION: ExamMenuGroup[] = [
  { id: "junior-high", label: "中考英语", mark: "中", href: "/junior-high?entry=knowledge", children: [
    { id: "junior-high-knowledge", label: "知识点", href: "/junior-high?entry=knowledge", children: [] },
    { id: "junior-high-practice", label: "题型训练", href: "/junior-high?entry=practice", children: [] },
    { id: "junior-high-papers", label: "历年真题", href: "/junior-high?entry=papers", children: [] },
  ] },
  { id: "senior-high", label: "高考英语", mark: "高", href: "/senior-high?entry=knowledge", children: [
    { id: "senior-high-knowledge", label: "知识点", href: "/senior-high?entry=knowledge", children: [] },
    { id: "senior-high-practice", label: "题型训练", href: "/senior-high?entry=practice", children: [] },
    { id: "senior-high-papers", label: "历年真题", href: "/senior-high?entry=papers", children: [] },
  ] },
  { id: "cet4", label: "四级英语", mark: "四", href: "/cet4?entry=papers", children: [
    { id: "cet4-practice", label: "题型训练", href: "/cet4?entry=practice", children: [] },
    { id: "cet4-papers", label: "历年真题", href: "/cet4?entry=papers", children: [] },
  ] },
  { id: "cet6", label: "六级英语", mark: "六", href: "/cet6", children: [
    { id: "cet6-practice", label: "题型训练", href: "/cet6?entry=practice", children: [] },
    { id: "cet6-papers", label: "历年真题", href: "/cet6?entry=papers", children: [] },
  ] },
  { id: "postgraduate", label: "考研英语", mark: "研", href: "/postgraduate?entry=papers", children: [
    { id: "postgraduate-practice", label: "题型训练", href: "/postgraduate?entry=practice", children: [] },
    { id: "postgraduate-papers", label: "历年真题", href: "/postgraduate?entry=papers", children: [] },
  ] },
  { id: "ielts", label: "雅思", mark: "雅", href: "/listening", children: [
    { id: "ielts-listening", label: "听力", href: "/listening", children: [
      { id: "ielts-listening-cambridge", label: "剑桥雅思", href: "/listening/practice?source=cambridge", matchSubroutes: true, children: [] },
      { id: "ielts-listening-papers", label: "历年真题", href: "/listening/past-papers", matchSubroutes: true, children: [] },
    ] },
    { id: "ielts-speaking", label: "口语", href: "/speaking", children: [
      { id: "ielts-speaking-part-1", label: "Part 1", href: "/speaking/part-1", matchSubroutes: true, children: [] },
      { id: "ielts-speaking-part-2", label: "Part 2", href: "/speaking/part-2", matchSubroutes: true, children: [] },
      { id: "ielts-speaking-part-3", label: "Part 3", href: "/speaking/part-3", matchSubroutes: true, children: [] },
    ] },
    { id: "ielts-reading", label: "阅读", href: "/reading", matchSubroutes: true, children: [] },
    { id: "ielts-writing", label: "写作", href: "/writing", children: [
      { id: "ielts-writing-task-1", label: "小作文", href: "/writing/practice?task=task1", children: [] },
      { id: "ielts-writing-task-2", label: "大作文", href: "/writing/task2", children: [] },
      { id: "ielts-writing-practice", label: "专项训练", href: "/writing/task1-vocabulary", children: [] },
    ] },
  ] },
  { id: "sat", label: "SAT", mark: "S", href: "/sat", children: [
    { id: "sat-knowledge", label: "知识点", href: "/sat/knowledge", children: [] },
    { id: "sat-practice", label: "题型训练", href: "/sat", children: [] },
    { id: "sat-papers", label: "历年真题", href: "/sat/past-papers", children: [] },
  ] },
  { id: "gmat", label: "GMAT", mark: "G", href: "/gmat?entry=practice", children: [
    { id: "gmat-practice", label: "题型训练", href: "/gmat?entry=practice", children: [] },
  ] },
  { id: "gre", label: "GRE", mark: "G", href: "/gre?entry=practice", children: [
    { id: "gre-practice", label: "题型训练", href: "/gre?entry=practice", children: [] },
  ] },
];

export const DEFAULT_EXAM_PAGE_COPY: Record<LanguageExamId, ExamPageCopy> = {
  cet4: { eyebrow: "CET-4 · ENGLISH", title: "大学英语四级", description: "按题型练习或进入历年真题。", blocks: [] },
  cet6: { eyebrow: "CET-6 · ENGLISH", title: "大学英语六级", description: "按题型练习或进入历年真题。", blocks: [] },
  postgraduate: { eyebrow: "POSTGRADUATE · ENGLISH", title: "考研英语", description: "按年份练习真题，或选择题型进行专项训练。", blocks: [] },
  ielts: { eyebrow: "IELTS · READING", title: "雅思阅读", description: "选择剑桥雅思套题，逐篇练习并查看作答反馈。", blocks: [] },
  gre: { eyebrow: "GRE · ENGLISH", title: "GRE", description: "按题型选择练习。", blocks: [] },
  gmat: { eyebrow: "GMAT · ENGLISH", title: "GMAT", description: "按题型选择练习。", blocks: [] },
  sat: { eyebrow: "SAT · READING AND WRITING", title: "SAT", description: "按 SAT 阅读与写作题型练习。", blocks: [] },
};

function isMenuNode(value: unknown): value is ExamMenuNode {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.label === "string" && typeof row.href === "string" && Array.isArray(row.children) && row.children.every(isMenuNode);
}

function isMenuGroup(value: unknown): value is ExamMenuGroup {
  return isMenuNode(value) && typeof (value as ExamMenuGroup).mark === "string";
}

function pageCopy(value: unknown, fallback: ExamPageCopy): ExamPageCopy {
  if (!value || typeof value !== "object") return fallback;
  const row = value as Record<string, unknown>;
  return {
    eyebrow: typeof row.eyebrow === "string" ? row.eyebrow : fallback.eyebrow,
    title: typeof row.title === "string" ? row.title : fallback.title,
    description: typeof row.description === "string" ? row.description : fallback.description,
    blocks: Array.isArray(row.blocks) ? row.blocks.filter((item): item is ExamPageBlock => Boolean(item && typeof item === "object" && typeof (item as ExamPageBlock).id === "string" && typeof (item as ExamPageBlock).title === "string" && typeof (item as ExamPageBlock).body === "string")) : fallback.blocks,
  };
}

export function normalizeLanguageExamContent(value: unknown): LanguageExamContent {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const navigation = Array.isArray(row.navigation) && row.navigation.every(isMenuGroup)
    ? row.navigation as ExamMenuGroup[]
    : DEFAULT_LANGUAGE_EXAM_NAVIGATION;
  const sourcePages = row.pages && typeof row.pages === "object" ? row.pages as Record<string, unknown> : {};
  return {
    navigation,
    pages: Object.fromEntries(Object.entries(DEFAULT_EXAM_PAGE_COPY).map(([exam, fallback]) => [exam, pageCopy(sourcePages[exam], fallback)])) as Record<LanguageExamId, ExamPageCopy>,
  };
}

export async function loadLanguageExamContent(): Promise<LanguageExamContent> {
  const response = await fetch("/api/language-exam-content", { cache: "no-store" });
  if (!response.ok) throw new Error("语言考试页面配置读取失败。");
  return normalizeLanguageExamContent(await response.json());
}
