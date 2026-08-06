import Link from "next/link";
import {
  getManagedPageItemClassName,
  getPublishedPageContent,
} from "@/lib/content/page-content";

export const dynamic = "force-dynamic";

export default async function ListeningPage() {
  const content = await getPublishedPageContent("listening");
  const items = content.items.filter((item) => item.enabled);

  return (
    <section className="stack ielts-module-page listening-home-page">
      <div className="writing-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>{content.title}</h1>
          {content.summary ? <p>{content.summary}</p> : null}
        </div>
      </div>

      <div className="writing-mode-panel listening-mode-panel">
        <div className="writing-mode-grid">
          {items.map((item, index) => (
            <Link
              className={getManagedPageItemClassName(
                item,
                index,
                `writing-mode-card ${index % 2 === 0 ? "practice" : "mock"}`,
              )}
              href={item.href || "/listening"}
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
    </section>
  );
}
