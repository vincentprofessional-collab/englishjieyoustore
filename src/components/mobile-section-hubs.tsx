"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";

type HubItem = { title: string; description?: string; href: string; meta?: string };
export type MobileExamSection = { id: string; title: string; items: HubItem[] };
export type MobileExam = { id: string; title: string; sections: MobileExamSection[] };

function HubHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="mobile-hub-heading"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>;
}

function HubLink({ item, index }: { item: HubItem; index: number }) {
  return <Link className="mobile-hub-link" href={item.href} key={`${item.href}-${index}`}>
    <span className="mobile-hub-link-index">{String(index + 1).padStart(2, "0")}</span>
    <span className="mobile-hub-link-copy"><strong>{item.title}</strong>{item.description ? <small>{item.description}</small> : null}{item.meta ? <em>{item.meta}</em> : null}</span>
    <span aria-hidden="true" className="mobile-hub-chevron">›</span>
  </Link>;
}

export function MobileWordHub() {
  const modules: HubItem[] = [
    { title: "背单词", description: "词汇书、复习与熟悉度记录", href: "/vocabulary/books" },
    { title: "词源词根字典", description: "词根词缀、词源故事与构词关系", href: "/vocabulary/etymology" },
    { title: "口语表达", description: "雅思口语 Part 1–3 题目与表达", href: "/speaking/part-1" },
    { title: "俚语俗语", description: "从 BBC 文章学习地道短语与表达", href: "/articles" },
  ];

  return <section className="mobile-hub mobile-word-hub">
    <HubHeading eyebrow="WORD STUDIO" title="单词" description="查词、积累表达，也可以继续今天的背词计划。" />
    <section aria-label="查单词" className="mobile-word-search-card">
      <div><span>01 · DICTIONARY</span><h2>查单词</h2><p>输入英文或中文，打开词义、发音、例句与相关视频。</p></div>
      <VocabularySearchAutocomplete initialQuery="" autoFocus={false} />
    </section>
    <div className="mobile-hub-section-title"><h2>继续学习</h2><span>4 个模块</span></div>
    <div className="mobile-hub-grid">{modules.map((item, index) => <HubLink item={item} index={index + 1} key={item.href} />)}</div>
  </section>;
}

export function MobileTextbookHub() {
  const items: HubItem[] = [
    { title: "BBC 随身英语", description: "按年份浏览文章，泛读、精读、精听与口语练习", href: "/articles", meta: "文章 · 全文音频" },
    { title: "新概念英语", description: "选择教材与课次，继续学习课文和配套音频", href: "/new-concept", meta: "Book 1–4" },
  ];
  return <section className="mobile-hub mobile-textbook-hub">
    <HubHeading eyebrow="READING ROOM" title="教材" description="从熟悉的教材继续读、听和练。" />
    <div className="mobile-hub-section-title"><h2>教材目录</h2><span>2 个系列</span></div>
    <div className="mobile-hub-feature-list">{items.map((item, index) => <HubLink item={item} index={index} key={item.href} />)}</div>
  </section>;
}

export function MobileMeHub() {
  const items: HubItem[] = [
    { title: "收藏夹", description: "单词、句子、文章、错题与批注", href: "/me/favorites" },
    { title: "设置", description: "自动发音与个人偏好", href: "/me/settings" },
    { title: "学习进度", description: "查看练习记录与阶段进展", href: "/me/progress" },
  ];
  return <section className="mobile-hub mobile-me-hub">
    <HubHeading eyebrow="MY STUDY DESK" title="我的" description="管理收藏、学习设置和自己的学习记录。" />
    <div className="mobile-hub-feature-list">{items.map((item, index) => <HubLink item={item} index={index} key={item.href} />)}</div>
  </section>;
}

export function MobileExamHub({ exams }: { exams: MobileExam[] }) {
  const [selectedExamId, setSelectedExamId] = useState(exams[0]?.id ?? "");
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? exams[0];
  const [selectedSectionId, setSelectedSectionId] = useState(selectedExam?.sections[0]?.id ?? "");
  const section = selectedExam?.sections.find((item) => item.id === selectedSectionId) ?? selectedExam?.sections[0];
  const filteredItems = useMemo(() => section?.items ?? [], [section]);

  function selectExam(id: string) {
    const nextExam = exams.find((exam) => exam.id === id);
    setSelectedExamId(id);
    setSelectedSectionId(nextExam?.sections[0]?.id ?? "");
  }

  return <section className="mobile-hub mobile-exams-hub">
    <HubHeading eyebrow="EXAM PREP" title="考试" description="先选考试，再从知识点、专项练习或试卷进入。" />
    <div className="mobile-exam-layout">
      <nav aria-label="选择考试" className="mobile-exam-list">
        {exams.map((exam) => <button aria-current={exam.id === selectedExam?.id ? "page" : undefined} className={exam.id === selectedExam?.id ? "active" : ""} key={exam.id} onClick={() => selectExam(exam.id)} type="button">{exam.title}</button>)}
      </nav>
      <section aria-label={`${selectedExam?.title ?? "考试"}目录`} className="mobile-exam-workspace">
        <header className="mobile-exam-workspace-head"><span>当前考试</span><h2>{selectedExam?.title}</h2></header>
        <div aria-label="考试下属菜单" className="mobile-exam-sections" role="tablist">
          {selectedExam?.sections.map((item) => <button aria-selected={item.id === section?.id} className={item.id === section?.id ? "active" : ""} key={item.id} onClick={() => setSelectedSectionId(item.id)} role="tab" type="button">{item.title}</button>)}
        </div>
        <div className="mobile-exam-items" role="tabpanel">
          {filteredItems.length ? filteredItems.map((item, index) => <HubLink item={item} index={index} key={`${item.href}-${index}`} />) : <p className="mobile-exam-empty">这个栏目目前没有可用内容。</p>}
        </div>
      </section>
    </div>
  </section>;
}
