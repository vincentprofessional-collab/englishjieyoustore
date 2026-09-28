"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { NewConceptBook } from "@/lib/new-concept";

export function NewConceptHome({ books }: { books: NewConceptBook[] }) {
  const searchParams = useSearchParams();
  const requestedUnit = Number(searchParams.get("unit"));
  const requestedBookCode = searchParams.get("book");
  const selectedBook = books.find((book) => book.bookCode === requestedBookCode) ?? books[0]!;
  const [activeUnit, setActiveUnit] = useState(1);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const unitCount = Math.max(1, Math.ceil(Math.max(...selectedBook.lessons.map((lesson) => lesson.lessonNo)) / 24));

  useEffect(() => {
    if (requestedUnit >= 1 && requestedUnit <= unitCount) {
      setActiveUnit(requestedUnit);
    } else {
      setActiveUnit(1);
    }
  }, [requestedUnit, selectedBook.bookCode, unitCount]);
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
          <div className="bbc-year-panel new-concept-unit-panel">
            <div className="new-concept-book-selector" aria-label="选择新概念册数">
              {books.map((book) => (
                <Link
                  aria-current={book.bookCode === selectedBook.bookCode ? "page" : undefined}
                  className={`new-concept-book-chip ${book.bookCode === selectedBook.bookCode ? "active" : ""}`}
                  href={`/new-concept?book=${book.bookCode}&unit=1`}
                  key={book.bookCode}
                >
                  {book.title} · {book.edition}
                </Link>
              ))}
            </div>
            <nav className="new-concept-unit-selector" aria-label="选择单元">
              {units.map((unit) => (
                <button
                  aria-pressed={unit.unit === activeUnit}
                  className={unit.unit === activeUnit ? "active" : ""}
                  key={unit.unit}
                  onClick={() => setActiveUnit(unit.unit)}
                  type="button"
                >
                  Unit {unit.unit}
                </button>
              ))}
            </nav>
            <div className="bbc-article-list new-concept-lesson-list">
              {selectedUnit.lessons.map((lesson) => (
                <div className="bbc-article-card new-concept-lesson-card" key={lesson.id}>
                  <Link className="bbc-article-card-link" href={`/new-concept/${lesson.id}`}>
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
