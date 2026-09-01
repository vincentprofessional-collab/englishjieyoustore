import Link from "next/link";
import { CAMBRIDGE_BOOKS } from "@/lib/ielts/cambridge-books";
import { getListeningSections, type ListeningSectionSummary } from "@/lib/ielts/listening";

export const dynamic = "force-dynamic";

const IELTS_LISTENING_TESTS = [1, 2, 3, 4];

function sortSections(a: ListeningSectionSummary, b: ListeningSectionSummary) {
  if (a.testNo !== b.testNo) {
    return a.testNo - b.testNo;
  }

  return a.sectionNo - b.sectionNo;
}

export default async function ListeningMockIndexPage() {
  const { sections, error } = await getListeningSections();
  const sectionsByBook = new Map<string, ListeningSectionSummary[]>();

  for (const section of sections) {
    sectionsByBook.set(section.bookCode, [
      ...(sectionsByBook.get(section.bookCode) ?? []),
      section,
    ]);
  }

  return (
    <section className="stack ielts-module-page listening-library-page">
      <div className="writing-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>IELTS LISTENING</h1>
        </div>
      </div>

      <div className="listening-library-panel">
        <div className="listening-library-head">
          <Link className="back-link" href="/listening">
            ← 返回
          </Link>
        </div>

        {error ? <div className="notice danger">读取听力题库失败：{error}</div> : null}

        <div className="listening-mock-book-grid">
          {CAMBRIDGE_BOOKS.map((book) => {
            const bookSections = [...(sectionsByBook.get(book.code) ?? [])]
              .filter((section) => section.questionCount > 0)
              .sort(sortSections);

            return (
              <article
                className={`listening-mock-book-card ${
                  bookSections.length > 0 ? "available" : "locked"
                }`}
                key={book.code}
              >
                <strong>{book.shortTitle}</strong>
                <span>{book.title}</span>
                <div className="listening-mock-test-grid">
                  {IELTS_LISTENING_TESTS.map((testNo) => {
                    const firstSection = bookSections.find(
                      (section) => section.testNo === testNo && section.sectionNo === 1,
                    );

                    return firstSection ? (
                      <Link
                        aria-label={`${book.shortTitle} Test ${testNo} 模考`}
                        className="listening-mock-test-link available"
                        href={`/listening/${firstSection.id}?mode=mock`}
                        key={testNo}
                      >
                        Test {testNo}
                      </Link>
                    ) : (
                      <span className="listening-mock-test-link locked" key={testNo}>
                        Test {testNo}
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
