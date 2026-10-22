import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as navHelpers from "../src/lib/content/site-chrome-nav.ts";
import {
  ensureCompleteExamMenu,
  ensureJuniorHighExamLink,
  ensureJuniorHighExamMenu,
  removeRetiredCet4KnowledgeLinks,
} from "../src/lib/content/site-chrome-nav.ts";

test("published exam banks have clickable sidebar and saved-menu entry points", () => {
  const require = createRequire(import.meta.url);
  let pathname = "/junior-high";
  function loadModule(relativePath) {
    const code = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const exports = {};
    new Function("require", "exports", code)((name) => {
      if (name === "next/link") return ({ children, ...props }) => createElement("a", props, children);
      if (name === "next/navigation") return { usePathname: () => pathname, useSearchParams: () => new URLSearchParams() };
      if (name === "@/components/guide-board") return { GuidePostsOnNavigationPage: () => null };
      if (name === "@/lib/articles/bbc") return { BBC_DEFAULT_YEAR: 2026 };
      if (name === "@/lib/courses/course-directory") return {};
      if (name === "@/lib/supabase/client") return {};
      if (name === "@/lib/content/site-chrome-nav") return navHelpers;
      return require(name);
    }, exports);
    return exports;
  }
  const { IeltsSectionShell } = loadModule("../src/components/ielts-section-shell.tsx");
  const { mergeSiteChromeConfig } = loadModule("../src/lib/content/site-chrome.ts");
  const config = mergeSiteChromeConfig({ nav: { items: [{ id: "exams", label: "语言考试", children: [] }] } });
  const groups = config.nav.items.find((item) => item.id === "exams").children;
  const expected = [
    ["postgraduate", "考研英语", "/postgraduate?entry=papers", "paper"],
    ["gmat", "GMAT", "/gmat?entry=practice", "practice"],
    ["gre", "GRE", "/gre?entry=practice", "practice"],
  ];
  for (const route of ["/junior-high", "/senior-high", "/cet4", "/postgraduate", "/gmat", "/gre"]) {
    pathname = route;
    const html = renderToStaticMarkup(createElement(IeltsSectionShell, {
      siteChromeConfig: config, courseDirectory: { groups: [] }, children: createElement("p", null, "题库内容"),
    }));
    for (const [id, label, href] of expected) {
      assert.match(html, new RegExp(`<a\\b[^>]*href="${href.replace("?", "\\?")}"[^>]*><strong>${label}</strong></a>`), `${route}: ${label} must be an actual link`);
      const group = groups.find((item) => item.id === id);
      assert.equal(group?.enabled, true);
      assert.equal(group?.href, href);
    }
    assert.ok(html.includes("题库内容"));
  }
  for (const [exam, , , kind] of expected) {
    const index = JSON.parse(readFileSync(new URL(`../public/exam-prep/${exam}/index.json`, import.meta.url), "utf8"));
    const entries = index.entries.filter((entry) => entry.kind === kind);
    assert.ok(entries.length > 0, `${exam}: linked category must contain published sets`);
    for (const entry of entries) {
      assert.equal(entry.href, `/exam-practice/${exam}/${entry.id}`);
      const set = JSON.parse(readFileSync(new URL(`../public/exam-prep/${exam}/${entry.dataPath}`, import.meta.url), "utf8"));
      assert.ok(set.questions?.length || set.sections?.some((section) => section.questions?.length || section.passages?.some((passage) => passage.questions?.length)), `${entry.href}: questions must exist`);
    }
  }
});

test("retired CET-4 knowledge links disappear from older saved navigation", () => {
  const source = [{ id: "exams", label: "语言考试", children: [
    { id: "cet4", label: "四级英语", href: "/cet4?entry=knowledge", children: [
      { id: "cet4-knowledge", label: "知识点", href: "/cet4?entry=knowledge", children: [] },
      { id: "cet4-types", label: "题型训练", href: "/cet4?entry=practice", children: [] },
      { id: "cet4-papers", label: "历年真题", href: "/cet4?entry=papers", children: [] },
    ] },
    { id: "cet6", label: "六级英语", children: [{ id: "cet6-knowledge", label: "知识点", href: "/cet6?entry=knowledge", children: [] }] },
  ] }];
  const result = removeRetiredCet4KnowledgeLinks(source);
  assert.equal(result[0].children[0].href, "/cet4?entry=papers");
  assert.deepEqual(result[0].children[0].children.map((item) => item.id), ["cet4-types", "cet4-papers"]);
  assert.equal(result[0].children[1].children[0].id, "cet6-knowledge");
  assert.equal(source[0].children[0].children.length, 3);
});

test("published exam menu keeps the junior-high link when an older config omits it", () => {
  const source = [
    { id: "ielts", label: "雅思", children: [] },
    { id: "other-exams", label: "其他考试正在开发中", children: [] },
  ];
  const juniorHigh = { id: "junior-high-english", label: "中考英语", href: "/junior-high", children: [] };

  const merged = ensureJuniorHighExamLink(source, juniorHigh);

  assert.deepEqual(merged.map((item) => item.id), ["ielts", "other-exams", "junior-high-english"]);
  assert.equal(merged.at(-1)?.href, "/junior-high");
});

test("published nav restores the language-exam menu when an older config omits it", () => {
  const source = [{ id: "ielts", label: "雅思", children: [] }];
  const juniorHigh = {
    id: "junior-high-english",
    label: "中考英语",
    href: "/junior-high",
    children: [],
  };
  const exams = {
    id: "exams",
    label: "语言考试",
    children: [],
  };

  const merged = ensureJuniorHighExamMenu(source, exams, juniorHigh);

  assert.equal(merged.at(-1)?.id, "exams");
  assert.equal(merged.at(-1)?.label, "语言考试");
  assert.equal(merged.at(-1)?.children.at(-1)?.href, "/junior-high");
});

test("published nav normalizes an older exam label while preserving its children", () => {
  const source = [{
    id: "exams",
    label: "英语考试",
    children: [{ id: "ielts", label: "雅思", children: [] }],
  }];
  const exams = { id: "exams", label: "语言考试", children: [] };
  const juniorHigh = { id: "junior-high-english", label: "中考英语", href: "/junior-high", children: [] };

  const merged = ensureJuniorHighExamMenu(source, exams, juniorHigh);

  assert.equal(merged[0].label, "语言考试");
  assert.deepEqual(merged[0].children.map((item) => item.id), ["ielts", "junior-high-english"]);
});

test("published language-exam menu restores every missing exam group", () => {
  const source = [{
    id: "exams",
    label: "英语考试",
    enabled: false,
    children: [{ id: "ielts", label: "雅思", enabled: true, children: [] }],
  }];
  const exams = {
    id: "exams",
    label: "语言考试",
    enabled: true,
    children: [
      { id: "ielts", label: "雅思", enabled: true, children: [] },
      { id: "junior-high-english", label: "中考英语", enabled: true, children: [] },
      { id: "senior-high-english", label: "高考英语", enabled: true, children: [] },
      { id: "sat-reading-writing", label: "SAT Reading and Writing", enabled: true, children: [] },
    ],
  };

  const merged = ensureCompleteExamMenu(source, exams);

  assert.equal(merged[0].enabled, true);
  assert.equal(merged[0].label, "语言考试");
  assert.deepEqual(
    merged[0].children.map((item) => item.id),
    ["ielts", "junior-high-english", "senior-high-english", "sat-reading-writing"],
  );
});
