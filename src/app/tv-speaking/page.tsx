import { TvSpeakingLearning } from "@/components/tv-speaking-learning";
import { loadTvSpeakingManifest } from "@/lib/tv-speaking-server";

export const dynamic = "force-dynamic";

export default async function TvSpeakingPage() {
  const manifest = await loadTvSpeakingManifest();
  return <TvSpeakingLearning manifest={manifest} />;
}
