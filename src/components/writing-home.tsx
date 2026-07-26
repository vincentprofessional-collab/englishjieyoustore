import Link from "next/link";
import type { ManagedPageContent, ManagedPageItem } from "@/lib/content/page-content";

const task2ModelEssayItem: ManagedPageItem = {
  actionLabel: "",
  description: "按审题、段落规划、逻辑梳理和完整范文整理 Task 2 大作文。",
  enabled: true,
  eyebrow: "TASK 2",
  href: "/writing/task2",
  id: "task2-model-essays",
  kind: "secondary",
  title: "大作文题目与范文拆解",
};

function WritingResource({ item }: { item: ManagedPageItem }) {
  const content = (
    <strong>
      {item.eyebrow ? <span>{item.eyebrow}</span> : null} {item.title}
    </strong>
  );

  return item.href ? <Link href={item.href}>{content}</Link> : <article>{content}</article>;
}

export function WritingHome({ content }: { content: ManagedPageContent }) {
  const primaryItems = content.items.filter((item) => item.enabled && item.kind === "primary");
  const secondaryItems = content.items
    .filter((item) => item.enabled && item.kind === "secondary")
    .map((item) =>
      item.id === "task2-vocabulary"
        ? {
            ...item,
            description: item.description || task2ModelEssayItem.description,
            href: item.href || task2ModelEssayItem.href,
            title:
              item.title === "场景词汇及翻译训练" ? task2ModelEssayItem.title : item.title,
          }
        : item,
    );
  const hasTask2ModelEssayItem = secondaryItems.some((item) => item.href === "/writing/task2");
  const visibleSecondaryItems = hasTask2ModelEssayItem
    ? secondaryItems
    : [...secondaryItems, task2ModelEssayItem];

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
              className={`writing-mode-card ${index % 2 === 0 ? "practice" : "mock"}`}
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
            {visibleSecondaryItems.map((item) => (
              <WritingResource item={item} key={item.id} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
