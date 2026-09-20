"use client";

import Link from "next/link";
import { usePathname, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { SiteChromeConfig, SiteChromeNavItem } from "@/lib/content/site-chrome";

const DICTIONARY_COUNTS: Record<string, string> = {
  "dictionary-roots": "982",
  "dictionary-prefixes": "503",
  "dictionary-suffixes": "11",
};

function enabledChildren(item: SiteChromeNavItem) {
  return item.children.filter((child) => child.enabled);
}

function firstLeafHref(item: SiteChromeNavItem): string {
  for (const child of enabledChildren(item)) {
    const href = firstLeafHref(child);
    if (href) return href;
  }

  return item.href;
}

function hrefMatchesLocation(href: string, pathname: string, searchParams: ReadonlyURLSearchParams) {
  if (!href) return false;
  const [path, query = ""] = href.split("?", 2);
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  const expected = new URLSearchParams(query);

  for (const [key, value] of expected) {
    const currentValue = searchParams.get(key);
    if (currentValue !== value) return false;
  }

  return true;
}

function hrefPathMatches(href: string, pathname: string) {
  const path = href.split("?", 1)[0];
  return Boolean(path) && (pathname === path || pathname.startsWith(`${path}/`));
}

function findPathMatch(item: SiteChromeNavItem, pathname: string): SiteChromeNavItem | undefined {
  const candidates = [
    ...(item.href && hrefPathMatches(item.href, pathname) ? [item] : []),
    ...enabledChildren(item).flatMap((child) => {
      const match = findPathMatch(child, pathname);
      return match ? [match] : [];
    }),
  ];
  return candidates.sort((left, right) => right.href.length - left.href.length)[0];
}

function flattenLeafLinks(item: SiteChromeNavItem): SiteChromeNavItem[] {
  const children = enabledChildren(item);
  if (!children.length) return item.href ? [item] : [];
  return children.flatMap(flattenLeafLinks);
}

function findBestActiveLeaf(item: SiteChromeNavItem, pathname: string, searchParams: ReadonlyURLSearchParams) {
  return flattenLeafLinks(item)
    .filter((candidate) => hrefMatchesLocation(candidate.href, pathname, searchParams))
    .sort((left, right) => right.href.length - left.href.length)[0];
}

function findActiveTopItem(items: SiteChromeNavItem[], pathname: string, searchParams: ReadonlyURLSearchParams) {
  return items
    .filter((item) => item.enabled)
    .map((item) => {
      const leaf = findBestActiveLeaf(item, pathname, searchParams);
      return { item, match: leaf ?? findPathMatch(item, pathname) };
    })
    .filter((entry) => entry.match)
    .sort((left, right) => (right.match?.href.length ?? 0) - (left.match?.href.length ?? 0))[0]?.item;
}

function SectionLeaf({ activeId, item }: { activeId?: string; item: SiteChromeNavItem }) {
  if (!item.href) return null;

  const count = DICTIONARY_COUNTS[item.id];

  return (
    <Link
      aria-current={activeId === item.id ? "page" : undefined}
      className={`${activeId === item.id ? "active " : ""}${count ? "dictionary-leaf" : ""}`}
      href={item.href}
    >
      <span aria-hidden="true" />
      <span className="section-side-label">{item.label}</span>
      {count ? <small>{count} 项</small> : null}
    </Link>
  );
}

function ExpandedBranch({
  activeId,
  depth = 0,
  item,
}: {
  activeId?: string;
  depth?: number;
  item: SiteChromeNavItem;
}) {
  const children = enabledChildren(item);
  if (!children.length) return <SectionLeaf activeId={activeId} item={item} />;

  return (
    <div className={`section-side-branch depth-${Math.min(depth, 2)}`}>
      <Link className="section-side-group-title" href={firstLeafHref(item)}>
        <span className="section-side-mark" aria-hidden="true">
          {item.label.slice(0, 1)}
        </span>
        <strong>{item.label}</strong>
      </Link>
      <div className="section-side-secondary">
        {children.map((child) => (
          <ExpandedBranch activeId={activeId} depth={depth + 1} item={child} key={child.id} />
        ))}
      </div>
    </div>
  );
}

function ExamNavigation({
  activeLeafId,
  exams,
  pathname,
  searchParams,
}: {
  activeLeafId?: string;
  exams: SiteChromeNavItem[];
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
}) {
  const activeExam = exams.find(
    (exam) => findBestActiveLeaf(exam, pathname, searchParams) ||
      (exam.href && hrefMatchesLocation(exam.href, pathname, searchParams)) ||
      findPathMatch(exam, pathname),
  );

  return (
    <nav aria-label="语言考试目录">
      {exams.map((exam) => {
        const isActive = exam.id === activeExam?.id;
        const children = enabledChildren(exam);

        return (
          <div className={`section-side-exam ${isActive ? "active" : ""}`} key={exam.id}>
            <Link className="section-side-primary" href={firstLeafHref(exam) || exam.href || "/"}>
              <span className="section-side-dot" aria-hidden="true" />
              <strong>{exam.label}</strong>
              <span aria-hidden="true">{isActive ? "▾" : "›"}</span>
            </Link>

            {isActive && children.length ? (
              <div className="section-side-exam-children">
                {exam.id === "ielts"
                  ? children.map((child) => (
                      <ExpandedBranch activeId={activeLeafId} item={child} key={child.id} />
                    ))
                  : children.map((child) => (
                      <SectionLeaf activeId={activeLeafId} item={child} key={child.id} />
                    ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function SiteSectionShell({
  children,
  config,
}: {
  children: ReactNode;
  config: SiteChromeConfig;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navItems = config.nav.items.filter(
    (item) => item.enabled && item.label !== "公告栏" && item.label !== "使用说明",
  );
  const activeTopItem = findActiveTopItem(navItems, pathname, searchParams);
  const activeLeaf = activeTopItem
    ? findBestActiveLeaf(activeTopItem, pathname, searchParams)
    : undefined;
  const hideSidebar = !activeTopItem || ["home", "me"].includes(activeTopItem.id);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  useEffect(() => {
    try {
      setSidebarHidden(window.localStorage.getItem("site-section-sidebar-hidden") === "1");
    } catch {
      setSidebarHidden(false);
    }
  }, []);

  function updateSidebarVisibility(hidden: boolean) {
    setSidebarHidden(hidden);
    try {
      window.localStorage.setItem("site-section-sidebar-hidden", hidden ? "1" : "0");
    } catch {
      // Keep the control usable when storage is unavailable.
    }
  }

  if (hideSidebar) {
    return <div className="section-page-content section-page-content-wide">{children}</div>;
  }

  const topChildren = enabledChildren(activeTopItem);

  return (
    <>
    <div className={`site-section-shell${sidebarHidden ? " sidebar-hidden" : ""}`}>
      <aside className="section-side-nav" aria-label={`${activeTopItem.label}目录`}>
        <button
          aria-label="隐藏目录侧栏"
          className="section-side-toggle"
          onClick={() => updateSidebarVisibility(true)}
          type="button"
        >
          隐藏
        </button>
        <Link className="section-side-brand" href={firstLeafHref(activeTopItem) || activeTopItem.href || "/"}>
          <span>DIRECTORY</span>
          <strong>{activeTopItem.label}</strong>
        </Link>

        {activeTopItem.id === "exams" ? (
          <ExamNavigation
            activeLeafId={activeLeaf?.id}
            exams={topChildren}
            pathname={pathname}
            searchParams={searchParams}
          />
        ) : (
          <nav aria-label={`${activeTopItem.label}下级目录`}>
            {topChildren.map((item) => (
              <ExpandedBranch activeId={activeLeaf?.id} item={item} key={item.id} />
            ))}
          </nav>
        )}
      </aside>

      <div className="section-page-content">{children}</div>
    </div>
    {sidebarHidden ? (
      <button
        aria-label="显示目录侧栏"
        className="section-side-reveal"
        onClick={() => updateSidebarVisibility(false)}
        type="button"
      >
        显示
      </button>
    ) : null}
    </>
  );
}
