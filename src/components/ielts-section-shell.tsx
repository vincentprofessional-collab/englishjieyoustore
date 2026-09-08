"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type IeltsNavGroup = {
  href: string;
  id: "listening" | "speaking" | "reading" | "writing";
  label: string;
  mark: string;
  children: Array<{
    href: string;
    label: string;
  }>;
};

const IELTS_NAV_GROUPS: IeltsNavGroup[] = [
  {
    children: [
      { href: "/listening/practice", label: "剑桥雅思" },
      { href: "/listening/jiufen", label: "九分达人" },
      { href: "/listening/past-papers", label: "历年真题" },
    ],
    href: "/listening",
    id: "listening",
    label: "听力",
    mark: "听",
  },
  {
    children: [
      { href: "/speaking/part-1", label: "Part 1" },
      { href: "/speaking/part-2", label: "Part 2" },
      { href: "/speaking/part-3", label: "Part 3" },
    ],
    href: "/speaking",
    id: "speaking",
    label: "口语",
    mark: "说",
  },
  {
    children: [
      { href: "/reading/practice", label: "剑桥雅思" },
      { href: "/reading/mock", label: "完整模考" },
    ],
    href: "/reading",
    id: "reading",
    label: "阅读",
    mark: "读",
  },
  {
    children: [
      { href: "/writing/practice?task=task1", label: "小作文" },
      { href: "/writing/task2", label: "大作文" },
      { href: "/writing/task1-vocabulary", label: "专项训练" },
    ],
    href: "/writing",
    id: "writing",
    label: "写作",
    mark: "写",
  },
];

function getPathSegments(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

function isImmersiveIeltsPage(pathname: string) {
  const segments = getPathSegments(pathname);

  if (segments[0] === "listening" && segments.length === 2) {
    return !["practice", "mock", "jiufen", "past-papers"].includes(segments[1]);
  }

  if (segments[0] === "speaking") {
    return segments.length >= 3;
  }

  if (segments[0] === "reading") {
    return segments.length >= 3;
  }

  if (segments[0] === "writing") {
    return (
      (segments[1] === "practice" && segments.length >= 3) ||
      (segments[1] === "task2" && segments.length >= 3)
    );
  }

  return false;
}

function getLinkPath(href: string) {
  return href.split(/[?#]/, 1)[0];
}

export function IeltsSectionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeGroup = IELTS_NAV_GROUPS.find(
    (group) => pathname === group.href || pathname.startsWith(`${group.href}/`),
  );

  if (!activeGroup || isImmersiveIeltsPage(pathname)) {
    return children;
  }

  return (
    <div className="ielts-section-shell">
      <aside className="ielts-side-nav" aria-label="雅思学习导航">
        <Link className="ielts-side-brand" href="/listening">
          <span>IELTS</span>
          <strong>雅思学习</strong>
        </Link>

        <nav>
          {IELTS_NAV_GROUPS.map((group) => {
            const isActive = group.id === activeGroup.id;

            return (
              <div className={`ielts-side-group ${isActive ? "active" : ""}`} key={group.id}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className="ielts-side-primary"
                  href={group.href}
                >
                  <span className="ielts-side-mark" aria-hidden="true">
                    {group.mark}
                  </span>
                  <strong>{group.label}</strong>
                  <span className="ielts-side-caret" aria-hidden="true">
                    ⌄
                  </span>
                </Link>

                <div className="ielts-side-secondary">
                  {group.children.map((child) => {
                    const childPath = getLinkPath(child.href);
                    const isCurrent =
                      !child.href.includes("#") &&
                      (pathname === childPath || pathname.startsWith(`${childPath}/`));

                    return (
                      <Link
                        aria-current={isCurrent ? "page" : undefined}
                        className={isCurrent ? "active" : ""}
                        href={child.href}
                        key={child.href}
                      >
                        <span aria-hidden="true" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="ielts-section-content">{children}</div>
    </div>
  );
}
