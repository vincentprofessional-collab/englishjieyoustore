export const SCENE_MODES = ["reading", "listening", "speaking", "writing"] as const;
export type SceneMode = typeof SCENE_MODES[number];
export type SceneRect = [number, number, number, number];
export type SceneWord = {
  id: string; english: string; ipa: string; definition: string; pos: string;
  fullIpa: string; fullDefinition: string; sourceWord: string; sourceIds: number[];
  audioWord: string; aliases: string[]; cardRect: SceneRect; illustrationRect: SceneRect;
  glossaryRect: SceneRect; opaqueFrame: boolean; leaderPoints?: [number[], number[]] | null;
};
export type SceneSummary = { id: string; level: "middle" | "senior"; title: string; wordCount: number };
export type VocabularyScene = Omit<SceneSummary, "wordCount"> & {
  titleEnglish: string; titleChinese: string; bakedTitle: boolean; titleRect: SceneRect;
  imageWidth: number; imageHeight: number; imagePath: string; footerRect: SceneRect;
  footerRows: number; columnCounts?: number[] | null; words: SceneWord[];
};
export type SceneSettings = { modes: SceneMode[]; voice: "us" | "uk"; reactionSeconds: Record<SceneMode, number>; detailSeconds: Record<SceneMode, number> };
export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  modes: [...SCENE_MODES], voice: "us",
  reactionSeconds: { reading: 5, listening: 5, speaking: 5, writing: 5 },
  detailSeconds: { reading: 10, listening: 10, speaking: 10, writing: 10 },
};
export function normalizeSceneSettings(value?: Partial<SceneSettings> | null): SceneSettings {
  const seconds = (input: unknown, fallback: number) => typeof input === "number" && Number.isFinite(input) ? Math.max(1, Math.min(120, Math.round(input))) : fallback;
  const modes = SCENE_MODES.filter(mode => Array.isArray(value?.modes) && value.modes.includes(mode));
  return { modes: modes.length ? modes : [...SCENE_MODES], voice: value?.voice === "uk" ? "uk" : "us",
    reactionSeconds: Object.fromEntries(SCENE_MODES.map(mode => [mode, seconds(value?.reactionSeconds?.[mode], 5)])) as Record<SceneMode, number>,
    detailSeconds: Object.fromEntries(SCENE_MODES.map(mode => [mode, seconds(value?.detailSeconds?.[mode], 10)])) as Record<SceneMode, number> };
}
export function sceneFieldVisible(mode: SceneMode | "browse", revealed: boolean, scope: "scene" | "list", target: boolean, field: "en" | "ipa" | "zh") {
  if (mode === "browse" || (revealed && target)) return true;
  if (scope === "scene") return mode === "speaking" && target && field === "zh";
  return mode === "reading" ? field !== "zh" : mode === "writing" && field === "zh";
}
export function isSceneSpellingCorrect(input: string, word: Pick<SceneWord, "english" | "aliases">) {
  const normalize = (text: string) => text.trim().normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
  const accepted = [word.english, ...word.english.split(/\s*\/\s*/), ...(word.aliases ?? [])];
  if (normalize(word.english) === "per cent") accepted.push("percent");
  return Boolean(normalize(input)) && accepted.some(value => normalize(value) === normalize(input));
}
export function shuffleSceneWordIds(words: Pick<SceneWord, "id">[], random = Math.random) {
  const ids = words.map(word => word.id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids;
}
export function sceneBookLevel(book: string) {
  return book === "初中" ? "middle" : ["高中", "高中大纲词汇", "高中必修词汇"].includes(book) ? "senior" : null;
}
export function sceneLearningUrl(book: string, settings: Partial<SceneSettings> & { vocabularySort?: string; wordGroups?: { all?: number | null } }) {
  if (settings.vocabularySort !== "scene" || !sceneBookLevel(book)) return null;
  const query = new URLSearchParams({ level: book, settings: JSON.stringify(normalizeSceneSettings(settings)) });
  if (Number.isInteger(settings.wordGroups?.all) && Number(settings.wordGroups?.all) >= 0) query.set("group", String(settings.wordGroups?.all));
  return "/vocabulary/scene-images?" + query.toString();
}
