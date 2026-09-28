"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import type { SiteChromeConfig } from "@/lib/content/site-chrome";
import { GuidePostsOnNavigationPage } from "@/components/guide-board";
import { BBC_DEFAULT_YEAR } from "@/lib/articles/bbc";

type StudyNavGroup = {
  href: string;
  id: "integrated-english" | "junior-high" | "senior-high" | "cet4" | "cet6" | "postgraduate" | "ielts" | "sat" | "gmat" | "gre";
  label: string;
  mark: string;
  disabled?: boolean;
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
      { href: "/junior-high?entry=knowledge", label: "知识点" },
      { href: "/junior-high?entry=practice", label: "题型训练" },
      { href: "/junior-high?entry=papers", label: "历年真题" },
    ],
    href: "/junior-high?entry=knowledge",
    id: "junior-high",
    label: "中考英语",
    mark: "中",
  },
  {
    children: [
      { href: "/senior-high?entry=knowledge", label: "知识点" },
      { href: "/senior-high?entry=practice", label: "题型训练" },
      { href: "/senior-high?entry=papers", label: "历年真题" },
    ],
    href: "/senior-high?entry=practice",
    id: "senior-high",
    label: "高考英语",
    mark: "高",
  },
  { children: [
    { href: "/cet4?entry=knowledge", label: "知识点" },
    { href: "/cet4?entry=practice", label: "题型训练" },
    { href: "/cet4?entry=papers", label: "历年试卷" },
  ], href: "/cet4", id: "cet4", label: "四级英语", mark: "四" },
  { children: [
    { href: "/cet6?entry=knowledge", label: "知识点" },
    { href: "/cet6?entry=practice", label: "题型训练" },
    { href: "/cet6?entry=papers", label: "历年试卷" },
  ], href: "/cet6", id: "cet6", label: "六级英语", mark: "六" },
  { children: [], disabled: true, href: "", id: "postgraduate", label: "考研英语", mark: "研" },
  {
    children: [
      { href: "/listening", label: "听力" },
      { href: "/speaking", label: "口语" },
      { href: "/reading", label: "阅读" },
      { href: "/writing", label: "写作" },
    ],
    href: "/listening",
    id: "ielts",
    label: "雅思",
    mark: "雅",
  },
  {
    children: [],
    href: "/sat",
    id: "sat",
    label: "SAT",
    mark: "S",
  },
  { children: [], disabled: true, href: "", id: "gmat", label: "GMAT", mark: "G" },
  { children: [], disabled: true, href: "", id: "gre", label: "GRE", mark: "G" },
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

function isGroupPath(pathname: string, group: StudyNavGroup) {
  if (group.disabled) return false;
  if (group.id === "ielts") {
    return group.children.some(({ href }) => {
      const path = getLinkPath(href);
      return pathname === path || pathname.startsWith(`${path}/`);
    });
  }
  const path = getLinkPath(group.href);
  return pathname === path || pathname.startsWith(`${path}/`);
}

function isStudyChildCurrent(
  href: string,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  defaultEntry?: string,
) {
  const path = getLinkPath(href);
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  const query = href.split("?")[1]?.split("#")[0] ?? "";
  const requested = new URLSearchParams(query);
  if (requested.has("entry")) {
    const requestedEntry = requested.get("entry");
    const activeEntry = searchParams.get("entry");
    if (activeEntry) return activeEntry === requestedEntry;
    const routeSection = pathname.slice(path.length).split("/").filter(Boolean)[0];
    if (routeSection === "knowledge" || routeSection === "practice" || routeSection === "papers") {
      return routeSection === requestedEntry;
    }
    return defaultEntry === requestedEntry;
  }
  return [...requested.entries()].every(([key, value]) => searchParams.get(key) === value);
}

function getDirectoryMark(label: string, fallback: string) {
  return label.match(/[A-Za-z]/)?.[0]?.toUpperCase() ?? fallback;
}

const BBC_DIRECTORY_YEARS = Array.from({ length: 12 }, (_, index) => 2026 - index);

function getNewConceptUnitFromPath(pathname: string, unitCount: number) {
  const lessonMatch = pathname.match(/\/new-concept\/(?:book2-)?lesson-(\d+)/);
  const lessonNo = lessonMatch ? Number(lessonMatch[1]) : 1;

  return Math.min(unitCount, Math.max(1, Math.floor((lessonNo - 1) / 24) + 1));
}

