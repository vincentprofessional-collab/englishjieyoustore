"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { NewConceptBook } from "@/lib/new-concept";

export function NewConceptHome({ books }: { books: NewConceptBook[] }) {
  const searchParams = useSearchParams();
  const requestedUnit = Number(searchParams.get("unit"));
  const requestedBookCode = searchParams.get("book");
  const edition = searchParams.get("edition") === "uk" ? "uk" : "us";
  const selectedBook = books.find((book) => book.bookCode === requestedBookCode) ?? books[0]!;
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const unitCount = Math.max(1, Math.ceil(Math.max(...selectedBook.lessons.map((lesson) => lesson.lessonNo)) / 24));
  const activeUnit = requestedUnit >= 1 && requestedUnit <= unitCount ? requestedUnit : 1;
  const units = useMemo(
    () =>
      Array.from({ length: unitCount }, (_, index) => {
        const unit = index + 1;
        const start = index * 24 + 1;
        const end = start + 23;
        return {
          end,
          lessons: selectedBook.lessons.filter(
            (lesson) => lesson.lessonNo >= start && lesson.lessonNo <= end,
          ),
          start,
          unit,
        };
      }),
    [selectedBook.lessons, unitCount],
  );
  const selectedUnit = units.find((unit) => unit.unit === activeUnit) ?? units[0]!;
  const getDirectoryHref = (bookCode = selectedBook.bookCode, nextEdition = edition, unit = activeUnit) =>
    `/new-concept?book=${encodeURIComponent(bookCode)}&edition=${nextEdition}&unit=${unit}`;

  function toggleLessonSelection(lessonId: string) {
    setSelectedLessons((current) =>
      current.includes(lessonId)
        ? current.filter((id) => id !== lessonId)
        : [...current, lessonId],
    );
  }

  return (
    <section className="stack bbc-home-page new-concept-home-page">
      <main className="new-concept-directory-main">
          <header className="new-concept-mobile-heading">
            <h1>新概念英语</h1>
            <span>{selectedBook.title}</span>
          </header>
          <section aria-label="新概念英语课程筛选" className="new-concept-mobile-controls">
            <div className="new-concept-mobile-control-group">
              <span className="new-concept-mobile-control-label">教材</span>
              <nav aria-label="选择教材" className="new-concept-book-selector">
                {books.map((book, index) => (
                  <Link
                    aria-current={book.bookCode === selectedBook.bookCode ? "page" : undefined}
                    className={`new-concept-book-chip${book.bookCode === selectedBook.bookCode ? " active" : ""}`}
                    href={getDirectoryHref(book.bookCode, edition, 1)}
                    key={book.bookCode}
                  >
                    新概念英语 {index + 1}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="new-concept-mobile-control-group">
              <span className="new-concept-mobile-control-label">发音</span>
              <nav aria-label="选择发音" className="new-concept-edition-selector">
                {(["uk", "us"] as const).map((voice) => (
                  <Link
                    aria-current={voice === edition ? "true" : undefined}
                    className={voice === edition ? "active" : ""}
                    href={getDirectoryHref(selectedBook.bookCode, voice, activeUnit)}
                    key={voice}
                  >
                    {voice === "uk" ? "英音" : "美音"}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="new-concept-mobile-control-group">
              <span className="new-concept-mobile-control-label">单元</span>
              <nav aria-label="选择单元" className="new-concept-unit-selector">
                {units.map((unit) => (
                  <Link
                    aria-current={unit.unit === activeUnit ? "page" : undefined}
                    className={`new-concept-book-chip${unit.unit === activeUnit ? " active" : ""}`}
                    href={getDirectoryHref(selectedBook.bookCode, edition, unit.unit)}
                    key={unit.unit}
                  >
                    Unit {unit.unit}
                  </Link>
                ))}
              </nav>
            </div>
          </section>
          <div className="bbc-year-panel new-concept-unit-panel">
            <div className="bbc-article-list new-concept-lesson-list">
              {selectedUnit.lessons.map((lesson) => (
                <div className="bbc-article-card new-concept-lesson-card" key={lesson.id}>
                  <Link className="bbc-article-card-link" href={`/new-concept/${lesson.id}?book=${selectedBook.bookCode}&unit=${activeUnit}&edition=${edition}`}>
                    <span className="new-concept-lesson-no">
                      {String(lesson.lessonNo).padStart(3, "0")}
                    </span>
                    <strong>
                      {lesson.title}
                      {lesson.titleChinese ? ` ${lesson.titleChinese}` : ""}
                    </strong>
                  </Link>
                  <button
                    aria-label={`${selectedLessons.includes(lesson.id) ? "取消选择" : "选择"} Lesson ${lesson.lessonNo}`}
                    aria-pressed={selectedLessons.includes(lesson.id)}
                    className="bbc-article-select"
                    onClick={() => toggleLessonSelection(lesson.id)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={selectedLessons.includes(lesson.id) ? "choice-dot selected" : "choice-dot"}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
      </main>
    </section>
  );
}
