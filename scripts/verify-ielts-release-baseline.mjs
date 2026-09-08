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
    "<IeltsSectionShell>{children}</IeltsSectionShell>",
  ],
  "src/components/ielts-section-shell.tsx": [
    "ielts-section-shell",
    "ielts-side-nav",
    "雅思学习",
    "剑桥雅思",
    "九分达人",
    "历年真题",
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

if (failures.length) {
  console.error("IELTS release baseline check failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("Refuse to deploy a snapshot that would remove the IELTS sidebar or its routes.");
  process.exit(1);
}

console.log("IELTS release baseline check passed.");
