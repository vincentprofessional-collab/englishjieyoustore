import fs from "node:fs";
import path from "node:path";
import { MobileExamHub, type MobileExam } from "@/components/mobile-section-hubs";
import { getCetExamEntries, getCetExamSetIndex, type CetExam } from "@/lib/cet4/library";
import { JUNIOR_HIGH_PAPER_CATALOG } from "@/lib/junior-high/paper-catalog";
import { JUNIOR_HIGH_PRACTICE_CATALOG } from "@/lib/junior-high/practice-catalog";

export const metadata = { title: "考试 | 英文解忧杂货铺" };

type PublicEntry = { id: string; kind: string; title: string; questionCount: number; href: string; year: string; region: string; variant?: string };
type SeniorKnowledgeItem = { knowledge_topic?: string };

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", relativePath), "utf8")) as T;
}

function cetSections(exam: CetExam) {
  const prefix = exam === "cet4" ? "四级" : "六级";
  const knowledge = getCetExamEntries(exam).filter((entry) => entry.section === "知识点").map((entry) => ({
    title: entry.title,
    description: entry.excerpt,
    href: `/${exam}/${entry.id}`,
    meta: entry.topic,
  }));
  const sets = getCetExamSetIndex(exam).entries;
  return [
    { id: "knowledge", title: "知识点", href: `/exams/${exam}`, items: knowledge },
    { id: "practice", title: "题型训练", items: sets.filter((item) => item.kind === "practice").map((item) => ({ title: item.title, description: `${item.questionCount} 题 · ${item.answerStatus === "answered" ? "答案完整" : "含可用答案"}`, href: item.href, meta: item.questionTypes.join("、") })) },
    { id: "papers", title: "历年试卷", items: sets.filter((item) => item.kind === "paper").map((item) => ({ title: item.title, description: `${item.year} · ${item.region} · ${item.questionCount} 题`, href: item.href, meta: item.answerStatus === "answered" ? "答案完整" : "查看试卷" })) },
  ].map((section) => ({ ...section, items: section.items.length ? section.items : [{ title: `${prefix}目录`, description: "进入现有题库目录", href: `/${exam}?entry=${section.id}` }] }));
}

