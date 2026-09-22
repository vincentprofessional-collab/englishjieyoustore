import Link from "next/link";

export function ListeningCollectionEmpty({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="stack ielts-module-page listening-library-page">
      <div className="writing-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>IELTS LISTENING</h1>
        </div>
      </div>

      <div className="listening-library-panel">
        <div className="listening-library-head">
          <div>
            <span>{eyebrow}</span>
            <strong>{title}</strong>
          </div>
        </div>

        <div className="listening-collection-empty">
          <span>CONTENT QUEUE</span>
          <h2>{title}</h2>
          <p>当前数据库还没有这一分类的可发布题目。后续导入后会在这里按 Test 与 Part 展示，不会与剑桥雅思题目混排。</p>
          <Link href="/listening/practice">先练习剑桥雅思 →</Link>
        </div>
      </div>
    </section>
  );
}
