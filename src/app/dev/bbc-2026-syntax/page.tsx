import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { BbcSyntaxSentence, type BbcSyntaxSentenceData } from "@/components/bbc-syntax-sentence";
import syntaxData from "@/data/bbc/2026-syntax.json";
import { BBC_ARTICLES } from "@/lib/articles/bbc";
import styles from "./preview.module.css";

export const dynamic = "force-dynamic";

const articles = BBC_ARTICLES.filter((article) => article.year === 2026);
const syntax = syntaxData as Record<string, BbcSyntaxSentenceData[]>;

function highlightedTranslation(text: string, terms: string[] = []) {
  const unique = [...new Set(terms.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!unique.length) return text;
  const parts: ReactNode[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const matches = unique.map((term) => ({ term, index: text.indexOf(term, cursor) })).filter((item) => item.index >= 0);
    const next = matches.sort((a, b) => a.index - b.index || b.term.length - a.term.length)[0];
    if (!next) break;
    if (next.index > cursor) parts.push(text.slice(cursor, next.index));
    parts.push(<span className="bbc-wave-term" key={next.index}>{next.term}</span>);
    cursor = next.index + next.term.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export default async function BbcSyntaxPreview({
  searchParams,
}: {
  searchParams: Promise<{ article?: string; sentence?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { article: requestedArticle, sentence: requestedSentence } = await searchParams;
  const article = articles.find((item) => item.id === requestedArticle) ?? articles.find((item) => item.id === "260518")!;
  const sentences = article.sentences ?? [];
  const annotated = syntax[article.id] ?? [];
  const requestedNumber = Number.parseInt(requestedSentence ?? "1", 10);
  const sentenceIndex = Number.isFinite(requestedNumber) && requestedNumber >= 1 && requestedNumber <= sentences.length
    ? requestedNumber - 1
    : 0;
  const activeSentence = sentences[sentenceIndex];
  const activeAnnotation = annotated[sentenceIndex];
  if (!activeSentence || !activeAnnotation) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>BBC 2026 · 本地精读版式预览</p>
          <h1>{article.title}</h1>
          <p>{article.titleChinese}</p>
          <p className={styles.note}>短语句法成分已逐句人工校验。此页展示英文结构标注与对应中文翻译的本地效果。</p>
          <form action="/dev/bbc-2026-syntax" className={styles.selectRow}>
            <label htmlFor="syntax-article">选择文章</label>
            <select defaultValue={article.id} id="syntax-article" name="article">
              {articles.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}
            </select>
            <button type="submit">查看</button>
          </form>
          <Link href={`/articles/${article.id}`}>进入网站文章精读模式 ↗</Link>
        </header>
        <BbcSyntaxSentence
          data={activeAnnotation}
          sentenceNo={activeSentence.sentenceNo}
          translation={highlightedTranslation(activeSentence.chinese, activeSentence.chineseUnderlinedTerms)}
          vocabularyWordIndexes={new Set<number>()}
          waveTerms={activeSentence.underlinedTerms ?? []}
        />
        <nav aria-label="切换句子" className={styles.navigation}>
          {sentenceIndex > 0 ? (
            <Link href={`/dev/bbc-2026-syntax?article=${article.id}&sentence=${sentenceIndex}`}>上一句</Link>
          ) : <span className={styles.disabled}>上一句</span>}
          <span>第 {sentenceIndex + 1} / {sentences.length} 句</span>
          {sentenceIndex + 1 < sentences.length ? (
            <Link href={`/dev/bbc-2026-syntax?article=${article.id}&sentence=${sentenceIndex + 2}`}>下一句</Link>
          ) : <span className={styles.disabled}>下一句</span>}
        </nav>
      </div>
    </main>
  );
}
