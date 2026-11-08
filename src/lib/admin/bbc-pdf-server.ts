import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { readBbcPdf, parseBbcPdfQuiz } from "./bbc-pdf-import";

export async function importBbcPdfOnServer(file: File) {
  const root = join(process.cwd(), "node_modules", "pdfjs-dist");
  const reader = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { pages, pdfSha256 } = await readBbcPdf(file, undefined, {
    reader,
    workerSrc: pathToFileURL(join(root, "legacy/build/pdf.worker.mjs")).href,
    assetBase: root + sep,
  });
  return parseBbcPdfQuiz(pages, { pdf: file.name, pdfSha256 });
}
