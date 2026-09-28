import { BBC_ARTICLES, getBbcArticleById } from "@/lib/articles/bbc";
import {
  getNewConceptArticleTextBlocks,
  getNewConceptLessonById,
  NEW_CONCEPT_LESSONS,
} from "@/lib/new-concept";
import { READING_TESTS, getReadingTest } from "@/lib/ielts/reading";
import { getRawReadingParagraphs } from "@/lib/ielts/reading-article-text";
import type {
  ArticleInlineSourceDocument,
  ArticleInlineSourceSummary,
  ArticleInlineSourceType,
} from "@/lib/article-inline-annotations";
import { splitArticleSentences } from "@/lib/article-inline-annotations";

export function getArticleInlineSourceCatalog(
  sourceType: ArticleInlineSourceType,
): ArticleInlineSourceSummary[] {
  if (sourceType === "bbc") {
    return BBC_ARTICLES.map((article) => ({
      href: `/articles/${article.id}`,
      id: article.id,
      label: `${article.year} · ${article.id}`,
      title: article.title,
    }));
  }

  if (sourceType === "new-concept") {
    return NEW_CONCEPT_LESSONS.map((lesson) => ({
      href: `/new-concept/${lesson.id}`,
      id: lesson.id,
      label: `Lesson ${lesson.lessonNo}`,
      title: lesson.title,
    }));
  }

  return READING_TESTS.map((test) => ({
    href: `/reading/practice/${test.id}`,
    id: test.id,
    label: `${test.bookTitle} · Test ${test.testNo}`,
    title: test.title,
  }));
}

export function getArticleInlineSourceDocument(
  sourceType: ArticleInlineSourceType,
  sourceId: string,
): ArticleInlineSourceDocument | null {
  if (sourceType === "bbc") {
    const article = getBbcArticleById(sourceId);
    if (!article) return null;
    return {
      href: `/articles/${article.id}`,
      id: article.id,
      title: article.title,
      units: article.body.flatMap((paragraph, paragraphIndex) =>
        splitArticleSentences(paragraph).map((sentence) => ({
          id: `paragraph-${paragraphIndex}:sentence-${sentence.index}`,
          label: `正文 · 第 ${paragraphIndex + 1} 段 · 第 ${sentence.index + 1} 句`,
          text: sentence.text,
        })),
      ),
    };
  }

  if (sourceType === "new-concept") {
    const lesson = getNewConceptLessonById(sourceId);
    if (!lesson) return null;
    return {
      href: `/new-concept/${lesson.id}`,
      id: lesson.id,
      title: `Lesson ${lesson.lessonNo} · ${lesson.title}`,
      units: getNewConceptArticleTextBlocks(lesson).flatMap((block, paragraphIndex) =>
        splitArticleSentences(block.english).map((sentence) => ({
          id: `paragraph-${paragraphIndex}:sentence-${sentence.index}`,
          label: `正文 · 第 ${paragraphIndex + 1} 段 · 第 ${sentence.index + 1} 句`,
          text: sentence.text,
        })),
      ),
    };
  }

  const test = getReadingTest(sourceId);
  if (!test) return null;
  const units = test.parts.flatMap((part) =>
    part.sections.flatMap((section) =>
      section.paragraphs.flatMap((paragraph, paragraphIndex) => {
        const displayParagraphs = section.format === "pre"
          ? getRawReadingParagraphs(paragraph, part.title, part.subtitle)
          : [paragraph];

        return displayParagraphs.flatMap((displayParagraph, displayIndex) => {
          const displayedParagraphIndex = section.format === "pre" ? displayIndex : paragraphIndex;
          return splitArticleSentences(displayParagraph).map((sentence) => ({
            id: `${part.id}:${section.id}:${paragraphIndex}:${displayedParagraphIndex}:sentence-${sentence.index}`,
            label: `${part.label} · ${section.id} · 第 ${displayedParagraphIndex + 1} 段 · 第 ${sentence.index + 1} 句`,
            text: sentence.text,
          }));
        });
      }),
    ),
  );

  return {
    href: `/reading/practice/${test.id}`,
    id: test.id,
    title: `${test.bookTitle} · ${test.title}`,
    units,
  };
}
