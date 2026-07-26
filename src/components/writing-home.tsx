import Link from "next/link";
import type { ManagedPageContent, ManagedPageItem } from "@/lib/content/page-content";

const task2StepPracticeItem: ManagedPageItem = {
  actionLabel: "",
  description: "按照审题、规划段落、逻辑梳理和完整范文逐步拆解大作文。",
  enabled: true,
  eyebrow: "TASK 2",
  href: "/writing/task2",
  id: "task2-step-practice",
  kind: "secondary",
  title: "Task2逐步练习",
};

function insertTask2StepPracticeItem(items: ManagedPageItem[]) {
  const cleanedItems = items.filter(
    (item) =>
      item.id !== task2StepPracticeItem.id &&
      item.id !== "task2-model-essays" &&
      item.title !== "大作文题目与范文拆解",
  );
  const nextItems = [...cleanedItems];

  nextItems.splice(3, 0, task2StepPracticeItem);
  return nextItems;
}

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
  const secondaryItems = content.items.filter((item) => item.enabled && item.kind === "secondary");
  const visibleSecondaryItems = insertTask2StepPracticeItem(secondaryItems);

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
