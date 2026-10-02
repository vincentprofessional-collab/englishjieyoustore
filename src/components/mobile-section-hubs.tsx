"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";

type HubItem = { title: string; description?: string; href: string; meta?: string; featured?: boolean };
export type MobileExamSection = { id: string; title: string; items: HubItem[] };
export type MobileExam = { id: string; title: string; sections: MobileExamSection[] };

function HubHeading({ title, description }: { title: string; description: string }) {
  return <header className="mobile-hub-heading"><h1>{title}</h1><p>{description}</p></header>;
}

function HubLink({ item }: { item: HubItem }) {
  return <Link className={`mobile-hub-link${item.featured ? " featured" : ""}`} href={item.href}>
    <span className="mobile-hub-link-copy"><strong>{item.title}</strong>{item.description ? <small>{item.description}</small> : null}{item.meta ? <em>{item.meta}</em> : null}</span>
    <span aria-hidden="true" className="mobile-hub-chevron">›</span>
  </Link>;
}

export function MobileWordHub() {
  const modules: HubItem[] = [
    { title: "背单词", description: "继续今天的词汇复习", href: "/vocabulary/books", featured: true },
    { title: "词源词根字典", description: "按词根和词源理解词义", href: "/vocabulary/etymology" },
    { title: "口语表达", description: "雅思口语 Part 1–3", href: "/speaking/part-1" },
    { title: "俚语俗语", description: "在 BBC 文章里学真实用法", href: "/articles" },
  ];

  return <section className="mobile-hub mobile-word-hub">
    <HubHeading title="单词" description="查单词，整理词汇和表达。" />
    <section aria-label="查单词" className="mobile-word-search-card">
      <div><h2>查单词</h2><p>搜索释义、发音、例句和视频。</p></div>
      <VocabularySearchAutocomplete initialQuery="" autoFocus={false} />
    </section>
    <div className="mobile-hub-section-title"><h2>词汇与表达</h2></div>
    <div className="mobile-hub-grid">{modules.map((item) => <HubLink item={item} key={item.href} />)}</div>
  </section>;
}

export function MobileTextbookHub() {
  const items: HubItem[] = [
    { title: "BBC 随身英语", description: "按年份浏览文章，泛读、精读、精听与口语练习", href: "/articles", meta: "文章 · 全文音频" },
    { title: "新概念英语", description: "选择教材与课次，继续学习课文和配套音频", href: "/new-concept", meta: "Book 1–4" },
  ];
  return <section className="mobile-hub mobile-textbook-hub">
    <HubHeading title="教材" description="BBC 随身英语与新概念英语。" />
    <div className="mobile-hub-section-title"><h2>选择教材</h2></div>
    <div className="mobile-hub-feature-list">{items.map((item) => <HubLink item={item} key={item.href} />)}</div>
  </section>;
}

export function MobileMeHub() {
  const items: HubItem[] = [
    { title: "收藏夹", description: "单词、句子、文章、错题与批注", href: "/me/favorites" },
    { title: "设置", description: "自动发音与个人偏好", href: "/me/settings" },
    { title: "学习进度", description: "查看练习记录与阶段进展", href: "/me/progress" },
  ];
  return <section className="mobile-hub mobile-me-hub">
    <HubHeading title="我的" description="收藏内容、调整设置、查看学习进度。" />
    <div className="mobile-hub-feature-list">{items.map((item) => <HubLink item={item} key={item.href} />)}</div>
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
    <HubHeading title="考试" description="选择考试，再按知识点、专项训练或试卷查找内容。" />
    <div className="mobile-exam-layout">
      <nav aria-label="选择考试" className="mobile-exam-list">
        {exams.map((exam) => <button aria-current={exam.id === selectedExam?.id ? "page" : undefined} className={exam.id === selectedExam?.id ? "active" : ""} key={exam.id} onClick={() => selectExam(exam.id)} type="button">{exam.title}</button>)}
      </nav>
      <section aria-label={`${selectedExam?.title ?? "考试"}目录`} className="mobile-exam-workspace">
        <header className="mobile-exam-workspace-head"><h2>{selectedExam?.title}</h2></header>
        <div aria-label="考试下属菜单" className="mobile-exam-sections" role="tablist">
          {selectedExam?.sections.map((item) => <button aria-selected={item.id === section?.id} className={item.id === section?.id ? "active" : ""} key={item.id} onClick={() => setSelectedSectionId(item.id)} role="tab" type="button">{item.title}</button>)}
        </div>
        <div className="mobile-exam-items" role="tabpanel">
          {filteredItems.length ? filteredItems.map((item) => <HubLink item={item} key={item.href} />) : <p className="mobile-exam-empty">这个栏目目前没有可用内容。</p>}
        </div>
      </section>
    </div>
  </section>;
}
