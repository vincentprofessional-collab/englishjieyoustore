export default function SpeakingPage() {
  const items = ["题目图片", "高分思路", "万能句型", "音频范文"];

  return (
    <section className="stack ielts-module-page speaking-home-page">
      <div className="writing-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>IELTS SPEAKING</h1>
        </div>
      </div>

      <div className="writing-mode-panel speaking-mode-panel">
        <div className="section-grid">
          {items.map((item) => (
            <article className="module large speaking-placeholder-card" key={item}>
              <strong>{item}</strong>
              <span>后台框架已预留，后续接入真实内容和权限开关。</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
