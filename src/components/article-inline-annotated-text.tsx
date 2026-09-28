import type { ReactNode } from "react";
import {
  splitArticleSentences,
  type ArticleInlineAnnotation,
} from "@/lib/article-inline-annotations";

export function ArticleInlineAnnotatedText({
  annotations,
  renderText,
  text,
  unitId,
}: {
  annotations: ArticleInlineAnnotation[];
  renderText?: (text: string, characterOffset: number) => ReactNode;
  text: string;
  unitId: string;
}) {
  const matches = annotations
    .filter((item) => item.unitId === unitId && item.start >= 0 && item.end <= text.length && text.slice(item.start, item.end) === item.selectedText)
    .sort((left, right) => left.start - right.start);

  if (!matches.length) return renderText ? renderText(text, 0) : text;

  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const [index, item] of matches.entries()) {
    if (item.start < cursor) continue;
    if (item.start > cursor) {
      const plainText = text.slice(cursor, item.start);
      parts.push(
        <span key={`plain-${unitId}-${cursor}`}>
          {renderText ? renderText(plainText, cursor) : plainText}
        </span>,
      );
    }

    const selectedText = text.slice(item.start, item.end);
    parts.push(
      <span className={`article-inline-mark article-inline-mark--${item.style}`} key={item.id || `${unitId}-${index}`}>
        {item.partOfSpeech ? <span className="article-inline-mark-pos">{item.partOfSpeech}</span> : null}
        <span className="article-inline-mark-text">
          {renderText ? renderText(selectedText, item.start) : selectedText}
        </span>
        <span aria-label={`注释：${item.label}`} className="article-inline-mark-label">{item.label}</span>
      </span>,
    );
    cursor = item.end;
  }

  if (cursor < text.length) {
    const plainText = text.slice(cursor);
    parts.push(
      <span key={`plain-${unitId}-${cursor}`}>
        {renderText ? renderText(plainText, cursor) : plainText}
      </span>,
    );
  }

  return parts;
}

export function ArticleInlineAnnotatedParagraph({
  annotations,
  paragraphId,
  renderText,
  text,
}: {
  annotations: ArticleInlineAnnotation[];
  paragraphId: string;
  renderText?: (text: string, characterOffset: number) => ReactNode;
  text: string;
}) {
  const sentences = splitArticleSentences(text);
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const sentence of sentences) {
    if (sentence.start > cursor) {
      const separator = text.slice(cursor, sentence.start);
      parts.push(<span key={`${paragraphId}-separator-${cursor}`}>{separator}</span>);
    }
    parts.push(
      <ArticleInlineAnnotatedText
        annotations={annotations}
        key={`${paragraphId}-sentence-${sentence.index}`}
        renderText={renderText ? (part, offset) => renderText(part, sentence.start + offset) : undefined}
        text={sentence.text}
        unitId={`${paragraphId}:sentence-${sentence.index}`}
      />,
    );
    cursor = sentence.end;
  }

  if (cursor < text.length) parts.push(<span key={`${paragraphId}-tail-${cursor}`}>{text.slice(cursor)}</span>);
  return parts;
}
