"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { NewConceptBook } from "@/lib/new-concept";

export function NewConceptHome({ book }: { book: NewConceptBook }) {
  const searchParams = useSearchParams();
  const requestedUnit = Number(searchParams.get("unit"));
  const [activeUnit, setActiveUnit] = useState(
    requestedUnit >= 1 && requestedUnit <= 6 ? requestedUnit : 1,
  );

  useEffect(() => {
    if (requestedUnit >= 1 && requestedUnit <= 6) {
      setActiveUnit(requestedUnit);
    }
  }, [requestedUnit]);
  const units = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const unit = index + 1;
        const start = index * 24 + 1;
        const end = start + 23;
        return {
          end,
          lessons: book.lessons.filter(
            (lesson) => lesson.lessonNo >= start && lesson.lessonNo <= end,
          ),
          start,
          unit,
        };
      }),
    [book.lessons],
  );
  const selectedUnit = units.find((unit) => unit.unit === activeUnit) ?? units[0];

  return (
    <section className="stack bbc-home-page new-concept-home-page">
      <main className="new-concept-directory-main">
          <div className="bbc-year-panel new-concept-unit-panel">
            <div className="bbc-article-list new-concept-lesson-list">
              {selectedUnit.lessons.map((lesson) => (
                <Link
                  className="bbc-article-card new-concept-lesson-card"
                  href={`/new-concept/${lesson.id}`}
                  key={lesson.id}
                >
                  <span className="new-concept-lesson-no">
                    {String(lesson.lessonNo).padStart(3, "0")}
                  </span>
                  <strong>
                    {lesson.title}
                    {lesson.titleChinese ? ` ${lesson.titleChinese}` : ""}
                  </strong>
                </Link>
              ))}
            </div>
          </div>
      </main>
    </section>
  );
}
