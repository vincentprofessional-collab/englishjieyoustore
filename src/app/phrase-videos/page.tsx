import { readFile } from "node:fs/promises";
import path from "node:path";
import { PhraseVideoLearning } from "@/components/phrase-video-learning";

export const dynamic = "force-dynamic";

export default async function PhraseVideosPage() {
  let manifest: Parameters<typeof PhraseVideoLearning>[0]["manifest"] = null;
  try {
    const manifestPath = path.join(process.cwd(), "data", "phrase-videos", "web-manifest.json");
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    manifest = null;
  }
  return <PhraseVideoLearning manifest={manifest} />;
}
