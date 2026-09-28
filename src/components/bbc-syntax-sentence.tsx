import type { ReactNode } from "react";
import styles from "./bbc-syntax-sentence.module.css";

export type BbcSyntaxSpan = { label: string; start: number; end: number };
export type BbcSyntaxSentenceData = {
  text: string;
  tokens: { text: string; pos: string; start: number; end: number }[];
  level1: BbcSyntaxSpan[];
  level2: BbcSyntaxSpan[];
  status: "reviewed" | "draft";
};

const POS_LABELS: Record<string, string> = {
  ADJ: "形容词", ADP: "介词", ADV: "副词", AUX: "助动词", CCONJ: "连词",
  DET: "限定词", INTJ: "感叹词", NOUN: "名词", NUM: "数词", PART: "小品词",
  PRON: "代词", PROPN: "专有名词", SCONJ: "连词", SYM: "符号", VERB: "动词", X: "其他",
};

function role(label: string) {
  if (label.includes("主语")) return styles.subject;
  if (label.includes("谓语")) return styles.predicate;
  if (label.includes("宾语")) return styles.object;
  if (label.includes("表语")) return styles.predicative;
  if (label.includes("状语")) return styles.adverbial;
  if (label.includes("定语")) return styles.attributive;
  return styles.other;
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[\s’‘]/g, "").replace(/[^a-z0-9'-]/g, "");
}

function phraseIndexes(tokens: BbcSyntaxSentenceData["tokens"], phrases: string[]) {
  const found = new Set<number>();
  for (const phrase of phrases) {
    const target = normalized(phrase);
    if (!target) continue;
    for (let start = 0; start < tokens.length; start += 1) {
      let text = "";
      for (let end = start; end < tokens.length && text.length <= target.length; end += 1) {
        text += normalized(tokens[end].text);
        if (text === target) {
          for (let i = start; i <= end; i += 1) found.add(i);
          break;
        }
      }
    }
  }
  return found;
}

export function BbcSyntaxSentence({
  data,
  embedded = false,
  sentenceNo,
  translation,
  vocabularyWordIndexes,
  waveTerms,
}: {
  data: BbcSyntaxSentenceData;
  embedded?: boolean;
  sentenceNo: number;
  translation?: ReactNode;
  vocabularyWordIndexes: Set<number>;
  waveTerms: string[];
}) {
  const waved = phraseIndexes(data.tokens, waveTerms);
  const lexicalWords = [...data.text.matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)];
  const words = data.tokens.map((token, index) => {
    const previousEnd = index > 0 ? data.tokens[index - 1].end : 0;
    const sourceGap = data.text.slice(previousEnd, token.start);
    // Some annotation tokenizers split punctuation and contractions into
    // separate tokens. Keep their source offsets for highlighting, but render
    // them attached to the preceding word as normal English typography does.
    const gap = token.pos === "PUNCT" || /^[’']/.test(token.text) ? "" : sourceGap;
    const lexical = token.text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [];
    const highlighted = lexicalWords.some((match, wordIndex) => {
      const start = match.index;
      const end = start + match[0].length;
      return vocabularyWordIndexes.has(wordIndex) && token.start < end && token.end > start;
    });
    return (
      <span className={`${styles.word} ${highlighted ? styles.highlight : ""} ${waved.has(index) ? styles.wave : ""}`} key={index}>
        <span className={styles.wordText}>{gap}{token.text}</span>
        {token.pos !== "PUNCT" && lexical.length > 0 ? <span className={styles.pos}>{POS_LABELS[token.pos] ?? "其他"}</span> : null}
      </span>
    );
  });

  const segments: ReactNode[] = [];
  let cursor = 0;
  function pushPlain(start: number, end: number) {
    if (start < end) segments.push(<span className={`${styles.segment} ${styles.plain}`} key={`plain-${start}`}><span className={styles.words}>{words.slice(start, end)}</span></span>);
  }
  for (const span of data.level1) {
    if (span.start < cursor || span.end > words.length) continue;
    pushPlain(cursor, span.start);
    const inner: ReactNode[] = [];
    let innerCursor = span.start;
    for (const child of data.level2.filter((candidate) => candidate.start >= span.start && candidate.end <= span.end)) {
      if (child.start < innerCursor) continue;
      if (child.start > innerCursor) inner.push(<span className={styles.words} key={`words-${innerCursor}`}>{words.slice(innerCursor, child.start)}</span>);
      inner.push(<span className={styles.nested} key={`nested-${child.start}`}><span className={styles.words}>{words.slice(child.start, child.end)}</span><span className={styles.nestedLabel}>{child.label}</span></span>);
      innerCursor = child.end;
    }
    if (innerCursor < span.end) inner.push(<span className={styles.words} key={`words-${innerCursor}`}>{words.slice(innerCursor, span.end)}</span>);
    segments.push(<span className={`${styles.segment} ${role(span.label)}`} key={`role-${span.start}`}><span className={styles.inner}>{inner}</span><span className={styles.label}>{span.label}</span></span>);
    cursor = span.end;
  }
  pushPlain(cursor, words.length);

  return (
    <div className={`${styles.card} ${embedded ? styles.embedded : ""}`} lang="en">
      <div className={styles.meta}><span>#{sentenceNo}</span></div>
      <span className={styles.screenReader}>{data.text}</span>
      <div aria-hidden="true" className={styles.sentence}>{segments}</div>
      {translation ? <p className={styles.translation} lang="zh-CN">{translation}</p> : null}
    </div>
  );
}