export default function ExamsPage() {
  const juniorTopics = JUNIOR_HIGH_PRACTICE_CATALOG
    .filter((item) => item.category === "topic" && item.questionCount >= 20)
    .sort((left, right) => left.title.localeCompare(right.title, "zh-CN"))
    .map((item) => ({ title: item.title, description: `${item.questionCount} 道知识点练习`, href: `/junior-high?entry=knowledge&mode=practice&id=${encodeURIComponent(item.id)}`, meta: item.topicGroup }));
  const juniorTypes = JUNIOR_HIGH_PRACTICE_CATALOG
    .filter((item) => item.category === "type" && (item.publishableQuestionCount ?? 0) > 0)
    .map((item) => ({ title: item.title, description: `${item.publishableQuestionCount ?? 0} 道可练习题`, href: `/junior-high?entry=practice&mode=practice&id=${encodeURIComponent(item.id)}`, meta: item.scope }));
  const juniorPapers = JUNIOR_HIGH_PAPER_CATALOG
    .filter((paper) => paper.questions.length > 0)
    .sort((left, right) => right.year - left.year || left.region.localeCompare(right.region, "zh-CN"))
    .map((paper) => ({ title: `${paper.year} ${paper.region}中考试卷`, description: `${paper.questions.length} 题`, href: `/junior-high?entry=papers&mode=mock&paper=${encodeURIComponent(`${paper.year}-${paper.region}-${paper.label}`)}`, meta: paper.label }));
  const seniorKnowledgeData = readJson<{ knowledge: SeniorKnowledgeItem[] }>("senior-high/knowledge.json");
  const seniorTopics = [...new Set(seniorKnowledgeData.knowledge.map((item) => item.knowledge_topic).filter((topic): topic is string => Boolean(topic)))]
    .map((topic) => ({ title: topic, description: "知识点练习与即时判分", href: `/senior-high?entry=knowledge&topic=${encodeURIComponent(topic)}`, meta: "知识点" }));
  const seniorIndex = readJson<{ entries: PublicEntry[] }>("senior-high/index.json");
  const satIndex = readJson<{ domains: { id: string; label: string }[]; sets: { id: string; domain: string; skill: string; difficulty: string; expectedCount: number }[] }>("sat/index.json");
  const exams: MobileExam[] = [
    { id: "junior", title: "中考", sections: [
      { id: "knowledge", title: "知识点", href: "/junior-high?entry=knowledge", items: juniorTopics },
      { id: "practice", title: "题型训练", items: juniorTypes },
      { id: "papers", title: "历年试卷", items: juniorPapers },
    ] },
    { id: "senior", title: "高考", sections: [
      { id: "knowledge", title: "知识点", href: "/senior-high?entry=knowledge", items: seniorTopics },
      { id: "practice", title: "题型训练", items: seniorIndex.entries.filter((item) => item.kind === "practice").map((item) => ({ title: item.title, description: `${item.questionCount} 题 · ${item.year}`, href: item.href, meta: item.region })) },
      { id: "papers", title: "历年试卷", items: seniorIndex.entries.filter((item) => item.kind === "paper").map((item) => ({ title: item.title, description: `${item.year} · ${item.region} · ${item.questionCount} 题`, href: item.href, meta: item.variant })) },
    ] },
    { id: "cet4", title: "四级", sections: cetSections("cet4") },
    { id: "cet6", title: "六级", sections: cetSections("cet6") },
    { id: "postgraduate", title: "考研", sections: [
      { id: "vocabulary", title: "核心词汇", items: [{ title: "考研词汇", description: "进入现有词汇书与复习功能", href: "/vocabulary/books?level=考研", meta: "背单词" }] },
    ] },
    { id: "ielts", title: "雅思", sections: [
      { id: "listening", title: "听力", items: [
        { title: "剑桥雅思 CI4–CI21", description: "按册进入听力题目与音频", href: "/listening/books/ci4", meta: "剑桥雅思" },
        { title: "九分达人 1–8", description: "九分达人听力资料", href: "/listening/jiufen", meta: "听力资料" },
        { title: "历年真题", description: "真题音频与中英文原文", href: "/listening/past-papers", meta: "真题" },
        { title: "听力练习", description: "继续听力训练", href: "/listening/practice", meta: "专项训练" },
      ] },
      { id: "speaking", title: "口语", items: [1, 2, 3].map((part) => ({ title: `Part ${part}`, description: "题目、示范回答与地道表达", href: `/speaking/part-${part}`, meta: "口语题库" })) },
      { id: "reading", title: "阅读", items: [
        { title: "阅读练习", description: "进入阅读题库与专项训练", href: "/reading/practice", meta: "专项训练" },
        { title: "阅读模考", description: "完整套题与答题进度", href: "/reading/mock", meta: "完整模考" },
      ] },
      { id: "writing", title: "写作", items: [
        { title: "大作文", description: "题库、范文与写作练习", href: "/writing/task2", meta: "Task 2" },
        { title: "小作文", description: "图表写作与常用表达", href: "/writing/practice?task=task1", meta: "Task 1" },
        { title: "写作专项训练", description: "进入写作练习目录", href: "/writing/practice?task=task1", meta: "专项训练" },
      ] },
    ] },
    { id: "sat", title: "SAT", sections: satIndex.domains.map((domain) => ({
      id: domain.id,
      title: domain.label,
      items: satIndex.sets.filter((item) => item.domain === domain.label).map((item) => ({ title: item.skill.replace(/\b\w/g, (letter) => letter.toUpperCase()), description: `${item.difficulty} · ${item.expectedCount} 题`, href: `/sat/practice/${item.id}`, meta: domain.label })),
    })) },
    { id: "gmat", title: "GMAT", sections: [
      { id: "vocabulary", title: "核心词汇", items: [{ title: "GMAT 词汇", description: "进入现有词汇书与复习功能", href: "/vocabulary/books?level=GMAT", meta: "背单词" }] },
    ] },
    { id: "gre", title: "GRE", sections: [
      { id: "vocabulary", title: "核心词汇", items: [{ title: "GRE 词汇", description: "进入现有词汇书与复习功能", href: "/vocabulary/books?level=GRE", meta: "背单词" }] },
    ] },
  ];

  return <MobileExamHub exams={exams} />;
}
