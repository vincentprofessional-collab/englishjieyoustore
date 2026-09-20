import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "src/app/globals.css",
  "src/app/layout.tsx",
  "src/components/site-nav.tsx",
  "src/components/site-section-shell.tsx",
  "src/components/site-footer.tsx",
  "src/components/listening-practice-library.tsx",
  "src/components/listening-practice.tsx",
  "src/components/listening-content-admin-editor.tsx",
  "src/components/frontend-page-admin.tsx",
  "src/components/home-style-lab.tsx",
  "src/components/listening-past-papers-home.tsx",
  "src/components/reading-home.tsx",
  "src/components/writing-home.tsx",
  "src/lib/content/site-chrome.ts",
  "src/lib/content/frontend-page-overrides.ts",
  "src/lib/guide/posts.ts",
  "src/app/listening/page.tsx",
  "src/app/listening/practice/page.tsx",
  "src/app/listening/books/[bookCode]/page.tsx",
  "src/app/listening/jiufen/page.tsx",
  "src/app/listening/past-papers/page.tsx",
  "src/lib/ielts/listening-content-overrides.ts",
  "data/jiufen/listening-content.json",
  "src/lib/ielts/jiufen-listening-answer-groups.json",
];

const requiredMarkers = {
  "src/app/globals.css": [".site-section-shell", ".section-side-nav", ".section-side-reveal"],
  "src/app/layout.tsx": [
    "<SiteSectionShell config={siteChromeConfig}>",
    "<SiteFooter config={siteChromeConfig} />",
    "<FrontendPageAdmin>{children}</FrontendPageAdmin>",
  ],
  "src/components/site-nav.tsx": ["getFirstLeafHref", 'className="nav-main"'],
  "src/components/site-section-shell.tsx": [
    "site-section-shell",
    "section-side-nav",
    "ExamNavigation",
    "ExpandedBranch",
  ],
  "src/components/home-style-lab.tsx": ["GuideBoard", "hidePostChrome"],
  "src/lib/content/site-chrome.ts": ["sat-reading-writing", 'label: "SAT"', 'label: "专项训练"'],
  "src/app/listening/page.tsx": ['bookScope="cambridge"', "ListeningPracticeLibrary"],
  "src/app/listening/practice/page.tsx": ['redirect("/listening")'],
  "src/app/listening/books/[bookCode]/page.tsx": ['redirect("/listening")'],
  "src/components/listening-practice-library.tsx": ['role="dialog"', "选择本次进入方式", "练习", "模考"],
  "src/components/listening-practice.tsx": ["listeningLibraryHref", ': "/listening"'],
  "src/components/listening-content-admin-editor.tsx": [
    "编辑本套题",
    "增加题目",
    "允许普通用户查看",
    "隐藏整个 Section",
  ],
  "src/components/frontend-page-admin.tsx": [
    "编辑本页",
    "增加内容",
    "删除/隐藏",
    "编辑导航",
  ],
  "src/lib/ielts/listening.ts": ["includeDrafts", "applyListeningDetailOverride"],
};

const forbiddenMarkers = {
  "src/app/layout.tsx": ["IeltsSectionShell", "ielts-section-shell.css"],
  "src/app/globals.css": ["ielts-section-shell", "ielts-side-nav"],
  "src/app/listening/page.tsx": ["mode-choice-grid", "ielts-module-hero", "IELTS LISTENING"],
  "src/components/listening-practice.tsx": ["/listening/books/${section.bookCode}"],
  "src/app/speaking/page.tsx": ["ielts-module-hero"],
  "src/components/listening-past-papers-home.tsx": ["bbc-hero", "IELTS LISTENING · PAST PAPERS"],
  "src/components/reading-home.tsx": ["ielts-module-hero"],
  "src/components/writing-home.tsx": ["ielts-module-hero"],
  "src/lib/guide/posts.ts": [
    "如何开始使用英文解忧杂货铺",
    "收藏与分享功能说明",
    "音频播放常见问题",
  ],
};

const obsoleteFiles = [
  "src/app/ielts-section-shell.css",
  "src/components/ielts-section-shell.tsx",
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`missing file: ${file}`);
  }
}

for (const file of obsoleteFiles) {
  if (existsSync(file)) {
    failures.push(`obsolete file: ${file}`);
  }
}

for (const [file, markers] of Object.entries(requiredMarkers)) {
  if (!existsSync(file)) continue;
  const content = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!content.includes(marker)) {
      failures.push(`missing marker in ${file}: ${marker}`);
    }
  }
}

for (const [file, markers] of Object.entries(forbiddenMarkers)) {
  if (!existsSync(file)) continue;
  const content = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (content.includes(marker)) {
      failures.push(`obsolete marker in ${file}: ${marker}`);
    }
  }
}

if (existsSync("data/jiufen/listening-content.json")) {
  const jiufen = JSON.parse(readFileSync("data/jiufen/listening-content.json", "utf8"));
  const tests = jiufen.books.flatMap((book) => book.tests);
  const parts = tests.flatMap((test) => test.parts);
  const questions = parts.flatMap((part) => part.questions);
  const verifiedCount = parts.filter((part) => part.contentStatus === "source_verified").length;
  const draftCount = parts.filter((part) => part.contentStatus === "review_required").length;

  if (jiufen.books.length !== 8 || tests.length !== 48 || parts.length !== 192 || questions.length !== 1920) {
    failures.push("Jiufen bundle must contain 8 books, 48 tests, 192 parts and 1920 questions");
  }
  if (verifiedCount !== 12 || draftCount !== 180) {
    failures.push("Jiufen publication gate must keep 12 verified parts and 180 review-required drafts");
  }
}

if (existsSync("src/lib/ielts/jiufen-listening-answer-groups.json")) {
  const registry = JSON.parse(
    readFileSync("src/lib/ielts/jiufen-listening-answer-groups.json", "utf8"),
  );
  if (Object.keys(registry.sections ?? {}).length !== 192) {
    failures.push("Jiufen answer-group registry must cover all 192 parts");
  }
}

if (failures.length) {
  console.error("IELTS release baseline check failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("Refuse to deploy a snapshot that would restore the duplicate IELTS sidebar or lose its routes.");
  process.exit(1);
}

console.log("IELTS release baseline check passed.");
