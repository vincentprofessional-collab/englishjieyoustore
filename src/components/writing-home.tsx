import Link from "next/link";
import {
  getManagedPageItemClassName,
  type ManagedPageContent,
  type ManagedPageItem,
} from "@/lib/content/page-content";

function WritingResource({ index, item }: { index: number; item: ManagedPageItem }) {
  const content = (
    <strong>
      {item.eyebrow ? <span>{item.eyebrow}</span> : null} {item.title}
    </strong>
  );
  const className = getManagedPageItemClassName(item, index, "");

  return item.href ? (
    <Link className={className} href={item.href}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

export function WritingHome({ content }: { content: ManagedPageContent }) {
  const primaryItems = content.items.filter((item) => item.enabled && item.kind === "primary");
  const visibleSecondaryItems = content.items.filter(
    (item) => item.enabled && item.kind === "secondary",
  );

  return (
    <section className="stack writing-home-page">
      <div className="writing-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>{content.title}</h1>
          {content.summary ? <p>{content.summary}</p> : null}
        </div>
      </div>

      <div className="writing-mode-panel">
        <div className="writing-mode-grid">
          {primaryItems.map((item, index) => (
            <Link
              className={getManagedPageItemClassName(
                item,
                index,
                `writing-mode-card ${index % 2 === 0 ? "practice" : "mock"}`,
              )}
              href={item.href || "/writing"}
              key={item.id}
            >
              <span>{item.eyebrow}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <em>{item.actionLabel}</em>
            </Link>
          ))}
        </div>
      </div>

      {visibleSecondaryItems.length ? (
        <div className="writing-resource-panel">
          <h2 className="writing-special-training-title">专项训练</h2>
          <div className="writing-resource-grid">
            {visibleSecondaryItems.map((item, index) => (
              <WritingResource index={index} item={item} key={item.id} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
