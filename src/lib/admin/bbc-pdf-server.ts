import { createRequire } from "node:module";
import { dirname, join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { readBbcPdf, parseBbcPdfQuiz } from "./bbc-pdf-import";

export async function importBbcPdfOnServer(file: File) {
  const require = createRequire(join(process.cwd(), "package.json"));
  const root = dirname(require.resolve("pdfjs-dist/package.json"));
  const reader = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { pages, pdfSha256 } = await readBbcPdf(file, undefined, {
    reader,
    workerSrc: pathToFileURL(join(root, "legacy/build/pdf.worker.mjs")).href,
    assetBase: root + sep,
  });
  return parseBbcPdfQuiz(pages, { pdf: file.name, pdfSha256 });
}
