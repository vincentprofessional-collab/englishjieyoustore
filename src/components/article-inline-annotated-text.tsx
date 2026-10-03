import type { CSSProperties, ReactNode } from "react";
import {
  splitArticleSentences,
  type ArticleInlineAnnotation,
} from "@/lib/article-inline-annotations";

function annotationRoleColor(label: string) {
  if (label.includes("主语")) return "var(--bbc-syntax-role-subject, #245d7b)";
  if (label.includes("谓语")) return "var(--bbc-syntax-role-predicate, #a32c1e)";
  if (label.includes("宾语")) return "var(--bbc-syntax-role-object, #1f5c8b)";
  if (label.includes("表语")) return "var(--bbc-syntax-role-predicative, #6b3fa0)";
  if (label.includes("状语")) return "var(--bbc-syntax-role-adverbial, #0f6e7a)";
  if (label.includes("定语")) return "var(--bbc-syntax-role-attributive, #8a6a2f)";
  return "var(--bbc-syntax-role-other, #6e6a63)";
}

export function ArticleInlineAnnotatedText({
  annotations,
  matchSyntaxRoleColors = false,
  renderText,
  showPartOfSpeech = true,
  showComponents = true,
  text,
  unitId,
}: {
  annotations: ArticleInlineAnnotation[];
  matchSyntaxRoleColors?: boolean;
  renderText?: (text: string, characterOffset: number) => ReactNode;
  showPartOfSpeech?: boolean;
  showComponents?: boolean;
  text: string;
  unitId: string;
}) {
  const matches = annotations
    .filter((item) => item.unitId === unitId && item.start >= 0 && item.end <= text.length && text.slice(item.start, item.end) === item.selectedText)
    .sort((left, right) => left.start - right.start);

  if (!matches.length || (!showComponents && !showPartOfSpeech)) return renderText ? renderText(text, 0) : text;

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
      <span
        className={`article-inline-mark${showComponents ? ` article-inline-mark--${item.style}` : ""}`}
        key={item.id || `${unitId}-${index}`}
        style={matchSyntaxRoleColors
          ? { "--article-inline-role-color": annotationRoleColor(item.label) } as CSSProperties
          : undefined}
      >
        {showPartOfSpeech && item.partOfSpeech ? <span className="article-inline-mark-pos">{item.partOfSpeech}</span> : null}
        <span className="article-inline-mark-text">
          {renderText ? renderText(selectedText, item.start) : selectedText}
        </span>
        {showComponents ? <span aria-label={`注释：${item.label}`} className="article-inline-mark-label">{item.label}</span> : null}
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
