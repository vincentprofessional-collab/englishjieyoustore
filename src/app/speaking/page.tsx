import type { Metadata } from "next";
import { getPublishedPageContent } from "@/lib/content/page-content";
import { speakingParts } from "@/lib/ielts/speaking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "雅思口语真题与高分范文｜英文解忧杂货铺",
  description:
    "按 Part 1、Part 2、Part 3 分类学习雅思口语真题、高分思路、BBC 词汇与学生口吻范文。",
};

export default async function SpeakingPage() {
  const content = await getPublishedPageContent("speaking");
  const totalQuestions = speakingParts.reduce((total, part) => total + part.count, 0);

  return (
    <section className="stack ielts-module-page speaking-home-page">
      <div className="writing-hero-panel ielts-module-hero speaking-hero-panel">
        <div className="writing-hero-copy">
          <span className="speaking-hero-kicker">IELTS · SPEAK WITH YOUR OWN VOICE</span>
          <h1>{content.title}</h1>
          <p>
            不是背答案，而是把答案说活。按 Part 1 / 2 / 3
            整理历年真题，用真实细节、自然搭配和清晰逻辑练出自己的表达。
          </p>
        </div>
        <div className="speaking-hero-stats" aria-label="口语题库统计">
          <strong>{totalQuestions}</strong>
          <span>道合并去重真题</span>
          <small>覆盖 2020—2026 · 首版 3 篇高分示范</small>
        </div>
      </div>

      <section className="speaking-index-panel" aria-labelledby="speaking-index-title">
        <header className="speaking-section-heading">
          <div>
            <span>QUESTION ARCHIVE</span>
            <h2 id="speaking-index-title">按考试 Part 分类</h2>
          </div>
          <p>首版先完成每个 Part 一篇，后续按同一结构继续扩充。</p>
        </header>

        <nav className="speaking-part-index" aria-label="雅思口语 Part 导航">
          {speakingParts.map((part) => (
            <a href={`#${part.id}`} key={part.id}>
              <span>{part.label}</span>
              <strong>{part.count}</strong>
              <small>{part.timing}</small>
              <em aria-hidden="true">↓</em>
            </a>
          ))}
        </nav>
      </section>

      {speakingParts.map((part, partIndex) => (
        <article className="speaking-topic-panel" id={part.id} key={part.id}>
          <header className="speaking-topic-header">
            <div className="speaking-topic-number">
              <span>{String(partIndex + 1).padStart(2, "0")}</span>
              <strong>{part.label}</strong>
            </div>
            <div className="speaking-topic-meta">
              <span>{part.season}</span>
              <span>{part.category}</span>
              <span>{part.targetLength}</span>
            </div>
          </header>

          <section className="speaking-question-sheet" aria-labelledby={`${part.id}-title`}>
            <span>FEATURED QUESTION</span>
            <h2 id={`${part.id}-title`}>{part.title}</h2>
            <p>{part.titleZh}</p>
            <ol>
              {part.prompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ol>
          </section>

          <div className="speaking-learning-layout">
            <div className="speaking-learning-main">
              <section className="speaking-learning-block">
                <div className="speaking-block-title">
                  <span>01</span>
                  <h3>高分思路</h3>
                </div>
                <p>{part.approach}</p>
              </section>

              <section className="speaking-learning-block">
                <div className="speaking-block-title">
                  <span>02</span>
                  <h3>万能句型</h3>
                </div>
                <ul className="speaking-frame-list">
                  {part.frames.map((frame) => (
                    <li key={frame}>{frame}</li>
                  ))}
                </ul>
              </section>

              <section className="speaking-learning-block speaking-answer-block">
                <div className="speaking-block-title">
                  <span>04</span>
                  <h3>学生口吻高分范文</h3>
                </div>
                <div className="speaking-answer-copy">
                  {part.answer.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <footer>
                  <strong>Band 7.5–8.0 学习示范</strong>
                  <span>学习结构与表达，不建议逐字背诵。</span>
                </footer>
              </section>
            </div>

            <aside className="speaking-learning-aside">
              <section className="speaking-vocabulary-block">
                <div className="speaking-block-title">
                  <span>03</span>
                  <h3>BBC 词汇与短语</h3>
                </div>
                <p className="speaking-source-note">来自桌面 BBC 词汇库，仅保留本题真正好用的表达。</p>
                <dl>
                  {part.vocabulary.map((item) => (
                    <div key={item.phrase}>
                      <dt>{item.phrase}</dt>
                      <dd>
                        <strong>{item.meaning}</strong>
                        <span>{item.note}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="speaking-score-block">
                <div className="speaking-block-title">
                  <span>05</span>
                  <h3>IELTS 评分对照</h3>
                </div>
                <div className="speaking-score-list">
                  {part.scoreNotes.map((note) => (
                    <article key={note.code}>
                      <span>{note.code}</span>
                      <div>
                        <strong>{note.label}</strong>
                        <p>{note.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </div>

          <section className="speaking-archive-preview" aria-label={`${part.label} 历年真题示例`}>
            <header>
              <div>
                <span>FROM THE ARCHIVE</span>
                <h3>同类历年真题</h3>
              </div>
              <strong>本 Part 共 {part.count} 道</strong>
            </header>
            <div>
              {part.archive.map((item, index) => (
                <article key={item.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.title}</strong>
                  <small>{item.category}</small>
                  <small>{item.year}</small>
                </article>
              ))}
            </div>
          </section>
        </article>
      ))}
    </section>
  );
}
