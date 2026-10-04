import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "src/app/ielts-section-shell.css",
  "src/app/layout.tsx",
  "src/components/ielts-section-shell.tsx",
  "src/app/listening/page.tsx",
  "src/app/listening/practice/page.tsx",
  "src/app/listening/jiufen/page.tsx",
  "src/app/listening/past-papers/page.tsx",
];

const requiredMarkers = {
  "src/app/ielts-section-shell.css": [".ielts-section-shell", ".ielts-side-nav"],
  "src/app/layout.tsx": [
    'import { IeltsSectionShell } from "@/components/ielts-section-shell";',
    'import "./ielts-section-shell.css";',
  ],
  "src/components/ielts-section-shell.tsx": [
    "ielts-section-shell",
    "ielts-side-nav",
    'id: "ielts"',
    "语言考试导航",
    "剑桥雅思",
    "历年真题",
    '/listening/practice?source=cambridge',
    '/listening/past-papers',
    '/speaking/part-1',
    '/writing/practice?task=task1',
    '/writing/task2',
  ],
};

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`missing file: ${file}`);
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

const ieltsNavigation = readFileSync("src/components/ielts-section-shell.tsx", "utf8");
if (ieltsNavigation.includes("九分达人") || ieltsNavigation.includes("/listening/jiufen")) {
  failures.push("the retired Jiufen collection must remain absent from IELTS navigation");
}

const jiufenRoute = readFileSync("src/app/listening/jiufen/page.tsx", "utf8");
if (!/\bnotFound\(\)/.test(jiufenRoute)) {
  failures.push("the retired Jiufen route must remain unavailable until its audio is restored");
}

const listeningCatalog = readFileSync("src/lib/ielts/listening.ts", "utf8");
if (!/const JIUFEN_PUBLICATION_ENABLED = false/.test(listeningCatalog)) {
  failures.push("the retired Jiufen collection must remain unpublished");
}

const layout = readFileSync("src/app/layout.tsx", "utf8");
if (!/<IeltsSectionShell\s+siteChromeConfig=\{siteChromeConfig\}>\s*\{children\}\s*<\/IeltsSectionShell>/.test(layout)) {
  failures.push("src/app/layout.tsx must wrap the page content in the configured IELTS section shell");
}

if (failures.length) {
  console.error("IELTS release baseline check failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("Refuse to deploy a snapshot that would remove the IELTS sidebar or its routes.");
  process.exit(1);
}

console.log("IELTS release baseline check passed.");
