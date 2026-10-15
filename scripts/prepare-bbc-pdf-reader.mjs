import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const root = dirname(require.resolve("pdfjs-dist/package.json"));
const output = new URL("../public/vendor/bbc-pdf/", import.meta.url);
await mkdir(output, { recursive: true });
await cp(join(root, "legacy/build/pdf.worker.min.mjs"), new URL("pdf.worker.min.mjs", output));
for (const folder of ["cmaps", "standard_fonts", "wasm"]) await cp(join(root, folder), new URL(folder, output), { recursive: true });
console.log("BBC PDF reader assets prepared.");
