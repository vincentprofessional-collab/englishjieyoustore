"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BBC_DEFAULT_YEAR } from "@/lib/articles/bbc";

type StudyNavGroup = {
  href: string;
  id: "integrated-english" | "listening" | "speaking" | "reading" | "writing" | "junior-high" | "senior-high" | "sat";
  label: string;
  mark: string;
  children: Array<{
    href: string;
    label: string;
  }>;
};

const STUDY_NAV_GROUPS: StudyNavGroup[] = [
  {
    children: [
      { href: "/articles?year=2026", label: "BBC随身英语" },
      { href: "/new-concept", label: "新概念英语" },
    ],
    href: "/articles",
    id: "integrated-english",
    label: "综合英语",
    mark: "英",
  },
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
  {
    children: [{ href: "/junior-high", label: "中考英语" }],
    href: "/junior-high",
    id: "junior-high",
    label: "中考英语",
    mark: "中",
  },
  {
    children: [{ href: "/senior-high", label: "高考英语" }],
    href: "/senior-high",
    id: "senior-high",
    label: "高考英语",
    mark: "高",
  },
  {
    children: [{ href: "/sat", label: "SAT Reading and Writing" }],
    href: "/sat",
    id: "sat",
    label: "SAT",
    mark: "S",
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

function getDirectoryMark(label: string, fallback: string) {
  return label.match(/[A-Za-z]/)?.[0]?.toUpperCase() ?? fallback;
}

const BBC_DIRECTORY_YEARS = Array.from({ length: 12 }, (_, index) => 2026 - index);

function getNewConceptUnitFromPath(pathname: string) {
  const lessonMatch = pathname.match(/\/new-concept\/lesson-(\d+)/);
  const lessonNo = lessonMatch ? Number(lessonMatch[1]) : 1;

  return Math.min(6, Math.max(1, Math.floor((lessonNo - 1) / 24) + 1));
}

function IeltsSectionShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedBbcYear = Number(searchParams.get("year"));
  const activeBbcYear = BBC_DIRECTORY_YEARS.includes(requestedBbcYear)
    ? requestedBbcYear
    : BBC_DEFAULT_YEAR;
  const activeGroup = STUDY_NAV_GROUPS.find(
    (group) =>
      group.id === "integrated-english"
        ? pathname === "/articles" || pathname.startsWith("/articles/") || pathname === "/new-concept" || pathname.startsWith("/new-concept/")
        : pathname === group.href || pathname.startsWith(`${group.href}/`),
  );

  // The New Concept home owns its content list. Every integrated-English page
  // uses the same source-aware directory shell below.
  if (!activeGroup || (activeGroup.id !== "integrated-english" && isImmersiveIeltsPage(pathname))) {
    return children;
  }

  const isIntegratedEnglish = activeGroup.id === "integrated-english";
  const isBbcPage = pathname === "/articles" || pathname.startsWith("/articles/");
  const isNewConceptPage = pathname === "/new-concept" || pathname.startsWith("/new-concept/");
  const activeNewConceptUnit = getNewConceptUnitFromPath(pathname);

  return (
    <div className="ielts-section-shell">
      <aside className={`ielts-side-nav study-directory-side-nav ${isIntegratedEnglish ? "integrated-english-side-nav" : ""}`} aria-label={isIntegratedEnglish ? "综合英语导航" : "雅思学习导航"}>
        <header className="study-directory-head">
          <div>
            <span>Directory</span>
            <strong>{isIntegratedEnglish ? "综合英语" : activeGroup.label}</strong>
          </div>
          <button aria-label="隐藏菜单" className="study-directory-hide" type="button">隐藏</button>
        </header>

        <nav className="study-directory-nav">
          {[activeGroup].map((group) => {
            const isActive = true;

            if (isIntegratedEnglish) {
              const bbcChild = group.children[0];
              const newConceptChild = group.children[1];

              return (
                <div className="study-directory-source-stack" key={group.id}>
                  <div className={`study-directory-source-group ${isBbcPage ? "active" : ""}`}>
                    <Link
                      aria-current={isBbcPage ? "page" : undefined}
                      className={`study-directory-source-link ${isBbcPage ? "active" : ""}`}
                      href="/articles?year=2026"
                    >
                      <span className="study-directory-source-mark" aria-hidden="true">
                        {getDirectoryMark(bbcChild.label, group.mark)}
                      </span>
                      <strong>{bbcChild.label}</strong>
                    </Link>
                    {isBbcPage ? (
                      <div aria-label="BBC随身英语年份" className="study-directory-secondary study-directory-year-list">
                        {BBC_DIRECTORY_YEARS.map((year) => (
                          <Link
                            className={year === activeBbcYear ? "active" : ""}
                            href={`/articles?year=${year}`}
                            key={year}
                          >
                            <span aria-hidden="true" />
                            {year}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className={`study-directory-source-group ${isNewConceptPage ? "active" : ""}`}>
                    <Link
                      aria-current={isNewConceptPage ? "page" : undefined}
                      className={`study-directory-source-link ${isNewConceptPage ? "active" : ""}`}
                      href={newConceptChild.href}
                    >
                      <span className="study-directory-source-mark" aria-hidden="true">
                        N
                      </span>
                      <strong>{newConceptChild.label}</strong>
                    </Link>
                    {isNewConceptPage ? (
                      <div className="study-directory-secondary study-directory-new-concept-list">
                        <strong className="study-directory-book-title">新概念1</strong>
                        <div aria-label="新概念英语单元" className="study-directory-unit-list">
                          {Array.from({ length: 6 }, (_, index) => index + 1).map((unit) => (
                            <Link
                              className={unit === activeNewConceptUnit ? "active" : ""}
                              href={`/new-concept?unit=${unit}`}
                              key={unit}
                            >
                              <span>Unit {unit}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            }

            return (
              <div className={`study-directory-source-group ${isActive ? "active" : ""}`} key={group.id}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className="study-directory-source-link"
                  href={group.href}
                >
                  <span className="study-directory-source-mark" aria-hidden="true">
                    {group.mark}
                  </span>
                  <strong>{group.label}</strong>
                </Link>

                <div className="study-directory-secondary">
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

export function IeltsSectionShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <IeltsSectionShellContent>{children}</IeltsSectionShellContent>
    </Suspense>
  );
}
