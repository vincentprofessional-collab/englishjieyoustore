"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listExamContentOverrides } from "@/lib/exam-content/overrides";

export type ReadingTestSummary = {
  id: string;
  bookCode: string;
  bookTitle: string;
  testNo: number;
  displayTestNo?: number;
  title: string;
};

const IELTS_READING_TESTS = [1, 2, 3, 4];
const READING_BOOKS = Array.from({ length: 21 }, (_, index) => ({
  code: "cambridge-" + (index + 1),
  shortTitle: "CI" + (index + 1),
  title: "剑桥雅思 " + (index + 1),
}));

export function ReadingLibraryClient({ mode, initialTests }: { mode: "mock" | "practice"; initialTests: ReadingTestSummary[] }) {
  const [tests, setTests] = useState(initialTests);

  useEffect(() => {
    let cancelled = false;
    async function loadOverrides() {
      const { overrides, error } = await listExamContentOverrides("ielts");
      if (cancelled || error || !overrides.length) return;
      const byId = new Map(overrides.map((item) => [item.bank_id, item]));
      const knownIds = new Set(initialTests.map((test) => test.id));
      const updatedTests = initialTests.flatMap((test) => {
        const saved = byId.get(test.id);
        if (saved?.is_deleted) return [];
        const content = saved?.bank_data as Record<string, unknown> | null;
        if (!content) return [test];
        return [{
          ...test,
          bookCode: typeof content.bookCode === "string" ? content.bookCode : test.bookCode,
          bookTitle: typeof content.bookTitle === "string" ? content.bookTitle : test.bookTitle,
          testNo: typeof content.testNo === "number" ? content.testNo : test.testNo,
          displayTestNo: typeof content.displayTestNo === "number" ? content.displayTestNo : test.displayTestNo,
          title: typeof content.title === "string" ? content.title : test.title,
        }];
      });
      const addedTests = overrides.flatMap((saved) => {
        const content = saved.bank_data as Record<string, unknown> | null;
        if (knownIds.has(saved.bank_id) || saved.is_deleted || !content || !Array.isArray(content.parts)) return [];
        return [{
          id: saved.bank_id,
          bookCode: typeof content.bookCode === "string" ? content.bookCode : "custom-" + saved.bank_id,
          bookTitle: typeof content.bookTitle === "string" ? content.bookTitle : "自定义阅读题库",
          testNo: typeof content.testNo === "number" ? content.testNo : 1,
          displayTestNo: typeof content.displayTestNo === "number" ? content.displayTestNo : undefined,
          title: typeof content.title === "string" ? content.title : saved.title || saved.bank_id,
        }];
      });
      setTests([...updatedTests, ...addedTests]);
    }
    void loadOverrides();
    return () => { cancelled = true; };
  }, [initialTests]);

  const testsByBook = new Map<string, ReadingTestSummary[]>();
  for (const test of tests) {
    testsByBook.set(test.bookCode, [...(testsByBook.get(test.bookCode) ?? []), test]);
  }
  const knownBookCodes = new Set(READING_BOOKS.map((book) => book.code));
  const customBooks = [...new Set(tests.map((test) => test.bookCode).filter((code) => !knownBookCodes.has(code)))].map((code) => {
    const test = tests.find((item) => item.bookCode === code)!;
    return { code, shortTitle: "自定义", title: test.bookTitle };
  });
  const books = [...READING_BOOKS, ...customBooks];

  return (
    <section className="stack ielts-module-page listening-library-page reading-library-page">
      <div className="listening-library-panel reading-library-panel">
        <div className="listening-library-head">
          <div><span>{mode === "mock" ? "mock test" : "practice"}</span><strong>{mode === "mock" ? "阅读模考题库" : "阅读逐篇练习"}</strong></div>
        </div>
        <div className="listening-practice-book-list">
          {books.map((book) => {
            const bookTests = [...(testsByBook.get(book.code) ?? [])].sort((a, b) => a.testNo - b.testNo);
            const isAvailable = bookTests.length > 0;
            return (
              <article className={"listening-practice-book-row reading-practice-book-row " + (isAvailable ? "available" : "locked")} key={book.code}>
                <div className="listening-book-label"><strong>{book.shortTitle}</strong><span>{book.title}</span></div>
                <div className="listening-test-grid reading-test-grid">
                  {IELTS_READING_TESTS.map((testNo) => {
                    const test = bookTests.find((item) => item.testNo === testNo);
                    const displayNo = test?.displayTestNo ?? (book.code === "cambridge-12" ? testNo + 4 : testNo);
                    return test ? (
                      <Link aria-label={book.title + " Test " + displayNo + (mode === "mock" ? " 模考" : " 练习")} className="reading-test-link available" href={"/reading/" + mode + "/" + test.id} key={testNo}>
                        <strong>Test {displayNo}</strong>
                      </Link>
                    ) : (
                      <span className="reading-test-link locked" key={testNo}><strong>Test {displayNo}</strong><span>待导入</span></span>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
