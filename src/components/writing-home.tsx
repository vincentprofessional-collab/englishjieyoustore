import Link from "next/link";

export function WritingHome() {
  return (
    <section className="stack writing-home-page">
      <div className="writing-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>IELTS WRITING</h1>
        </div>
      </div>

      <div className="writing-mode-panel">
        <div className="writing-mode-grid">
          <Link className="writing-mode-card practice" href="/writing/practice">
            <span>Practice</span>
            <strong>练习</strong>
            <p>按 Task 和题型选题，自由计时。</p>
            <em>进入题库 →</em>
          </Link>
          <Link className="writing-mode-card mock" href="/writing/mock">
            <span>Mock Test</span>
            <strong>模考</strong>
            <p>Task 1 + Task 2，进入即开始 60 分钟倒计时。</p>
            <em>开始完整模考 →</em>
          </Link>
        </div>
      </div>

      <div className="writing-resource-panel">
        <h2 className="writing-special-training-title">专项训练</h2>
        <div className="writing-resource-grid">
          <Link href="/writing/task1-vocabulary">
            <strong><span>TASK 1</span> 必备词汇及翻译训练</strong>
          </Link>
          <article>
            <strong><span>TASK 2</span> 场景词汇及翻译训练</strong>
          </article>
          <article>
            <strong>写作常用逻辑转换词汇</strong>
          </article>
        </div>
      </div>
    </section>
  );
}
