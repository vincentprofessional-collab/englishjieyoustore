import Link from "next/link";

export default async function ListeningPage() {
  return (
    <section className="stack ielts-module-page listening-home-page">
      <div className="writing-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>IELTS LISTENING</h1>
        </div>
      </div>

      <div className="writing-mode-panel listening-mode-panel">
        <div className="writing-mode-grid">
          <Link className="writing-mode-card practice" href="/listening/practice">
            <span>Practice</span>
            <strong>练习</strong>
            <p>按 CI 题册自上而下选择 Part，进入后直接显示该 Part 的题目与音频。</p>
            <em>进入练习列表 →</em>
          </Link>
          <Link className="writing-mode-card mock" href="/listening/mock">
            <span>Mock Test</span>
            <strong>模考</strong>
            <p>按 CI 题册选择完整模考入口，进入正式听力考试界面。</p>
            <em>进入模考列表 →</em>
          </Link>
        </div>
      </div>
    </section>
  );
}
