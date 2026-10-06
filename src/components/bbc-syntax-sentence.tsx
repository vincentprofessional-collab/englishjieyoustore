"use client";

import { useLayoutEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import type { ArticleInlineAnnotation, ArticleInlineLineStyle } from "@/lib/article-inline-annotations";
import styles from "./bbc-syntax-sentence.module.css";

export type BbcSyntaxLevel = 1 | 2 | 3 | 4 | 5;
export type BbcSyntaxLayerKey = `level${BbcSyntaxLevel}`;
export type BbcSyntaxSpan = { label: string; start: number; end: number };
export type BbcSyntaxSentenceData = {
  text: string;
  tokens: { text: string; pos: string; start: number; end: number }[];
  level1: BbcSyntaxSpan[];
  level2: BbcSyntaxSpan[];
  level3?: BbcSyntaxSpan[];
  level4?: BbcSyntaxSpan[];
  level5?: BbcSyntaxSpan[];
  status: "reviewed" | "draft";
};
export type BbcSyntaxDisplayMode = "all" | "main" | "none";
export type BbcSyntaxTokenRange = { start: number; end: number };

const POS_LABELS: Record<string, string> = {
  ADJ: "形容词", ADP: "介词", ADV: "副词", AUX: "助动词", CCONJ: "连词",
  DET: "限定词", INTJ: "感叹词", NOUN: "名词", NUM: "数词", PART: "小品词",
  PRON: "代词", PROPN: "专有名词", SCONJ: "连词", SYM: "符号", VERB: "动词", X: "其他",
};

const INLINE_STYLE_CLASSES: Record<ArticleInlineLineStyle, string> = {
  solid: styles.annotationSolid,
  dashed: styles.annotationDashed,
  wavy: styles.annotationWavy,
  thick: styles.annotationThick,
};

function role(label: string) {
  if (label.includes("比较")) return styles.comparison;
  if (label.includes("时间")) return styles.temporal;
  if (label.includes("主语")) return styles.subject;
  if (label.includes("谓语")) return styles.predicate;
  if (label.includes("宾语")) return styles.object;
  if (label.includes("表语")) return styles.predicative;
  if (label.includes("状语")) return styles.adverbial;
  if (label.includes("定语")) return styles.attributive;
  return styles.other;
}

const SYNTAX_LEVELS: BbcSyntaxLevel[] = [1, 2, 3, 4, 5];

function layerKey(level: BbcSyntaxLevel): BbcSyntaxLayerKey {
  return `level${level}` as BbcSyntaxLayerKey;
}

function spansAtLevel(data: BbcSyntaxSentenceData, level: BbcSyntaxLevel) {
  return data[layerKey(level)] ?? [];
}

function makeTracks(spans: BbcSyntaxSpan[]) {
  const tracks: BbcSyntaxSpan[][] = [];
  for (const span of [...spans].sort((left, right) => left.start - right.start || right.end - left.end)) {
    const track = tracks.find((items) => items.at(-1)!.end <= span.start);
    if (track) track.push(span);
    else tracks.push([span]);
  }
  return tracks;
}

function syntaxTracks(data: BbcSyntaxSentenceData, displayMode: BbcSyntaxDisplayMode) {
  if (displayMode === "none") return [];
  const clauseSpans = data.level1.filter((span) => span.label.includes("从句"));
  return [...SYNTAX_LEVELS].reverse().flatMap((level) => {
    const candidates = spansAtLevel(data, level);
    const spans = displayMode === "main" && level > 1
      ? candidates.filter((candidate) => !clauseSpans.some((parent) =>
          candidate.start >= parent.start && candidate.end <= parent.end))
      : candidates;
    return makeTracks(spans).map((trackSpans) => ({ level, spans: trackSpans, nested: level > 1 }));
  });
}

function spanCenterIndex(tokens: BbcSyntaxSentenceData["tokens"], span: BbcSyntaxSpan) {
  const midpoint = ((tokens[span.start]?.start ?? 0) + (tokens[span.end - 1]?.end ?? 0)) / 2;
  return tokens.slice(span.start, span.end).reduce((closest, token, offset) => {
    const currentIndex = span.start + offset;
    const closestToken = tokens[closest];
    return Math.abs((token.start + token.end) / 2 - midpoint) < Math.abs(((closestToken?.start ?? 0) + (closestToken?.end ?? 0)) / 2 - midpoint)
      ? currentIndex
      : closest;
  }, span.start);
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
  displayMode = "all",
  embedded = false,
  inlineAnnotations = [],
  showPos = true,
  sentenceNo,
  translation,
  vocabularyWordIndexes,
  waveTerms,
  onTokenRangeSelect,
  onPosTokenClick,
  onSyntaxSpanClick,
  onInlineAnnotationClick,
}: {
  data: BbcSyntaxSentenceData;
  displayMode?: BbcSyntaxDisplayMode;
  embedded?: boolean;
  inlineAnnotations?: ArticleInlineAnnotation[];
  showPos?: boolean;
  sentenceNo: number;
  translation?: ReactNode;
  vocabularyWordIndexes: Set<number>;
  waveTerms: string[];
  onTokenRangeSelect?: (range: BbcSyntaxTokenRange) => void;
  onPosTokenClick?: (tokenIndex: number) => void;
  onSyntaxSpanClick?: (level: BbcSyntaxLevel, span: BbcSyntaxSpan) => void;
  onInlineAnnotationClick?: (annotation: ArticleInlineAnnotation) => void;
}) {
  const waved = phraseIndexes(data.tokens, waveTerms);
  const lexicalWords = [...data.text.matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)];
  const staticTracks = syntaxTracks(data, displayMode);
  const sentenceRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const sentence = sentenceRef.current;
    if (!sentence) return;

    const measureLabels = () => {
      const words = Array.from(sentence.querySelectorAll<HTMLElement>("[data-token-index]"));
      const tracks = syntaxTracks(data, displayMode);
      const rowTops = words.map((word) => Math.round(word.querySelector<HTMLElement>("[data-word-text]")?.getBoundingClientRect().top ?? 0));
      const nestedRows = new Set<number>();
      tracks.forEach((track) => {
        if (!track.nested) return;
        track.spans.forEach((span) => {
          for (let index = span.start; index < span.end; index += 1) nestedRows.add(rowTops[index]);
        });
      });
      words.forEach((word, index) => {
        word.dataset.nestedRowActive = String(nestedRows.has(rowTops[index]));
      });

      for (const [trackIndex, track] of tracks.entries()) {
        for (const span of track.spans) {
          const key = `${trackIndex}:${span.start}:${span.end}`;
          const label = sentence.querySelector<HTMLElement>(`[data-syntax-label-key="${key}"]`);
          if (!label) continue;
          label.style.removeProperty("--syntax-label-offset");

          const centerIndex = spanCenterIndex(data.tokens, span);
          const centerText = words[centerIndex]?.querySelector<HTMLElement>("[data-word-text]");
          if (!centerText) continue;
          const centerTop = centerText.getBoundingClientRect().top;
          const lineRects: DOMRect[] = [];
          for (let index = span.start; index < span.end; index += 1) {
            const word = words[index];
            const wordText = word?.querySelector<HTMLElement>("[data-word-text]");
            if (!word || !wordText || Math.abs(wordText.getBoundingClientRect().top - centerTop) > 1) continue;
            const line = word.querySelector<HTMLElement>(`[data-syntax-track-index="${trackIndex}"] .${styles.syntaxLine}`);
            if (line) lineRects.push(line.getBoundingClientRect());
          }
          const anchorLine = words[centerIndex]?.querySelector<HTMLElement>(`[data-syntax-track-index="${trackIndex}"] .${styles.syntaxLine}`);
          if (!lineRects.length || !anchorLine) continue;
          const anchor = anchorLine.getBoundingClientRect();
          const left = Math.min(...lineRects.map((rect) => rect.left));
          const right = Math.max(...lineRects.map((rect) => rect.right));
          label.style.setProperty("--syntax-label-offset", `${(left + right - anchor.left - anchor.right) / 2}px`);
        }
      }

      sentence.querySelectorAll<HTMLElement>(`.${styles.syntaxLabelPlaceholder}`)
        .forEach((label) => label.style.removeProperty("--syntax-label-extra-top"));
      for (const [trackIndex, track] of tracks.entries()) {
        const trackElements = Array.from(sentence.querySelectorAll<HTMLElement>(`[data-syntax-track-index="${trackIndex}"]`));
        trackElements.forEach((element) => element.style.setProperty("--syntax-line-extra-top", "0px"));
        const labels = track.spans.flatMap((span) => {
          const key = `${trackIndex}:${span.start}:${span.end}`;
          const label = sentence.querySelector<HTMLElement>(`[data-syntax-label-key="${key}"]`);
          if (!label) return [];
          const rect = label.getBoundingClientRect();
          return [{ label, span, left: rect.left, right: rect.right }];
        }).sort((left, right) => left.left - right.left);
        if (!labels.length) {
          trackElements.forEach((element) => element.style.removeProperty("height"));
          continue;
        }

        const lineHeight = Number.parseFloat(window.getComputedStyle(labels[0].label).lineHeight) || 20;
        const rowSpace = Number.parseFloat(window.getComputedStyle(sentence).getPropertyValue("--syntax-row-space")) || 12;
        const laneEnds: number[] = [];
        for (const item of labels) {
          let lane = laneEnds.findIndex((right) => right + 4 <= item.left);
          if (lane < 0) lane = laneEnds.length;
          laneEnds[lane] = item.right;
          const laneOffset = lane * (lineHeight + 2);
          item.label.style.setProperty("--syntax-label-extra-top", `${laneOffset}px`);
          for (let index = item.span.start; index < item.span.end; index += 1) {
            words[index]?.querySelector<HTMLElement>(`[data-syntax-track-index="${trackIndex}"]`)
              ?.style.setProperty("--syntax-line-extra-top", `${laneOffset}px`);
          }
        }

        const trackHeight = rowSpace + laneEnds.length * lineHeight + (laneEnds.length - 1) * 2;
        trackElements.forEach((element) => { element.style.height = `${trackHeight}px`; });
      }
    };

    let frame = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureLabels);
    };
    measureLabels();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(sentence);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [data, displayMode]);
  const inlineMarksByToken = new Map<number, ArticleInlineAnnotation[]>();
  const inlineLabelsByToken = new Map<number, ArticleInlineAnnotation[]>();
  for (const annotation of inlineAnnotations) {
    if (annotation.start < 0 || annotation.end > data.text.length || data.text.slice(annotation.start, annotation.end) !== annotation.selectedText) continue;
    const matchedTokens = data.tokens
      .map((token, index) => ({ index, token }))
      .filter(({ token }) => token.start < annotation.end && token.end > annotation.start && /[A-Za-z]/.test(token.text));
    if (!matchedTokens.length) continue;

    for (const { index } of matchedTokens) {
      inlineMarksByToken.set(index, [...(inlineMarksByToken.get(index) ?? []), annotation]);
    }
    const center = (annotation.start + annotation.end) / 2;
    const labelToken = matchedTokens.reduce((closest, current) =>
      Math.abs((current.token.start + current.token.end) / 2 - center) < Math.abs((closest.token.start + closest.token.end) / 2 - center)
        ? current
        : closest,
    );
    inlineLabelsByToken.set(labelToken.index, [...(inlineLabelsByToken.get(labelToken.index) ?? []), annotation]);
  }
  const hasSentenceInlineAnnotations = inlineMarksByToken.size > 0;
  const words = data.tokens.map((token, index) => {
    const nextToken = data.tokens[index + 1];
    const sourceGapAfter = nextToken ? data.text.slice(token.end, nextToken.start) : "";
    const gapAfter = Math.min((sourceGapAfter.match(/[\t ]/g) ?? []).length, 4) * 0.25;
    const lexical = token.text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [];
    const highlighted = lexicalWords.some((match, wordIndex) => {
      const start = match.index;
      const end = start + match[0].length;
      return vocabularyWordIndexes.has(wordIndex) && token.start < end && token.end > start;
    });
    const inlineMarks = inlineMarksByToken.get(index) ?? [];
    const inlineLabels = inlineLabelsByToken.get(index) ?? [];
    const inlineAnnotation = inlineMarks[0];
    const hasInlineLabel = inlineAnnotation ? inlineLabels.some((item) => item.id === inlineAnnotation.id) : false;
    const syntaxMarks = staticTracks.map(({ spans, nested, level }, trackIndex) => {
      const span = spans.find((candidate) => index >= candidate.start && index < candidate.end);
      if (!span) {
        return <span aria-hidden="true" className={`${styles.syntaxTrack} ${nested ? styles.syntaxTrackNested : ""}`} data-syntax-track-index={trackIndex} key={`syntax-${trackIndex}`}>
          <span className={`${styles.syntaxLine} ${styles.syntaxLinePlaceholder}`} />
          <span className={`${styles.syntaxLabel} ${styles.syntaxLabelPlaceholder}`}>　</span>
        </span>;
      }
      const centerIndex = spanCenterIndex(data.tokens, span);
      const spanLevel = level;
      const gapWithinSpan = index + 1 < span.end ? gapAfter : 0;
      const endGap = index + 1 === span.end && spans.some((candidate) => candidate.start === span.end) ? 0.32 : 0;
      return <span aria-hidden="true" className={`${styles.syntaxTrack} ${nested ? styles.syntaxTrackNested : ""} ${role(span.label)}`} data-syntax-track-index={trackIndex} key={`syntax-${trackIndex}`}>
        <span
          className={`${styles.syntaxLine} ${nested ? styles.syntaxNestedLine : ""} ${onSyntaxSpanClick ? styles.editableMark : ""}`}
          onClick={() => onSyntaxSpanClick?.(spanLevel, span)}
          style={{ width: `calc(100% + ${gapWithinSpan}em + 2px - ${endGap}em)` } as CSSProperties}
        />
        <span
          className={`${styles.syntaxLabel} ${nested ? styles.syntaxNestedLabel : ""} ${onSyntaxSpanClick ? styles.editableMark : ""}`}
          data-syntax-label-key={index === centerIndex ? `${trackIndex}:${span.start}:${span.end}` : undefined}
          onClick={() => onSyntaxSpanClick?.(spanLevel, span)}
        >
          {index === centerIndex ? span.label : "　"}
        </span>
      </span>;
    });
    return (
      <span className={`${styles.word} ${highlighted ? styles.highlight : ""} ${waved.has(index) ? styles.wave : ""}`} data-token-index={index} key={index} style={gapAfter ? { marginRight: `${gapAfter}em` } : undefined}>
        <span className={styles.wordText} data-word-text>{token.text}</span>
        {showPos ? <span className={`${styles.pos} ${token.pos === "PUNCT" || lexical.length === 0 ? styles.posPlaceholder : ""} ${onPosTokenClick && token.pos !== "PUNCT" && lexical.length > 0 ? styles.editableMark : ""}`} onClick={() => onPosTokenClick?.(index)}>{token.pos === "PUNCT" || lexical.length === 0 ? "　" : POS_LABELS[token.pos] ?? token.pos}</span> : null}
        {hasSentenceInlineAnnotations && showPos ? (
          <span className={styles.annotationPosTrack}>
            <span className={`${styles.annotationPos} ${inlineAnnotation?.partOfSpeech && hasInlineLabel ? "" : styles.annotationPosPlaceholder}`}>
              {inlineAnnotation?.partOfSpeech && hasInlineLabel ? inlineAnnotation.partOfSpeech : "　"}
            </span>
          </span>
        ) : null}
        {hasSentenceInlineAnnotations && displayMode !== "none" ? (
          <span
            aria-hidden="true"
            className={`${styles.annotationLine} ${inlineAnnotation ? `${role(inlineAnnotation.label)} ${INLINE_STYLE_CLASSES[inlineAnnotation.style]}` : styles.annotationLinePlaceholder} ${onInlineAnnotationClick && inlineAnnotation ? styles.editableMark : ""}`}
            onClick={() => inlineAnnotation && onInlineAnnotationClick?.(inlineAnnotation)}
            style={inlineAnnotation && inlineAnnotation.end > token.end && nextToken && nextToken.start < inlineAnnotation.end && gapAfter > 0
              ? { width: `calc(100% + ${gapAfter}em)` } as CSSProperties
              : undefined}
          />
        ) : null}
        {hasSentenceInlineAnnotations && displayMode !== "none" ? (
          <span
            className={`${styles.annotationDetails} ${inlineAnnotation ? role(inlineAnnotation.label) : ""} ${onInlineAnnotationClick && inlineAnnotation ? styles.editableMark : ""} ${!hasInlineLabel ? styles.annotationDetailsPlaceholder : ""}`}
            onClick={() => inlineAnnotation && onInlineAnnotationClick?.(inlineAnnotation)}
          >
            <span className={styles.annotationLabel}>{hasInlineLabel && inlineAnnotation ? inlineAnnotation.label : "　"}</span>
          </span>
        ) : null}
        {syntaxMarks}
      </span>
    );
  });

  function handleSelection(event: MouseEvent<HTMLDivElement>) {
    if (!onTokenRangeSelect) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
    const range = selection.getRangeAt(0);
    if (!event.currentTarget.contains(range.startContainer) || !event.currentTarget.contains(range.endContainer)) return;
    const tokenIndex = (node: Node) => {
      const element = node instanceof Element ? node : node.parentElement;
      const token = element?.closest<HTMLElement>("[data-token-index]");
      return token ? Number(token.dataset.tokenIndex) : null;
    };
    const start = tokenIndex(range.startContainer);
    const end = tokenIndex(range.endContainer);
    if (start == null || end == null) return;
    onTokenRangeSelect({ start: Math.min(start, end), end: Math.max(start, end) + 1 });
  }

  return (
    <div className={`${styles.card} ${embedded ? styles.embedded : ""}`} lang="en">
      <div className={`${styles.meta} ${embedded ? styles.embeddedMeta : ""}`}><span>#{sentenceNo}</span></div>
      <span className={styles.screenReader}>{data.text}</span>
      <div aria-hidden="true" className={styles.sentence} onMouseUp={handleSelection} ref={sentenceRef}>{words}</div>
      {translation ? <p className={styles.translation} lang="zh-CN">{translation}</p> : null}
    </div>
  );
}
