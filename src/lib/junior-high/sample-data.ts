export type JuniorHighQuestionType =
  | "listening"
  | "grammar"
  | "cloze"
  | "reading"
  | "reading-response"
  | "vocabulary"
  | "dialogue"
  | "writing";

export type JuniorHighSample = {
  id: string;
  type: JuniorHighQuestionType;
  label: string;
  prompt: string;
  passage?: string;
  options?: string[];
  answer: string;
  analysis: string;
};

export const JUNIOR_HIGH_REGIONS = ["北京", "上海", "天津", "广东", "江苏", "浙江", "山东", "河北", "福建", "重庆", "湖南", "陕西", "湖南长沙", "广西", "河南", "安徽", "江西", "四川成都", "湖北武汉", "新疆", "云南昆明", "四川凉山", "四川宜宾", "四川资阳", "海南", "甘肃平凉", "湖南怀化"];
export const JUNIOR_HIGH_YEARS = [2024, 2023, 2022, 2021, 2020, 2019];

export const JUNIOR_HIGH_SAMPLES: JuniorHighSample[] = [
  { id: "listening-1", type: "listening", label: "听力", prompt: "What does the boy want to borrow?", options: ["A. A pen", "B. A book", "C. A ruler"], answer: "B", analysis: "对话中男孩说他需要一本英语词典，因此选择 B。" },
  { id: "grammar-1", type: "grammar", label: "单项选择／语法", prompt: "My sister ______ to school by bike every day.", options: ["A. go", "B. goes", "C. went", "D. going"], answer: "B", analysis: "主语 My sister 是第三人称单数，且 every day 表示一般现在时，谓语使用 goes。" },
  { id: "cloze-1", type: "cloze", label: "完形填空", passage: "Reading is a good way to learn. It helps us understand the world and makes our life more ____.", prompt: "Choose the best word for the blank.", options: ["A. difficult", "B. interesting", "C. expensive", "D. quiet"], answer: "B", analysis: "阅读帮助我们了解世界，使生活更有趣，interesting 符合语境。" },
  { id: "reading-1", type: "reading", label: "阅读理解", passage: "Lina starts a small school garden with her classmates. They plant vegetables, record the weather and share the harvest with their neighbors.", prompt: "Why do Lina and her classmates record the weather?", options: ["A. To sell vegetables", "B. To plan the garden better", "C. To invite neighbors", "D. To write a story"], answer: "B", analysis: "文章提到他们记录天气并管理菜园，记录天气是为了更好地安排种植计划。" },
  { id: "reading-response-1", type: "reading-response", label: "任务型阅读／阅读表达", passage: "Tom joined a weekend clean-up. He worked with friends for two hours and collected 18 bags of rubbish.", prompt: "How long did Tom work?", answer: "For two hours.", analysis: "答案直接出现在第二句：He worked with friends for two hours。" },
  { id: "vocabulary-1", type: "vocabulary", label: "词汇与综合填空", prompt: "Please ______ (write) your name at the top of the page.", answer: "write", analysis: "情态动词 Please 后接动词原形，因此填 write。" },
  { id: "dialogue-1", type: "dialogue", label: "补全对话", prompt: "—Would you like to join us?\n—______ . I have to finish my homework first.", options: ["A. Yes, please", "B. I'd love to", "C. I'm afraid not", "D. That's right"], answer: "C", analysis: "后句说明还要完成作业，表达委婉拒绝，应选 I'm afraid not。" },
  { id: "writing-1", type: "writing", label: "书面表达", prompt: "Write an email to your friend about one useful habit you have developed. Write at least 60 words.", answer: "请完成不少于 60 词的英文短文。", analysis: "书面表达暂不自动评分。提交后提供写作要求、结构建议和人工复核入口。" },
];

export const MOCK_SAMPLE = {
  id: "2023-tianjin-sample",
  year: 2023,
  region: "天津",
  paperLabel: "2023 年天津市中考英语真题（样板）",
  durationMinutes: 100,
};
