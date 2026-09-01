export const SENIOR_HIGH_CATALOG_URL = "/senior-high/catalog.json";

export const SENIOR_HIGH_CATEGORY_LABELS: Record<string, string> = {
  cloze: "完形填空",
  continuation_writing: "读后续写",
  error_correction: "短文改错",
  grammar_fill: "语法填空／语言运用",
  listening: "听力",
  other: "综合题型",
  pronunciation: "语音知识",
  reading: "阅读理解",
  seven_choice: "七选五／阅读补全",
  speaking_listening: "广东听说考试",
  summary_writing: "概要写作",
  writing: "应用文写作",
};

export function seniorHighCategoryLabel(category: string) {
  return SENIOR_HIGH_CATEGORY_LABELS[category] ?? category;
}
