import Link from "next/link";
import { CAMBRIDGE_BOOKS } from "@/lib/ielts/cambridge-books";
import { getListeningSections, type ListeningSectionSummary } from "@/lib/ielts/listening";

export const dynamic = "force-dynamic";

const IELTS_LISTENING_PARTS = [1, 2, 3, 4];
const IELTS_LISTENING_TESTS = [1, 2, 3, 4];

function sortSections(a: ListeningSectionSummary, b: ListeningSectionSummary) {
  if (a.testNo !== b.testNo) {
    return a.testNo - b.testNo;
  }

  return a.sectionNo - b.sectionNo;
}

export default async function ListeningPracticeIndexPage() {
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

        <div className="listening-practice-book-list">
          {CAMBRIDGE_BOOKS.map((book) => {
            const bookSections = [...(sectionsByBook.get(book.code) ?? [])].sort(sortSections);

            return (
              <article
                className={`listening-practice-book-row ${
                  bookSections.length > 0 ? "available" : "locked"
                }`}
                key={book.code}
              >
                <div className="listening-book-label">
                  <strong>{book.shortTitle}</strong>
                  <span>{book.title}</span>
                  <small>{bookSections.length > 0 ? "可练习" : "待导入"}</small>
                </div>

                <div className="listening-test-grid">
                  {IELTS_LISTENING_TESTS.map((testNo) => {
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
                              <Link
                                aria-label={`${book.shortTitle} Test ${testNo} Part ${partNo}`}
                                className="listening-part-box available"
                                href={`/listening/${partSection.id}?mode=practice`}
                                key={partNo}
                              >
                                Part {partNo}
                              </Link>
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
      </div>
    </section>
  );
}
