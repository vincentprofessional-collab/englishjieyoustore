import { NextResponse } from "next/server";
import { hasVocabularySceneImageAccess } from "@/lib/vocabulary/vocabulary-scene-image-access";
import { legacyVocabularyScenePath, signVocabularySceneImage } from "@/lib/vocabulary/scenes-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
async function redirectImage(segments: string[]) {
  const storagePath = legacyVocabularyScenePath(segments.join("/"));
  if (!storagePath || !await hasVocabularySceneImageAccess()) return new NextResponse("Not found", { status: 404, headers });
  try { return NextResponse.redirect(await signVocabularySceneImage(storagePath), { status: 307, headers }); }
  catch { return new NextResponse("Unavailable", { status: 503, headers }); }
}
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) { return redirectImage((await params).path); }
export const HEAD = GET;
