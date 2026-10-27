import Link from "next/link";
import { READING_TESTS, type ReadingTest } from "@/lib/ielts/reading";

const IELTS_READING_TESTS = [1, 2, 3, 4];
function isReadingTestReady(test: ReadingTest) {
  return Boolean(test.source?.verified && test.source.sanitized && test.parts.length > 0 && test.parts.every((part) => part.source?.textVerified));
}

const READING_BOOKS = Array.from({ length: 18 }, (_, i) => {
  const bookNo = i + 4;
  return { code: `cambridge-${bookNo}`, shortTitle: `CI${bookNo}`, title: `剑桥雅思 ${bookNo}` };
});

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
      <div className="listening-library-panel reading-library-panel">
        <div className="listening-library-head">
          <div>
            <span>{mode === "mock" ? "mock test" : "practice"}</span>
            <strong>{mode === "mock" ? "阅读模考题库" : "阅读逐篇练习"}</strong>
          </div>
        </div>

        <div className="listening-practice-book-list">
          {READING_BOOKS.map((book) => {
            const bookTests = [...(testsByBook.get(book.code) ?? [])].sort(
              (a, b) => a.testNo - b.testNo,
            );
            const readyTests = bookTests.filter(isReadingTestReady);
            const isAvailable = readyTests.length > 0;

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
                    const isTextReady = Boolean(test && isReadingTestReady(test));
                    const displayNo = test?.displayTestNo ?? (book.code === "cambridge-12" ? testNo + 4 : testNo);

                    return test && isTextReady ? (
                      <Link
                        aria-label={`${book.title} Test ${displayNo} ${mode === "mock" ? "模考" : "练习"}`}
                        className="reading-test-link available"
                        href={`/reading/${mode}/${test.id}`}
                        key={testNo}
                      >
                        <strong>Test {displayNo}</strong>
                      </Link>
                    ) : (
                      <span aria-disabled="true" className="reading-test-link locked" key={testNo}>
                        <strong>Test {displayNo}</strong>
                        <span>{test ? "文字待核" : "待导入"}</span>
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
