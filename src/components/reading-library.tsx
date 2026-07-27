import Link from "next/link";
import { CAMBRIDGE_BOOKS } from "@/lib/ielts/cambridge-books";
import { READING_TESTS, type ReadingTest } from "@/lib/ielts/reading";

const IELTS_READING_TESTS = [1, 2, 3, 4];

export function ReadingLibrary({ mode }: { mode: "mock" | "practice" }) {
  const testsByBook = new Map<string, ReadingTest[]>();

  for (const test of READING_TESTS) {
    testsByBook.set(test.bookCode, [
      ...(testsByBook.get(test.bookCode) ?? []),
      test,
    ]);
  }

  return (
    <section className="stack ielts-module-page listening-library-page reading-library-page">
      <div className="writing-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>IELTS READING</h1>
        </div>
      </div>

      <div className="listening-library-panel reading-library-panel">
        <div className="listening-library-head">
          <Link className="back-link" href="/reading">
            ← 返回
          </Link>
          <div>
            <span>{mode === "mock" ? "mock test" : "practice"}</span>
            <strong>{mode === "mock" ? "阅读模考题库" : "阅读逐篇练习"}</strong>
          </div>
        </div>

        <div className="listening-practice-book-list">
          {CAMBRIDGE_BOOKS.map((book) => {
            const bookTests = [...(testsByBook.get(book.code) ?? [])].sort(
              (a, b) => a.testNo - b.testNo,
            );
            const isAvailable = bookTests.length > 0;

            return (
              <article
                className={`listening-practice-book-row reading-practice-book-row ${
                  isAvailable ? "available" : "locked"
                }`}
                key={book.code}
              >
                <div className="listening-book-label">
                  <strong>{book.shortTitle}</strong>
                  <span>{book.title}</span>
                </div>

                <div className="listening-test-grid reading-test-grid">
                  {IELTS_READING_TESTS.map((testNo) => {
                    const test = bookTests.find((item) => item.testNo === testNo);

                    return test ? (
                      <Link
                        aria-label={`${book.title} Test ${testNo} ${mode === "mock" ? "模考" : "练习"}`}
                        className="reading-test-link available"
                        href={`/reading/${mode}/${test.id}`}
                        key={testNo}
                      >
                        <strong>Test {testNo}</strong>
                      </Link>
                    ) : (
                      <span className="reading-test-link locked" key={testNo}>
                        <strong>Test {testNo}</strong>
                        <span>待导入</span>
                      </span>
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
