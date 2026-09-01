export type PaidContentType =
  | "bbc-article"
  | "speaking-question"
  | "vocabulary-etymology"
  | "vocabulary-root"
  | "writing-task2";

export type ProjectAccessKey = string;
export type ProjectAccessPlan = "monthly" | "quarterly" | "yearly" | "lifetime";

export type ProjectAccessRule = {
  description: string;
  gateTitle?: string;
  key: ProjectAccessKey;
  shortTitle: string;
  title: string;
};

export type ProjectAccessPlanOption = {
  durationLabel: string;
  label: string;
  plan: ProjectAccessPlan;
  priceCny: number;
  priceLabel: string;
};

export const PROJECT_ACCESS_RULES: Record<string, ProjectAccessRule> = {
  "vocabulary.etymology": {
    description: "查单词里的词源故事、词根词缀和词源目录。",
    key: "vocabulary.etymology",
    shortTitle: "词源词根",
    title: "查单词 · 词源词根",
  },
  bbc: {
    description: "",
    gateTitle: "《BBC随身英语》开通会员",
    key: "bbc",
    shortTitle: "BBC随身英语",
    title: "《BBC随身英语》",
  },
  speaking: {
    description: "雅思口语高分思路、万能句型、范文、翻译和音频。",
    key: "speaking",
    shortTitle: "雅思口语",
    title: "雅思口语",
  },
  writing: {
    description: "雅思写作审题、段落规划、逐句练习和完整范文。",
    key: "writing",
    shortTitle: "雅思写作",
    title: "雅思写作",
  },
};

export const PROJECT_ACCESS_PROJECTS = [
  PROJECT_ACCESS_RULES["vocabulary.etymology"],
  PROJECT_ACCESS_RULES.speaking,
  PROJECT_ACCESS_RULES.writing,
  PROJECT_ACCESS_RULES.bbc,
];

export const PROJECT_ACCESS_PLANS: ProjectAccessPlanOption[] = [
  { durationLabel: "一个月", label: "月卡", plan: "monthly", priceCny: 9, priceLabel: "9元" },
  { durationLabel: "三个月", label: "季卡", plan: "quarterly", priceCny: 19, priceLabel: "19元" },
  { durationLabel: "一年", label: "年卡", plan: "yearly", priceCny: 69, priceLabel: "69元" },
  { durationLabel: "永久", label: "终身", plan: "lifetime", priceCny: 199, priceLabel: "199元" },
];

export function getPaidContentKey(type: PaidContentType, stableId: string) {
  const normalizedId = stableId.trim();

  if (!normalizedId) {
    throw new Error("Paid content requires a stable ID.");
  }

  const contentKey = `${type}:${normalizedId}`;

  if (contentKey.length > 250) {
    throw new Error("Paid content key must not exceed 250 characters.");
  }

  return contentKey;
}

export function getProjectAccessRule(projectKey: ProjectAccessKey) {
  return PROJECT_ACCESS_RULES[projectKey] ?? {
    description: "",
    key: projectKey,
    shortTitle: projectKey,
    title: projectKey,
  };
}

export function formatProjectPrice(priceCny: number) {
  return `${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(priceCny)}元`;
}
