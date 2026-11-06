export const VOCABULARY_LOOKUP_PREFERENCES_KEY = "ielts-platform.vocabularyLookupDisplay";
export const VOCABULARY_LOOKUP_PREFERENCES_EVENT = "vocabulary-lookup-display-change";

export const VOCABULARY_LOOKUP_SECTIONS = [
  { key: "chineseDefinition", label: "中文释义", defaultVisible: true },
  { key: "englishDefinition", label: "英文释义", defaultVisible: true },
  { key: "inflections", label: "词性变化", defaultVisible: true },
  { key: "images", label: "图片", defaultVisible: true },
  { key: "examples", label: "例句", defaultVisible: true },
  { key: "synonymDistinctions", label: "同义词辨析", defaultVisible: true },
  { key: "etymology", label: "词源", defaultVisible: true },
] as const;

export type VocabularyLookupSectionKey = (typeof VOCABULARY_LOOKUP_SECTIONS)[number]["key"];
export type VocabularyLookupDisplayPreferences = Record<VocabularyLookupSectionKey, boolean>;

export const DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES = Object.fromEntries(
  VOCABULARY_LOOKUP_SECTIONS.map(({ key, defaultVisible }) => [key, defaultVisible]),
) as VocabularyLookupDisplayPreferences;

export function isPhoneUserAgent(userAgent: string) {
  const normalized = userAgent.toLowerCase();
  if (/ipad|tablet|macintosh.*mobile/.test(normalized)) return false;
  return /iphone|ipod|android.*mobile|windows phone|\bmobile\b/.test(normalized);
}

export function getVocabularyLookupDisplayPreferences(): VocabularyLookupDisplayPreferences {
  if (typeof window === "undefined") return DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES;
  try {
    const stored = JSON.parse(window.localStorage.getItem(VOCABULARY_LOOKUP_PREFERENCES_KEY) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(
      VOCABULARY_LOOKUP_SECTIONS.map(({ key, defaultVisible }) => [key, typeof stored[key] === "boolean" ? stored[key] : defaultVisible]),
    ) as VocabularyLookupDisplayPreferences;
  } catch {
    return DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES;
  }
}

export function setVocabularyLookupSectionVisible(key: VocabularyLookupSectionKey, visible: boolean) {
  if (typeof window === "undefined") return;
  const next = { ...getVocabularyLookupDisplayPreferences(), [key]: visible };
  window.localStorage.setItem(VOCABULARY_LOOKUP_PREFERENCES_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(VOCABULARY_LOOKUP_PREFERENCES_EVENT));
}

export function subscribeToVocabularyLookupDisplayPreferences(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(VOCABULARY_LOOKUP_PREFERENCES_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(VOCABULARY_LOOKUP_PREFERENCES_EVENT, callback);
  };
}
