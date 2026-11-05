import { NextResponse } from "next/server";
import { hasVocabularySceneImageAccess } from "@/lib/vocabulary/vocabulary-scene-image-access";
import { readVocabularyScene, signVocabularySceneImage } from "@/lib/vocabulary/scenes-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Robots-Tag": "noindex, nofollow" };
export async function GET(_request: Request, { params }: { params: Promise<{ sceneId: string }> }) {
  if (!await hasVocabularySceneImageAccess()) return NextResponse.json({ error: "暂未达到上线质量标准" }, { status: 403, headers });
  const scene = await readVocabularyScene((await params).sceneId);
  if (!scene) return NextResponse.json({ error: "场景不存在" }, { status: 404, headers });
  try { return NextResponse.json({ scene, imageUrl: await signVocabularySceneImage(scene.imagePath) }, { headers }); }
  catch { return NextResponse.json({ error: "图片暂时无法加载，请稍后重试" }, { status: 503, headers }); }
}
