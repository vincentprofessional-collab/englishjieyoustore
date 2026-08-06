import { spawnSync } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();
const seedScript = path.join(rootDir, "scripts/seed-listening-section.mjs");

for (const testNo of [2, 3, 4]) {
  for (const sectionNo of [1, 2, 3, 4]) {
    const dataFile = path.join(
      rootDir,
      `scripts/seed-data/cambridge-6-test-${testNo}-section-${sectionNo}.mjs`,
    );
    const result = spawnSync(process.execPath, [seedScript, dataFile], {
      cwd: rootDir,
      encoding: "utf8",
    });

    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

console.log("Cambridge 6 Test 2-4 seed completed.");
