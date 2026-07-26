import { getPublishedPageContent } from "@/lib/content/page-content";

export const dynamic = "force-dynamic";

export default async function SpeakingPage() {
  const content = await getPublishedPageContent("speaking");
  const items = content.items.filter((item) => item.enabled);

  return (
    <section className="stack ielts-module-page speaking-home-page">
      <div className="writing-hero-panel ielts-module-hero">
        <div className="writing-hero-copy">
          <h1>{content.title}</h1>
          {content.summary ? <p>{content.summary}</p> : null}
        </div>
      </div>

      <div className="writing-mode-panel speaking-mode-panel">
        <div className="section-grid">
          {items.map((item) => (
            <article className="module large speaking-placeholder-card" key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
