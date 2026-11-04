import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArticleInlineAnnotation, ArticleInlineSourceDocument } from "@/lib/article-inline-annotations";
import type { BbcArticle, BbcVocabularyItem } from "@/lib/articles/bbc";
import type { LearningWord } from "@/lib/vocabulary/learning";
import { getBbcPhraseLemma } from "@/lib/vocabulary/bbc-phrase-lemma";
import {
  normalizeVocabularyLearningContent,
  VOCABULARY_LEARNING_CONTENT_SLUG,
} from "@/lib/vocabulary/learning-content";

const PHRASE_BOOK = "地道表达";
const AUTO_PHRASE_PREFIX = "bbc-inline-phrase:";

function normalizePhrase(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
}

function stablePhraseId(normalizedPhrase: string) {
  return `${AUTO_PHRASE_PREFIX}${createHash("sha256").update(normalizedPhrase).digest("hex").slice(0, 24)}`;
}

function sameSentence(left: string, right: string) {
  return left.replace(/\s+/g, " ").trim() === right.replace(/\s+/g, " ").trim();
}

type PhraseCandidate = {
  definition: string;
  example: string;
  normalizedPhrase: string;
  partOfSpeech: string;
  sentenceNo: number;
  translation: string;
  word: string;
};

function appendBbcExample(word: LearningWord, article: BbcArticle, candidate: PhraseCandidate): LearningWord {
  const englishExamples = [...word.englishExamples];
  const englishExampleTranslations = englishExamples.map((_, index) => word.englishExampleTranslations?.[index] ?? "");
  const existingIndex = englishExamples.findIndex((item) => sameSentence(item, candidate.example));
  if (existingIndex < 0) {
    englishExamples.push(candidate.example);
    englishExampleTranslations.push(candidate.translation);
  } else if (!englishExampleTranslations[existingIndex] && candidate.translation) {
    englishExampleTranslations[existingIndex] = candidate.translation;
  }

  return {
    ...word,
    ...(candidate.definition ? {
      definitionCn: candidate.definition,
      definitionGroups: [{ definitions: [candidate.definition], partOfSpeech: candidate.partOfSpeech, text: [candidate.partOfSpeech, candidate.definition].filter(Boolean).join(" ") }],
      definitionLines: [candidate.definition],
      partOfSpeech: candidate.partOfSpeech || word.partOfSpeech,
    } : {}),
    englishExamples,
    englishExampleTranslations,
    bbcExampleSource: {
      articleId: article.id,
      articleTitle: article.title,
      normalizedPhrase: candidate.normalizedPhrase,
      sentenceNo: candidate.sentenceNo,
    },
  };
}

function createPhraseWord(article: BbcArticle, candidate: PhraseCandidate): LearningWord {
  const definition = candidate.definition;
  const partOfSpeech = candidate.partOfSpeech || "地道表达";
  return {
    antonyms: [],
    bbcExampleSource: {
      articleId: article.id,
      articleTitle: article.title,
      normalizedPhrase: candidate.normalizedPhrase,
      sentenceNo: candidate.sentenceNo,
    },
    definitionCn: definition,
    definitionGroups: definition ? [{ definitions: [definition], partOfSpeech, text: `${partOfSpeech} ${definition}` }] : [],
    definitionLines: definition ? [definition] : [],
    englishDefinitions: [],
    englishExamples: [candidate.example],
    englishExampleTranslations: [candidate.translation],
    extension: "",
    etymologySource: "",
    etymologyStory: "",
    formation: "",
    id: stablePhraseId(candidate.normalizedPhrase),
    inflections: [],
    level: PHRASE_BOOK,
    partOfSpeech,
    phonetic: "",
    reviewNotes: [],
    root: "",
    synonyms: [],
    ukAudioUrl: "",
    ukPhonetic: "",
    usAudioUrl: "",
    usPhonetic: "",
    word: candidate.word,
  };
}

function cleanPhrase(value: string) {
  return value.replace(/\*\*/g, "").replace(/[（(]\s*(?:短语|phrase)\s*[）)]/gi, "")
    .replace(/\s+/g, " ").trim();
}