function IeltsSectionShellContent({
  children,
  siteChromeConfig,
}: {
  children: ReactNode;
  siteChromeConfig: SiteChromeConfig;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedExamGroupId, setExpandedExamGroupId] = useState<StudyNavGroup["id"] | null>(null);
  const requestedBbcYear = Number(searchParams.get("year"));
  const activeBbcYear = BBC_DIRECTORY_YEARS.includes(requestedBbcYear)
    ? requestedBbcYear
    : BBC_DEFAULT_YEAR;
  const activeGroup = STUDY_NAV_GROUPS.find((group) =>
    group.id === "integrated-english"
      ? pathname === "/articles" || pathname.startsWith("/articles/") || pathname === "/new-concept" || pathname.startsWith("/new-concept/")
      : isGroupPath(pathname, group),
  );

  // The New Concept home owns its content list. Every integrated-English page
  // uses the same source-aware directory shell below.
  if (!activeGroup || (activeGroup.id !== "integrated-english" && isImmersiveIeltsPage(pathname))) {
    return (
      <>
        {children}
        <GuidePostsOnNavigationPage config={siteChromeConfig} />
      </>
    );
  }

  const isIntegratedEnglish = activeGroup.id === "integrated-english";
  const examGroups = STUDY_NAV_GROUPS.filter((group) => group.id !== "integrated-english");
  const isBbcPage = pathname === "/articles" || pathname.startsWith("/articles/");
  const isNewConceptPage = pathname === "/new-concept" || pathname.startsWith("/new-concept/");
  const isBookTwoLessonRoute = /\/new-concept\/book2-lesson-\d+/.test(pathname);
  const activeNewConceptBookCode = isBookTwoLessonRoute || searchParams.get("book") === "new-concept-2"
    ? "new-concept-2"
    : "new-concept-1";
  const activeNewConceptEdition = searchParams.get("edition") === "uk" ? "uk" : "us";
  const activeNewConceptUnitCount = activeNewConceptBookCode === "new-concept-2" ? 4 : 6;
  const requestedNewConceptUnit = Number(searchParams.get("unit"));
  const activeNewConceptUnit = isNewConceptPage && pathname === "/new-concept" &&
    requestedNewConceptUnit >= 1 && requestedNewConceptUnit <= activeNewConceptUnitCount
    ? requestedNewConceptUnit
    : getNewConceptUnitFromPath(pathname, activeNewConceptUnitCount);

  return (
    <div className="ielts-section-shell">
      <aside className={`ielts-side-nav study-directory-side-nav ${isIntegratedEnglish ? "integrated-english-side-nav" : "language-exams-side-nav"}`} aria-label={isIntegratedEnglish ? "综合英语导航" : "语言考试导航"}>
        <header className="study-directory-head">
          <div>
            <span>Directory</span>
            <strong>{isIntegratedEnglish ? "综合英语" : "语言考试"}</strong>
          </div>
        </header>

        <nav className="study-directory-nav">
          {(isIntegratedEnglish ? [activeGroup] : examGroups).map((group) => {
            const isActive = group.id === activeGroup.id;

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
                        {(["new-concept-1", "new-concept-2"] as const).flatMap((bookCode) =>
                          (["us", "uk"] as const).map((edition) => (
                          <div className="study-directory-new-concept-book" key={`${bookCode}-${edition}`}>
                            <Link
                              aria-current={bookCode === activeNewConceptBookCode && edition === activeNewConceptEdition ? "page" : undefined}
                              className={bookCode === activeNewConceptBookCode && edition === activeNewConceptEdition ? "active" : ""}
                              href={`/new-concept?book=${bookCode}&edition=${edition}&unit=1`}
                            >
                              <span aria-hidden="true" />新概念{bookCode === "new-concept-1" ? "1" : "2"}{edition === "uk" ? "英音" : "美音"}
                            </Link>
                            {bookCode === activeNewConceptBookCode && edition === activeNewConceptEdition ? (
                              <div aria-label={`新概念${bookCode === "new-concept-1" ? "1" : "2"}${edition === "uk" ? "英音" : "美音"}单元`} className="study-directory-unit-list">
                                {Array.from({ length: activeNewConceptUnitCount }, (_, index) => index + 1).map((unit) => (
                                  <Link
                                    aria-current={unit === activeNewConceptUnit ? "page" : undefined}
                                    className={unit === activeNewConceptUnit ? "active" : ""}
                                    href={`/new-concept?book=${bookCode}&edition=${edition}&unit=${unit}`}
                                    key={unit}
                                  >
                                    <span aria-hidden="true" />Unit {unit}
                                  </Link>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))) }
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            }

            return (
              <div className={`study-directory-source-group ${isActive ? "active" : ""} ${group.disabled ? "disabled" : ""} ${group.id === "gmat" || group.id === "gre" ? "visible-placeholder" : ""}`} key={group.id}>
                {group.disabled ? (
                  <div aria-disabled="true" className="study-directory-source-link">
                    <strong>{group.label}</strong>
                  </div>
                ) : group.children.length ? (
                  <button
                    aria-controls={`study-directory-${group.id}-children`}
                    aria-expanded={expandedExamGroupId === group.id}
                    className="study-directory-source-link study-directory-expand-button"
                    onClick={() => setExpandedExamGroupId((current) => current === group.id ? null : group.id)}
                    type="button"
                  >
                    <strong>{group.label}</strong>
                    <span aria-hidden="true" className="study-directory-chevron">{expandedExamGroupId === group.id ? "−" : "+"}</span>
                  </button>
                ) : (
                  <Link aria-current={isActive ? "page" : undefined} className="study-directory-source-link" href={group.href}>
                    <strong>{group.label}</strong>
                  </Link>
                )}

                {group.children.length && expandedExamGroupId === group.id ? <div className="study-directory-secondary" id={`study-directory-${group.id}-children`}>
                  {group.children.map((child) => {
                    const defaultEntry = group.id === "junior-high" ? "knowledge" : group.id === "senior-high" ? "practice" : undefined;
                    const isCurrent = isStudyChildCurrent(child.href, pathname, searchParams, defaultEntry);

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
                </div> : null}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="ielts-section-content">
        {children}
        <GuidePostsOnNavigationPage config={siteChromeConfig} />
      </div>
    </div>
  );
}

export function IeltsSectionShell({
  children,
  siteChromeConfig,
}: {
  children: ReactNode;
  siteChromeConfig: SiteChromeConfig;
}) {
  return (
    <Suspense fallback={children}>
      <IeltsSectionShellContent siteChromeConfig={siteChromeConfig}>
        {children}
      </IeltsSectionShellContent>
    </Suspense>
  );
}
