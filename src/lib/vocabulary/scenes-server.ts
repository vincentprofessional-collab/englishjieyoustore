import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import summaries from "@/data/vocabulary-scenes/index.json";
import legacyImages from "@/data/vocabulary-scenes/legacy.json";
import type { SceneSummary, VocabularyScene } from "./scene-learning";

export const SCENE_IMAGE_BUCKET = "vocabulary-scene-images";
export const sceneSummaries = summaries as SceneSummary[];
const ids = new Set(sceneSummaries.map(scene => scene.id));
const signed = new Map<string, { url: string; until: number }>();
export async function readVocabularyScene(id: string): Promise<VocabularyScene | null> {
  if (!ids.has(id)) return null;
  return JSON.parse(await readFile(path.join(process.cwd(), "src/data/vocabulary-scenes", id + ".json"), "utf8"));
}
/** Call only after verifying the viewer's scene access. */
export async function signVocabularySceneImage(storagePath: string) {
  const cached = signed.get(storagePath);
  if (cached && cached.until > Date.now()) return cached.url;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("场景图片服务暂未就绪");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.storage.from(SCENE_IMAGE_BUCKET).createSignedUrl(storagePath, 600);
  if (error || !data?.signedUrl) throw new Error("场景图片暂时无法加载");
  // Authorization precedes this cache. Image bytes never enter the application server.
  signed.set(storagePath, { url: data.signedUrl, until: Date.now() + 480_000 });
  return data.signedUrl;
}
export function legacyVocabularyScenePath(relative: string) {
  return Object.prototype.hasOwnProperty.call(legacyImages, relative) ? legacyImages[relative as keyof typeof legacyImages] : null;
}
