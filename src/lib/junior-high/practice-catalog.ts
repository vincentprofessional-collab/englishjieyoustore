export type JuniorHighPracticeCategory = "topic" | "type";

export type JuniorHighPracticeCatalogItem = {
  id: string;
  category: JuniorHighPracticeCategory;
  title: string;
  sourceTitle: string;
  scope: string;
  year: number;
  questionCount: number;
  publishableQuestionCount?: number;
  questionType: string;
  topicGroup: string;
  isPilot?: boolean;
  reviewStatus?: "verified" | "needs-review";
};

export const JUNIOR_HIGH_PRACTICE_CATALOG: JuniorHighPracticeCatalogItem[] = [
  {
    "id": "practice-topic-756b595b",
    "category": "topic",
    "title": "名词",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 343,
    "questionType": "专项综合",
    "topicGroup": "词汇"
  },
  {
    "id": "practice-topic-e070f29b",
    "category": "topic",
    "title": "冠词",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 319,
    "questionType": "专项综合",
    "topicGroup": "词汇"
  },
  {
    "id": "practice-topic-66d77ecc",
    "category": "topic",
    "title": "代词",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 341,
    "questionType": "专项综合",
    "topicGroup": "词汇"
  },
  {
    "id": "practice-topic-48311a6f",
    "category": "topic",
    "title": "数词",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 159,
    "questionType": "专项综合",
    "topicGroup": "词汇"
  },
  {
    "id": "practice-topic-b72292fa",
    "category": "topic",
    "title": "形容词和副词",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 593,
    "questionType": "专项综合",
    "topicGroup": "词汇"
  },
  {
    "id": "practice-topic-7b9d19cd",
    "category": "topic",
    "title": "连词",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 340,
    "questionType": "专项综合",
    "topicGroup": "词汇"
  },
  {
    "id": "practice-topic-4a7c1d9c",
    "category": "topic",
    "title": "介词",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 362,
    "questionType": "专项综合",
    "topicGroup": "词汇"
  },
  {
    "id": "practice-topic-9840b481",
    "category": "topic",
    "title": "词汇辨析",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 112,
    "questionType": "专项综合",
    "topicGroup": "词汇"
  },
  {
    "id": "practice-topic-9983619f",
    "category": "topic",
    "title": "动词短语",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 258,
    "questionType": "专项综合",
    "topicGroup": "短语"
  },
  {
    "id": "practice-topic-115b3d7d",
    "category": "topic",
    "title": "短语辨析",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 87,
    "questionType": "专项综合",
    "topicGroup": "短语"
  },
  {
    "id": "practice-topic-5b4ff2b0",
    "category": "topic",
    "title": "介词短语",
    "sourceTitle": "汇总练习",
    "scope": "全国",
    "year": 2024,
    "questionCount": 41,
    "questionType": "专项综合",
    "topicGroup": "短语"
  },
  {
    "id": "practice-topic-d2618aeb",
    "category": "topic",
    "title": "宾语从句",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 354,
    "questionType": "专项综合",
    "topicGroup": "从句"
  },
  {
    "id": "practice-topic-28bc9780",
    "category": "topic",
    "title": "定语从句",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 191,
    "questionType": "专项综合",
    "topicGroup": "从句"
  },
  {
    "id": "practice-topic-4449296c",
    "category": "topic",
    "title": "状语从句",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 354,
    "questionType": "专项综合",
    "topicGroup": "从句"
  },
  {
    "id": "practice-topic-23370954",
    "category": "topic",
    "title": "名词性从句",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 107,
    "questionType": "专项综合",
    "topicGroup": "从句"
  },
  {
    "id": "practice-topic-126bb1e3",
    "category": "topic",
    "title": "情态动词",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 302,
    "questionType": "专项综合",
    "topicGroup": "动词"
  },
  {
    "id": "practice-topic-6688978a",
    "category": "topic",
    "title": "动词时态",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 692,
    "questionType": "专项综合",
    "topicGroup": "动词"
  },
  {
    "id": "practice-topic-c23f6c09",
    "category": "topic",
    "title": "被动语态",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 221,
    "questionType": "专项综合",
    "topicGroup": "动词"
  },
  {
    "id": "practice-topic-b60b074e",
    "category": "topic",
    "title": "非谓语动词",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 411,
    "questionType": "专项综合",
    "topicGroup": "动词"
  },
  {
    "id": "practice-topic-98c78b7f",
    "category": "topic",
    "title": "主谓一致",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 82,
    "questionType": "专项综合",
    "topicGroup": "句法"
  },
  {
    "id": "practice-topic-6ae52cbc",
    "category": "topic",
    "title": "句子成分和基本句型",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 159,
    "questionType": "专项综合",
    "topicGroup": "句法"
  },
  {
    "id": "practice-topic-8c627801",
    "category": "topic",
    "title": "句子种类和特殊句式",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 350,
    "questionType": "专项综合",
    "topicGroup": "句法"
  },
  {
    "id": "practice-type-choice-703c4ada",
    "category": "type",
    "title": "单项选择",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 1077,
    "publishableQuestionCount": 1077,
    "questionType": "单项选择",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-pilot-cloze-passage-1",
    "category": "type",
    "title": "完形填空",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 2214,
    "publishableQuestionCount": 2214,
    "questionType": "完形填空",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-grammar-choice-3577c7c0",
    "category": "type",
    "title": "语法选择",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 235,
    "publishableQuestionCount": 235,
    "questionType": "语法选择",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-reading-8bd38d27",
    "category": "type",
    "title": "阅读理解",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 2206,
    "publishableQuestionCount": 2206,
    "questionType": "阅读理解",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-reading-restore-71256756",
    "category": "type",
    "title": "阅读还原",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 384,
    "publishableQuestionCount": 384,
    "questionType": "阅读还原",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-task-reading-722bce7c",
    "category": "type",
    "title": "任务型阅读",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 1221,
    "publishableQuestionCount": 1221,
    "questionType": "任务型阅读",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-reading-response-5de5e62b",
    "category": "type",
    "title": "阅读表达",
    "sourceTitle": "汇总练习",
    "scope": "全国",
    "year": 2024,
    "questionCount": 4,
    "publishableQuestionCount": 4,
    "questionType": "阅读表达",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-grammar-blank-d7c83a50",
    "category": "type",
    "title": "语法填空",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 1739,
    "publishableQuestionCount": 1739,
    "questionType": "语法填空",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-passage-blank-ae9bae8c",
    "category": "type",
    "title": "短文填空",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 1363,
    "publishableQuestionCount": 1363,
    "questionType": "短文填空",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-word-bank-678cae52",
    "category": "type",
    "title": "选词填空",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 498,
    "publishableQuestionCount": 498,
    "questionType": "选词填空",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-dialogue-6c32b2f4",
    "category": "type",
    "title": "补全对话",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 511,
    "publishableQuestionCount": 511,
    "questionType": "补全对话",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-spelling-a5644d42",
    "category": "type",
    "title": "单词拼写",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 125,
    "publishableQuestionCount": 125,
    "questionType": "单词拼写",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-sentence-27221a89",
    "category": "type",
    "title": "完成句子",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 311,
    "publishableQuestionCount": 311,
    "questionType": "完成句子",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-transform-becdd00c",
    "category": "type",
    "title": "句型转换",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 368,
    "publishableQuestionCount": 368,
    "questionType": "句型转换",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-sentence-order-b593f76c",
    "category": "type",
    "title": "连词成句",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 198,
    "publishableQuestionCount": 198,
    "questionType": "连词成句",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-translation-23141370",
    "category": "type",
    "title": "翻译",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 11,
    "publishableQuestionCount": 11,
    "questionType": "翻译",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-situational-sentence-087f5d7f",
    "category": "type",
    "title": "根据情景写句子",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 161,
    "publishableQuestionCount": 161,
    "questionType": "根据情景写句子",
    "topicGroup": "",
    "reviewStatus": "verified"
  },
  {
    "id": "practice-type-writing-3f2d6502",
    "category": "type",
    "title": "书面表达",
    "sourceTitle": "桌面中考知识",
    "scope": "全国",
    "year": 2024,
    "questionCount": 51,
    "publishableQuestionCount": 51,
    "questionType": "书面表达",
    "topicGroup": "",
    "reviewStatus": "verified"
  }
];
