import Link from "next/link";
import type { ManagedPageContent } from "@/lib/content/page-content";

function renderHomeTitle(title: string) {
  const highlight = "打开";
  const index = title.indexOf(highlight);

  if (index === -1) {
    return title;
  }

  return (
    <>
      {title.slice(0, index)}
      <em>{highlight}</em>
      {title.slice(index + highlight.length)}
    </>
  );
}

export function HomeStyleLab({ content }: { content: ManagedPageContent }) {
  return (
    <div className="home-style-lab home-simple">
      <section className="home-hero-panel" aria-label="英文解忧杂货铺首页介绍">
        <div className="home-hero-copy">
          <span className="home-kicker">{content.eyebrow}</span>
          <h1>{renderHomeTitle(content.title)}</h1>
          <p>{content.summary}</p>
          <div className="home-hero-actions">
            {content.primaryLabel && content.primaryHref ? (
              <Link className="home-primary-action" href={content.primaryHref}>
                {content.primaryLabel}
                <span aria-hidden="true">↗</span>
              </Link>
            ) : null}
            {content.secondaryLabel && content.secondaryHref ? (
              <Link className="home-secondary-action" href={content.secondaryHref}>
                {content.secondaryLabel}
                <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>
          <div className="home-proof-row" aria-label="平台学习内容">
            <span>
              <strong>4</strong>
              雅思单项
            </span>
            <span>
              <strong>6+</strong>
              学习模块
            </span>
            <span>
              <strong>1</strong>
              条清晰路径
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
