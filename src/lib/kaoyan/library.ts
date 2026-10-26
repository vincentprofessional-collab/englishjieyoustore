import fs from "node:fs";
import path from "node:path";
import type { Cet4SetIndex } from "@/lib/cet4/library";

export function getKaoyanSetIndex(): Cet4SetIndex {
  const filePath = path.join(process.cwd(), "public", "kaoyan", "index.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Cet4SetIndex;
}