function hasPhraseWords(value: string) {
  return (value.match(/[a-z]+(?:['’][a-z]+)?/gi) ?? []).length > 1 && !/\.{3}|…/.test(value);
}

function getVocabularyHeadword(value: string) {
  const cleaned = cleanPhrase(value);
  return cleaned.match(/^[a-z]+(?:['’][a-z]+)?(?:[-\s]+[a-z]+(?:['’][a-z]+)?)*/i)?.[0]?.trim() || cleaned;
}

function getArticleSentence(article: BbcArticle, phrase: string, preferredExample: string) {
  const sentences = article.sentences ?? [];
  const exact = sentences.find((sentence) => preferredExample && sameSentence(sentence.english, preferredExample));
  if (exact) return exact;
  const normalizedPhrase = normalizePhrase(phrase);
  const matching = sentences.find((sentence) => ` ${normalizePhrase(sentence.english)} `.includes(` ${normalizedPhrase} `));
  return matching ?? null;
}

function getRightColumnDefinition(item: BbcVocabularyItem, term: string) {
  if (item.definition?.trim()) return cleanPhrase(item.definition);
  let remainder = cleanPhrase(item.entry);
  if (remainder.toLowerCase().startsWith(term.toLowerCase())) remainder = remainder.slice(term.length).trim();
  remainder = remainder.replace(/^\/[^/]+\/\s*/, "").replace(/^\[[^\]]+\]\s*/, "");
  remainder = remainder.replace(/^(?:phr(?:ase)?\.?\s*(?:v|n|adj|adv)?\.?|(?:interj|modal|abbr|prep|pron|conj|adj|adv|aux|det|num|art|int|vi|vt|pl|n|v)\.?)\s*/i, "");
  return cleanPhrase(remainder);
}

function getRightColumnCandidate(article: BbcArticle, item: BbcVocabularyItem): PhraseCandidate | null {
  const sourceTerm = getVocabularyHeadword(item.term || item.highlightTerm || item.entry || item.lemma || "");
  const term = getBbcPhraseLemma(cleanPhrase(item.lemma || sourceTerm));
  const normalizedPhrase = normalizePhrase(term);
  if (!normalizedPhrase || !hasPhraseWords(sourceTerm)) return null;

  const sentence = getArticleSentence(article, sourceTerm, item.example);
  const example = sentence?.english || item.example.trim();
  if (!example) return null;
  return {
    definition: getRightColumnDefinition(item, sourceTerm),
    example,
    normalizedPhrase,
    partOfSpeech: item.partOfSpeech?.trim() || "地道表达",
    sentenceNo: sentence?.sentenceNo ?? item.number,
    translation: sentence?.chinese || item.translation.trim(),
    word: term,
  };
}

function getDashedCandidate(
  article: BbcArticle,
  document: ArticleInlineSourceDocument,
  units: Map<string, { index: number; text: string }>,
  annotation: ArticleInlineAnnotation,
): PhraseCandidate | null {
  const word = cleanPhrase(annotation.selectedText);
  const lemma = getBbcPhraseLemma(word);
  const normalizedPhrase = normalizePhrase(lemma);
  if (!normalizedPhrase || !hasPhraseWords(word)) return null;
  const unit = units.get(annotation.unitId);
  if (!unit) return null;
  const sourceSentence = getArticleSentence(article, word, unit.text) ?? article.sentences?.[unit.index];
  return {
    definition: annotation.label.trim(),
    example: sourceSentence?.english || unit.text,
    normalizedPhrase,
    partOfSpeech: annotation.partOfSpeech.trim() || "地道表达",
    sentenceNo: sourceSentence?.sentenceNo ?? unit.index + 1,
    translation: sourceSentence?.chinese ?? "",
    word: lemma,
  };
}

export async function syncBbcDashedPhrases(
  supabase: SupabaseClient,
  adminUserId: string,
  article: BbcArticle,
  document: ArticleInlineSourceDocument,
  annotations: ArticleInlineAnnotation[],
  vocabularyItems: BbcVocabularyItem[] = article.vocabulary ?? [],
) {
  const units = new Map(document.units.map((unit, index) => [unit.id, { index, text: unit.text }]));
  const candidates = new Map<string, PhraseCandidate>();
  for (const item of vocabularyItems) {
    const candidate = getRightColumnCandidate(article, item);
    if (!candidate) continue;
    const existing = candidates.get(candidate.normalizedPhrase);
    if (!existing) candidates.set(candidate.normalizedPhrase, candidate);
    else if (!existing.definition && candidate.definition) candidates.set(candidate.normalizedPhrase, { ...existing, ...candidate });
  }
  const dashedCandidates = annotations
    .filter((annotation) => annotation.style === "dashed")
    .sort((left, right) => (units.get(left.unitId)?.index ?? 0) - (units.get(right.unitId)?.index ?? 0) || left.start - right.start);
  for (const annotation of dashedCandidates) {
    const candidate = getDashedCandidate(article, document, units, annotation);
    if (!candidate) continue;
    const existing = candidates.get(candidate.normalizedPhrase);
    if (!existing) candidates.set(candidate.normalizedPhrase, candidate);
    else if (!existing.definition && candidate.definition) candidates.set(candidate.normalizedPhrase, { ...existing, definition: candidate.definition });
  }
  if (!candidates.size) return { added: 0, updated: 0 };

  const { getSupplementalLearningWords } = await import("@/lib/vocabulary/supplemental-learning-books");
  const builtInPhrases = getSupplementalLearningWords("地道表达") ?? [];
  const { data, error } = await supabase
    .from("managed_content_pages")
    .select("meta_json")
    .eq("slug", VOCABULARY_LEARNING_CONTENT_SLUG)
    .maybeSingle();
  if (error) throw new Error(`读取地道表达词汇表失败：${error.message}`);

  const rawContent = data?.meta_json && typeof data.meta_json === "object" && !Array.isArray(data.meta_json)
    ? data.meta_json as Record<string, unknown>
    : {};
  const content = normalizeVocabularyLearningContent(rawContent);
  if (content.books[PHRASE_BOOK]?.deleted) return { added: 0, updated: 0 };

  const changes = content.entries[PHRASE_BOOK] ?? { overrides: {}, additions: [] };
  const getPhraseKey = (value: string) => normalizePhrase(getBbcPhraseLemma(value));
  const baseByPhrase = new Map(builtInPhrases.map((word) => [getPhraseKey(word.word), word]));
  const activeWords = new Map<string, LearningWord>();
  for (const word of builtInPhrases) {
    const override = changes.overrides[word.id];
    if (!override?.deleted) activeWords.set(getPhraseKey(override?.word?.bbcExampleSource?.normalizedPhrase ?? word.word), override?.word ? { ...word, ...override.word } : word);
  }
  for (const word of changes.additions) {
    const override = changes.overrides[word.id];
    const activeWord = override?.word ?? word;
    if (!override?.deleted) activeWords.set(getPhraseKey(activeWord.bbcExampleSource?.normalizedPhrase ?? activeWord.word), activeWord);
  }

  let added = 0;
  let updated = 0;
  for (const [normalizedPhrase, candidate] of candidates) {
    const autoId = stablePhraseId(normalizedPhrase);
    const existingAddition = changes.additions.find((word) => word.id === autoId)
      ?? changes.additions.find((word) => getPhraseKey(word.bbcExampleSource?.normalizedPhrase ?? word.word) === normalizedPhrase);
    const existingBase = baseByPhrase.get(normalizedPhrase);
    const existingOverride = existingBase ? changes.overrides[existingBase.id] : undefined;
    const existing = existingAddition
      ?? (existingBase && !existingOverride?.deleted ? (existingOverride?.word ? { ...existingBase, ...existingOverride.word } : existingBase) : undefined)
      ?? activeWords.get(normalizedPhrase);
    const existingId = existingAddition?.id ?? existingBase?.id ?? existing?.id;
    if (existingId && changes.overrides[existingId]?.deleted) continue;

    if (existing) {
      if (existing.bbcExampleSource) {
        const sourcePhrase = getPhraseKey(existing.bbcExampleSource.normalizedPhrase || existing.word);
        const existingWordMatchesSource = getPhraseKey(existing.word) === sourcePhrase;
        const normalizedWord = existingWordMatchesSource ? getBbcPhraseLemma(existing.word) : existing.word;
        if (existing.word === normalizedWord && sourcePhrase === normalizedPhrase) continue;
        const updatedWord = {
          ...existing,
          word: normalizedWord,
          bbcExampleSource: { ...existing.bbcExampleSource, normalizedPhrase },
        };
        if (existingAddition) {
          const index = changes.additions.findIndex((word) => word.id === existingAddition.id);
          changes.additions[index] = updatedWord;
        } else if (existingBase) {
          changes.overrides[existingBase.id] = { word: updatedWord };
        } else {
          const index = changes.additions.findIndex((word) => word.id === existing.id);
          if (index >= 0) changes.additions[index] = updatedWord;
          else changes.additions.push(updatedWord);
        }
        activeWords.set(normalizedPhrase, updatedWord);
        updated += 1;
        continue;
      }
      const updatedWord = appendBbcExample(existing, article, candidate);
      if (existingAddition) {
        const index = changes.additions.findIndex((word) => word.id === existingAddition.id);
        changes.additions[index] = updatedWord;
      } else if (existingBase) {
        changes.overrides[existingBase.id] = { word: updatedWord };
      } else {
        const index = changes.additions.findIndex((word) => word.id === existing.id);
        if (index >= 0) changes.additions[index] = updatedWord;
        else changes.additions.push(updatedWord);
      }
      activeWords.set(normalizedPhrase, updatedWord);
      updated += 1;
      continue;
    }

    if (changes.overrides[autoId]?.deleted) continue;
    const word = createPhraseWord(article, candidate);
    changes.additions.push(word);
    activeWords.set(normalizedPhrase, word);
    added += 1;
  }

  if (!added && !updated) return { added, updated };
  content.entries[PHRASE_BOOK] = changes;
  const now = new Date().toISOString();
  const { error: saveError } = await supabase.from("managed_content_pages").upsert({
    created_by: adminUserId,
    meta_json: {
      ...rawContent,
      ...content,
      contentVersion: 1,
      audit: { updatedAt: now, updatedBy: adminUserId },
    },
    module: "training",
    published_at: now,
    slug: VOCABULARY_LEARNING_CONTENT_SLUG,
    status: "published",
    summary: "词汇书、单词、短语与表达内容。",
    template_key: "site_announcement_page",
    title: "背单词内容管理",
    updated_at: now,
  }, { onConflict: "slug" });
  if (saveError) throw new Error(`保存地道表达词汇表失败：${saveError.message}`);
  return { added, updated };
}
