"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CAMBRIDGE_BOOKS } from "@/lib/ielts/cambridge-books";
import type { ListeningSectionSummary } from "@/lib/ielts/listening";

const IELTS_LISTENING_PARTS = [1, 2, 3, 4];
const CAMBRIDGE_LISTENING_TESTS = [1, 2, 3, 4];
const JIUFEN_LISTENING_TESTS = [1, 2, 3, 4, 5, 6];
const JIUFEN_BOOKS = Array.from({ length: 8 }, (_, index) => {
  const bookNo = index + 1;
  return {
    code: `jiufen-${bookNo}`,
    number: bookNo,
    shortTitle: `9FDR${bookNo}`,
    title: `九分达人听力 ${bookNo}`,
  };
});
const LISTENING_BOOKS = [...CAMBRIDGE_BOOKS, ...JIUFEN_BOOKS];

function isJiufenBook(bookCode: string) {
  return bookCode.startsWith("jiufen-");
}

function sortSections(a: ListeningSectionSummary, b: ListeningSectionSummary) {
  if (a.testNo !== b.testNo) {
    return a.testNo - b.testNo;
  }

  return a.sectionNo - b.sectionNo;
}

export function ListeningPracticeLibrary({
  sections,
  bookScope = "all",
  showBookLabels = true,
  showBookMarker = false,
}: {
  sections: ListeningSectionSummary[];
  bookScope?: "all" | "jiufen";
  showBookLabels?: boolean;
  showBookMarker?: boolean;
}) {
  const [selectedSection, setSelectedSection] = useState<ListeningSectionSummary | null>(null);
  const sectionsByBook = useMemo(() => {
    const grouped = new Map<string, ListeningSectionSummary[]>();

    for (const section of sections) {
      grouped.set(section.bookCode, [...(grouped.get(section.bookCode) ?? []), section]);
    }

    return grouped;
  }, [sections]);

  const visibleBooks = useMemo(
    () =>
      bookScope === "jiufen"
        ? LISTENING_BOOKS.filter((book) => isJiufenBook(book.code))
        : LISTENING_BOOKS,
    [bookScope],
  );

  useEffect(() => {
    if (!selectedSection) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedSection(null);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedSection]);

  const selectedBook = selectedSection
    ? LISTENING_BOOKS.find((book) => book.code === selectedSection.bookCode)
    : null;
  const mockStartSection = selectedSection
    ? (sectionsByBook.get(selectedSection.bookCode) ?? []).find(
        (section) =>
          section.testNo === selectedSection.testNo &&
          section.sectionNo === 1 &&
          section.questionCount > 0,
      )
    : null;

  return (
    <>
      <div className="listening-practice-book-list">
        {visibleBooks.map((book) => {
          const bookSections = [...(sectionsByBook.get(book.code) ?? [])].sort(sortSections);
          const testNumbers = isJiufenBook(book.code)
            ? JIUFEN_LISTENING_TESTS
            : CAMBRIDGE_LISTENING_TESTS;

          return (
            <article
              className={`listening-practice-book-row ${
                isJiufenBook(book.code) ? "jiufen-book-row" : ""
              } ${
                !showBookLabels ? "no-book-label" : ""
              } ${
                bookSections.length > 0 ? "available" : "locked"
              }`}
              key={book.code}
            >
              {showBookLabels ? (
                <div className="listening-book-label">
                  <strong>{book.shortTitle}</strong>
                  <span>{book.title}</span>
                  <small>{bookSections.length > 0 ? "可练习" : "待导入"}</small>
                </div>
              ) : null}

              {showBookMarker ? (
                <div className="listening-book-marker">九分达人 {book.number}</div>
              ) : null}

              <div className="listening-test-grid">
                {testNumbers.map((testNo) => {
                  const testSections = bookSections.filter(
                    (section) => section.testNo === testNo,
                  );

                  return (
                    <section
                      className={`listening-test-cluster ${
                        testSections.length > 0 ? "available" : "locked"
                      }`}
                      key={testNo}
                    >
                      <strong className="listening-test-title">Test {testNo}</strong>
                      <div className="listening-part-link-grid">
                        {IELTS_LISTENING_PARTS.map((partNo) => {
                          const partSection = testSections.find(
                            (section) => section.sectionNo === partNo,
                          );

                          return partSection ? (
                            <button
                              aria-haspopup="dialog"
                              aria-label={`${book.shortTitle} Test ${testNo} Part ${partNo}`}
                              className="listening-part-box available"
                              key={partNo}
                              onClick={() => setSelectedSection(partSection)}
                              type="button"
                            >
                              Part {partNo}
                            </button>
                          ) : (
                            <span className="listening-part-box locked" key={partNo}>
                              Part {partNo}
                            </span>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {selectedSection ? (
        <div
          className="listening-launch-overlay"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedSection(null);
            }
          }}
        >
          <section
            aria-labelledby="listening-launch-title"
            aria-modal="true"
            className="listening-launch-dialog"
            role="dialog"
          >
            <button
              aria-label="关闭模式选择"
              className="listening-launch-close"
              onClick={() => setSelectedSection(null)}
              type="button"
            >
              ×
            </button>
            <span>SELECT MODE · 选择模式</span>
            <h2 id="listening-launch-title">
              {selectedBook?.shortTitle ?? selectedSection.bookCode.toUpperCase()} · Test {selectedSection.testNo} · Part {selectedSection.sectionNo}
            </h2>
            <p>选择本次进入方式。练习只打开当前 Part，模考将从同一套 Test 的 Part 1 开始。</p>

            <div className="listening-launch-actions">
              <Link
                className="listening-launch-option practice"
                href={`/listening/${selectedSection.id}?mode=practice`}
              >
                <small>Practice</small>
                <strong>练习</strong>
                <span>自主播放、查看学习工具，完成当前 Part。</span>
              </Link>

              {mockStartSection ? (
                <Link
                  className="listening-launch-option mock"
                  href={`/listening/${mockStartSection.id}?mode=mock`}
                >
                  <small>Mock Test</small>
                  <strong>模考</strong>
                  <span>从 Part 1 开始，按正式考试流程完成整套 Test。</span>
                </Link>
              ) : (
                <div className="listening-launch-option mock disabled" aria-disabled="true">
                  <small>Mock Test</small>
                  <strong>模考</strong>
                  <span>这套 Test 暂未具备完整模考内容。</span>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
