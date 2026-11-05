import Link from "next/link";
import { hasVocabularySceneImageAccess } from "@/lib/vocabulary/vocabulary-scene-image-access";
import { getVisibleLearningBooks, LEARNING_BOOKS } from "@/lib/vocabulary/learning";
import { redirect } from "next/navigation";
import { VocabularySceneLearning } from "@/components/vocabulary-scene-learning";
import { normalizeSceneSettings, sceneBookLevel, type SceneSettings } from "@/lib/vocabulary/scene-learning";
import { sceneSummaries } from "@/lib/vocabulary/scenes-server";

export const dynamic = "force-dynamic";

export default async function SceneImagesAccessPage({ searchParams }: { searchParams: Promise<{ level?: string; preview?: string; group?: string; scene?: string; settings?: string }> }) {
  const query = await searchParams;
  if (await hasVocabularySceneImageAccess()) {
    const level = query.level ?? "初中";
    const sceneLevel = sceneBookLevel(level);
    if (!sceneLevel) {
      const book = getVisibleLearningBooks(LEARNING_BOOKS).find((item) => item.key === level)?.key ?? "初中";
      redirect(`/vocabulary/books?level=${encodeURIComponent(book)}&setup=1`);
    }
    const choices = sceneSummaries.filter(scene => scene.level === sceneLevel);
    const requested = sceneSummaries.find(scene => scene.id === query.scene);
    const group = Math.max(0, Math.min(choices.length-1, Number.parseInt(query.group ?? "0",10) || 0));
    let settings: SceneSettings | null = null;
    try { if (query.settings) settings = normalizeSceneSettings(JSON.parse(query.settings)); } catch { /* Invalid optional settings use the saved defaults. */ }
    return <VocabularySceneLearning scenes={sceneSummaries} initialScene={requested?.id ?? choices[group].id} initialSettings={settings} />;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-center">
      <h1 className="text-2xl font-bold">场景图片</h1>
      <p className="mt-6" role="status">暂未达到上线质量标准</p>
      <Link className="mt-8 inline-block underline" href={`/vocabulary/books?level=${encodeURIComponent(query.level ?? "初中")}&setup=1`}>返回背单词</Link>
    </main>
  );
}
