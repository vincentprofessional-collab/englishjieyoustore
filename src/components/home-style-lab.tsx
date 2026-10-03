import Link from "next/link";
import { GuideBoard } from "@/components/guide-board";
import {
  getManagedPageItemClassName,
  type ManagedPageContent,
} from "@/lib/content/page-content";
import type { GuidePost } from "@/lib/guide/posts";

function renderHomeTitle(title: string) {
  const highlight = "打开";
  const index = title.indexOf(highlight);

  if (index === -1) {
    return title;
  }

  return (
    <>
      {title.slice(0, index)}
      <em style={{ color: "inherit" }}>{highlight}</em>
      {title.slice(index + highlight.length)}
    </>
  );
}

export function HomeStyleLab({
  content,
  initialPosts,
  initialPostCount,
}: {
  content: ManagedPageContent;
  initialPosts?: GuidePost[];
  initialPostCount?: number;
}) {
  const items = content.items.filter((item) => item.enabled);

  return (
    <div className="home-style-lab home-simple">
      <section className="home-hero-panel home-announcement-panel" aria-label="英文解忧杂货铺首页介绍">
        <div className="home-hero-copy">
          <span className="home-announcement-label">公告栏</span>
          <span
            className="home-kicker"
            style={{
              color: content.eyebrowColor,
              fontSize: `${content.eyebrowFontSize ?? 13}px`,
            }}
          >
            {content.eyebrow}
          </span>
          <h1
            style={{
              color: content.titleColor,
              fontSize: `${content.titleFontSize ?? 72}px`,
            }}
          >
            {renderHomeTitle(content.title)}
          </h1>
          <p
            style={{
              color: content.summaryColor,
              fontSize: `${content.summaryFontSize ?? 18}px`,
            }}
          >
            {content.summary}
          </p>
        </div>
      </section>

      <section aria-labelledby="home-updates-title" className="home-mobile-updates-heading">
        <span>ANNOUNCEMENTS · POSTS</span>
        <h2 id="home-updates-title">网站公告与帖子</h2>
      </section>

      <GuideBoard compact hideHeading hidePostChrome homeLanding initialExpanded={false} initialPostCount={initialPostCount} initialPosts={initialPosts} placementPath="/" postLimit={50} />

      {items.length ? (
        <section className="managed-page-grid" aria-label="学习模块">
          {items.map((item, index) => (
            <Link
              className={getManagedPageItemClassName(
                item,
                index,
                `writing-mode-card ${index % 2 === 0 ? "practice" : "mock"}`,
              )}
              href={item.href || "/"}
              key={item.id}
            >
              <span
                style={{
                  color: item.eyebrowColor,
                  fontSize: `${item.eyebrowFontSize ?? 12}px`,
                }}
              >
                {item.eyebrow}
              </span>
              <strong
                style={{
                  color: item.titleColor,
                  fontSize: `${item.titleFontSize ?? 24}px`,
                }}
              >
                {item.title}
              </strong>
              <p
                style={{
                  color: item.descriptionColor,
                  fontSize: `${item.descriptionFontSize ?? 15}px`,
                }}
              >
                {item.description}
              </p>
              {item.actionLabel ? (
                <em
                  style={{
                    color: item.actionLabelColor,
                    fontSize: `${item.actionLabelFontSize ?? 15}px`,
                  }}
                >
                  {item.actionLabel}
                </em>
              ) : null}
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
