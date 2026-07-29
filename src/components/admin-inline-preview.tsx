"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type {
  ManagedPageContent,
  ManagedPageDefinition,
  ManagedPageItem,
} from "@/lib/content/page-content";

type PageTextKey =
  | "eyebrow"
  | "primaryLabel"
  | "secondaryLabel"
  | "summary"
  | "title";

type ItemTextKey = "actionLabel" | "description" | "eyebrow" | "title";

type EditableTextProps = {
  as?: "div" | "em" | "h1" | "p" | "small" | "span" | "strong";
  className?: string;
  label: string;
  multiline?: boolean;
  onCommit: (value: string) => void;
  placeholder?: string;
  value: string;
};

function cleanEditableText(value: string) {
  return value.replace(/\u00a0/g, " ").trim();
}

function EditableText({
  as = "span",
  className = "",
  label,
  multiline = false,
  onCommit,
  placeholder = "点击修改",
  value,
}: EditableTextProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const Tag = as;

  useEffect(() => {
    const element = elementRef.current;

    if (!isEditing && element && element.innerText !== value) {
      element.innerText = value;
    }
  }, [isEditing, value]);

  function commitValue() {
    const nextValue = cleanEditableText(elementRef.current?.innerText ?? "");

    onCommit(nextValue);
    setIsEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (elementRef.current) {
        elementRef.current.innerText = value;
      }
      event.currentTarget.blur();
    }
  }

  return (
    <Tag
      aria-label={label}
      aria-multiline={multiline || undefined}
      className={`admin-inline-edit ${className}`}
      contentEditable
      data-placeholder={placeholder}
      ref={(node: HTMLElement | null) => {
        elementRef.current = node;
      }}
      role="textbox"
      spellCheck={false}
      suppressContentEditableWarning
      tabIndex={0}
      onBlur={commitValue}
      onFocus={() => setIsEditing(true)}
      onKeyDown={handleKeyDown}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
    >
      {value}
    </Tag>
  );
}

function editableItemIndex(items: ManagedPageItem[], item: ManagedPageItem) {
  return items.findIndex((candidate) => candidate.id === item.id);
}

function AdminModeCard({
  index,
  item,
  onItemChange,
}: {
  index: number;
  item: ManagedPageItem;
  onItemChange: (index: number, patch: Partial<ManagedPageItem>) => void;
}) {
  function updateItemText(key: ItemTextKey, value: string) {
    onItemChange(index, { [key]: value });
  }

  return (
    <article className={`writing-mode-card ${index % 2 === 0 ? "practice" : "mock"}`}>
      <EditableText
        as="span"
        label="区块小标题"
        value={item.eyebrow}
        onCommit={(value) => updateItemText("eyebrow", value)}
      />
      <EditableText
        as="strong"
        label="区块标题"
        value={item.title}
        onCommit={(value) => updateItemText("title", value)}
      />
      <EditableText
        as="p"
        label="区块说明"
        multiline
        value={item.description}
        onCommit={(value) => updateItemText("description", value)}
      />
      {item.actionLabel ? (
        <EditableText
          as="em"
          label="入口文字"
          value={item.actionLabel}
          onCommit={(value) => updateItemText("actionLabel", value)}
        />
      ) : null}
    </article>
  );
}

function AdminModuleGrid({
  content,
  onItemChange,
}: {
  content: ManagedPageContent;
  onItemChange: (index: number, patch: Partial<ManagedPageItem>) => void;
}) {
  const items = content.items.filter((item) => item.enabled);

  return (
    <div className="grid three">
      {items.map((item) => {
        const index = editableItemIndex(content.items, item);

        return (
          <article className="module large" key={item.id}>
            <EditableText
              as="strong"
              label="区块标题"
              value={item.title}
              onCommit={(value) => onItemChange(index, { title: value })}
            />
            <EditableText
              as="span"
              label="区块说明"
              multiline
              value={item.description}
              onCommit={(value) => onItemChange(index, { description: value })}
            />
          </article>
        );
      })}
    </div>
  );
}

export function AdminInlinePreview({
  content,
  definition,
  onItemChange,
  onPageChange,
}: {
  content: ManagedPageContent;
  definition: ManagedPageDefinition;
  onItemChange: (index: number, patch: Partial<ManagedPageItem>) => void;
  onPageChange: (key: PageTextKey, value: string) => void;
}) {
  const enabledItems = content.items.filter((item) => item.enabled);
  const primaryItems = enabledItems.filter((item) => item.kind === "primary");
  const secondaryItems = enabledItems.filter((item) => item.kind === "secondary");

  function pageText(key: PageTextKey, label: string, options?: Partial<EditableTextProps>) {
    return (
      <EditableText
        label={label}
        value={content[key]}
        onCommit={(value) => onPageChange(key, value)}
        {...options}
      />
    );
  }

  if (definition.slug === "home") {
    return (
      <div className="admin-live-frame">
        <div className="home-style-lab home-simple admin-live-page">
          <section className="home-hero-panel" aria-label="首页可视化编辑">
            <div className="home-hero-copy">
              {pageText("eyebrow", "首页小标题", { as: "span", className: "home-kicker" })}
              {pageText("title", "首页主标题", { as: "h1", multiline: true })}
              {pageText("summary", "首页说明", { as: "p", multiline: true })}
              <div className="home-hero-actions">
                {content.primaryLabel ? (
                  <span className="home-primary-action admin-live-action">
                    {pageText("primaryLabel", "主按钮文字")}
                    <span aria-hidden="true">↗</span>
                  </span>
                ) : null}
                {content.secondaryLabel ? (
                  <span className="home-secondary-action admin-live-action">
                    {pageText("secondaryLabel", "次按钮文字")}
                    <span aria-hidden="true">→</span>
                  </span>
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
      </div>
    );
  }

  if (definition.slug === "articles") {
    return (
      <div className="admin-live-frame">
        <section className="stack bbc-home-page admin-live-page">
          <div className="page-heading bbc-hero">
            {pageText("eyebrow", "页面小标题", { as: "div", className: "eyebrow" })}
            {pageText("title", "页面主标题", { as: "h1" })}
            {pageText("summary", "页面说明", { as: "p", className: "lead", multiline: true })}
          </div>
          <div className="bbc-year-panel">
            <div className="bbc-year-list">
              {[2026, 2025, 2024].map((year) => (
                <div className="bbc-year-item" key={year}>
                  <div className="bbc-year-banner">
                    <span>{year}</span>
                    <i>▸</i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (definition.slug === "training" || definition.slug === "contact") {
    return (
      <div className="admin-live-frame">
        <section className="stack admin-live-page">
          <div className="page-heading">
            {pageText("eyebrow", "页面小标题", { as: "div", className: "eyebrow" })}
            {pageText("title", "页面主标题", { as: "h1" })}
            {pageText("summary", "页面说明", { as: "p", className: "lead", multiline: true })}
            {content.primaryLabel ? (
              <div className="actions">
                <span className="button primary admin-live-action">
                  {pageText("primaryLabel", "主按钮文字")}
                </span>
              </div>
            ) : null}
          </div>
          <AdminModuleGrid content={content} onItemChange={onItemChange} />
        </section>
      </div>
    );
  }

  return (
    <div className="admin-live-frame">
      <section className={`stack ielts-module-page ${definition.slug}-home-page admin-live-page`}>
        <div className="writing-hero-panel ielts-module-hero">
          <div className="writing-hero-copy">
            {pageText("title", "页面主标题", { as: "h1" })}
            {content.summary
              ? pageText("summary", "页面说明", { as: "p", multiline: true })
              : null}
          </div>
        </div>

        {definition.slug === "speaking" ? (
          <div className="writing-mode-panel speaking-mode-panel">
            <div className="section-grid">
              {enabledItems.map((item) => {
                const index = editableItemIndex(content.items, item);

                return (
                  <article className="module large speaking-placeholder-card" key={item.id}>
                    <EditableText
                      as="strong"
                      label="区块标题"
                      value={item.title}
                      onCommit={(value) => onItemChange(index, { title: value })}
                    />
                    <EditableText
                      as="span"
                      label="区块说明"
                      multiline
                      value={item.description}
                      onCommit={(value) => onItemChange(index, { description: value })}
                    />
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`writing-mode-panel ${definition.slug}-mode-panel`}>
            <div className="writing-mode-grid">
              {primaryItems.map((item) => {
                const index = editableItemIndex(content.items, item);

                return (
                  <AdminModeCard
                    index={index}
                    item={item}
                    key={item.id}
                    onItemChange={onItemChange}
                  />
                );
              })}
            </div>
          </div>
        )}

        {definition.slug === "writing" && secondaryItems.length ? (
          <div className="writing-resource-panel">
            <h2 className="writing-special-training-title">专项训练</h2>
            <div className="writing-resource-grid">
              {secondaryItems.map((item) => {
                const index = editableItemIndex(content.items, item);

                return (
                  <article key={item.id}>
                    {item.eyebrow ? (
                      <EditableText
                        as="span"
                        label="专项训练小标题"
                        value={item.eyebrow}
                        onCommit={(value) => onItemChange(index, { eyebrow: value })}
                      />
                    ) : null}
                    <EditableText
                      as="strong"
                      label="专项训练标题"
                      value={item.title}
                      onCommit={(value) => onItemChange(index, { title: value })}
                    />
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
