import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { supabase } from "@/lib/supabase/client";

export type LocalVocabularyHint = {
  definitionCn: string;
  etymologySource: string;
  etymologySourceKey?: string;
  formation: string;
  level: string;
  partOfSpeech: string;
  phonetic: string;
  root: string;
  rootKey?: string;
  ukAudioUrl?: string;
  ukPhonetic?: string;
  usAudioUrl?: string;
  usPhonetic?: string;
  word: string;
};

export type VocabularyDefinitionGroup = {
  definitions: string[];
  partOfSpeech: string;
  text: string;
};

export type VocabularyInflection = {
  label: string;
  value: string;
};

export type VocabularyFormationPart = {
  href?: string;
  label: string;
};

export type VocabularyRootReference = {
  etymologySource: string;
  etymologySourceKey: string;
  formation: string;
  root: string;
  rootKey: string;
  sourceRowNumber: number;
};

export type VocabularyEtymologyReference = {
  etymologySource: string;
  etymologySourceKey: string;
  formation: string;
  sourceRowNumber: number;
};

type FlatVocabularyEntry = {
  antonym?: string[] | string;
  antonyms?: string[] | string;
  cambridgeExamples?: string[] | string;
  def?: string;
  definitionEn?: string;
  englishDefinition?: string;
  englishExamples?: string[] | string;
  enDef?: string;
  etymologyStory?: string;
  examples?: string[] | string;
  form?: string;
  gerund?: string;
  pastParticiple?: string;
  pastTense?: string;
  level?: string;
  plural?: string;
  pron?: string;
  presentParticiple?: string;
  review?: string[] | string;
  reviewNotes?: string[] | string;
  root?: string;
  rootStory?: string;
  source?: string;
  synonym?: string[] | string;
  synonyms?: string[] | string;
  thirdPerson?: string;
  thirdPersonSingular?: string;
  ukAudioUrl?: string;
  ukPron?: string;
  usAudioUrl?: string;
  usPron?: string;
  word?: string;
  wordStory?: string;
};

export type LocalVocabularyEntry = LocalVocabularyHint & {
  antonyms: string[];
  definitionGroups: VocabularyDefinitionGroup[];
  definitionLines: string[];
  englishDefinitions: string[];
  englishExamples: string[];
  etymologyStory: string;
  etymologyReferences: VocabularyEtymologyReference[];
  inflections: VocabularyInflection[];
  normalizedWord: string;
  reviewNotes: string[];
  rootReferences: VocabularyRootReference[];
  sourceRowNumber: number;
  synonyms: string[];
};

type EcdictEntry = {
  definition: string;
  exchange: string;
  phonetic: string;
  translation: string;
  word: string;
};

type DatabaseVocabularyEntry = {
  definition_cn: string | null;
  definition_en: string | null;
  level: string | null;
  part_of_speech: string | null;
  phonetic: string | null;
  uk_audio_url: string | null;
  uk_phonetic: string | null;
  us_audio_url: string | null;
  us_phonetic: string | null;
  word: string;
  word_forms: unknown;
};

type FreeDictionaryDefinition = {
  antonyms?: string[];
  definition?: string;
  example?: string;
  synonyms?: string[];
};

type FreeDictionaryMeaning = {
  antonyms?: string[];
  definitions?: FreeDictionaryDefinition[];
  partOfSpeech?: string;
  synonyms?: string[];
};

type FreeDictionaryEntry = {
  meanings?: FreeDictionaryMeaning[];
  phonetic?: string;
  phonetics?: Array<{
    audio?: string;
    text?: string;
  }>;
  word?: string;
};

export type VocabularySearchMatchType = "exact" | "prefix" | "fuzzy";

export type VocabularySearchResult = {
  entry: LocalVocabularyEntry;
  matchType: VocabularySearchMatchType;
};

export type VocabularyAutocompleteItem = {
  definition: string;
  definitionSearchText: string;
  level: string;
  normalizedWord: string;
  ukAudioUrl?: string;
  ukPhonetic?: string;
  usAudioUrl?: string;
  usPhonetic?: string;
  word: string;
};

export type VocabularyRootGroup = {
  entries: LocalVocabularyEntry[];
  rootKey: string;
  rootLabel: string;
};

export type VocabularyRootDirectory = {
  etymologySource: string;
  etymologySourceKey: string;
  groups: VocabularyRootGroup[];
  selectedRootKey: string;
  selectedRootLabel: string;
};

export type VocabularyEtymologyDirectory = {
  entries: LocalVocabularyEntry[];
  etymologySource: string;
  etymologySourceKey: string;
  groups: VocabularyRootGroup[];
};

const BUNDLED_VOCABULARY_SOURCE_PATH = resolve(process.cwd(), "src/data/vocabulary/flat-vocabulary.json");
const LOCAL_VOCABULARY_SOURCE_PATH =
  "/Users/shidianjin/Desktop/词源词根背单词/词源词根_平铺数据.json";
const VOCABULARY_SOURCE_PATH =
  process.env.VOCABULARY_SOURCE_PATH?.trim() ||
  (existsSync(BUNDLED_VOCABULARY_SOURCE_PATH) ? BUNDLED_VOCABULARY_SOURCE_PATH : LOCAL_VOCABULARY_SOURCE_PATH);
const ECDICT_SOURCE_PATH =
  process.env.ECDICT_SOURCE_PATH?.trim() || "/Users/shidianjin/Desktop/未命名文件夹/ecdict.csv";

let cachedVocabularyMap: Map<string, LocalVocabularyEntry> | null = null;
let cachedVocabularyEntries: LocalVocabularyEntry[] | null = null;
let cachedEcdictMap: Map<string, EcdictEntry> | null = null;
let cachedFormationTargetMap: Map<string, string> | null = null;

export function normalizeLookupWord(value: string) {
  return value.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, "");
}

function compactDefinition(definition: string) {
  return splitDefinition(definition).join(" / ");
}

function sanitizePhonetic(value?: string) {
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue || /dictionary\.cambridge\.org/i.test(normalizedValue) || /^https?:\/\//i.test(normalizedValue)) {
    return "";
  }

  return normalizedValue;
}

function sanitizeDefinitionLine(line: string) {
  const normalizedLine = normalizeDefinitionText(line);

  if (!normalizedLine || normalizedLine.includes("人名")) {
    return "";
  }

  return normalizedLine;
}

function splitDefinition(definition: string) {
  return definition
    .split(/\n+/)
    .map((line) => sanitizeDefinitionLine(line))
    .filter(Boolean);
}

function normalizeDirectoryKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeDefinitionText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getFormationLabels(value: string) {
  return value
    .split(/\s+\+\s+/)
    .map((label) => normalizeDefinitionText(label))
    .filter(Boolean);
}

function getFormationLabelByKey(value: string, key: string) {
  return getFormationLabels(value).find((label) => normalizeDirectoryKey(label) === key);
}

function formationIncludesKey(value: string, key: string) {
  return Boolean(getFormationLabelByKey(value, key));
}

function parseDefinitionLine(line: string) {
  const normalizedLine = normalizeDefinitionText(line);
  const match = normalizedLine.match(/^([a-z]+(?:\.[a-z]+)*\.|[a-z]+\.\s*[a-z]+\.)\s*(.+)$/i);

  if (!match) {
    return {
      definition: normalizedLine,
      partOfSpeech: "",
    };
  }

  return {
    definition: match[2].trim(),
    partOfSpeech: match[1].replace(/\s+/g, "").trim(),
  };
}

function splitDefinitionItems(value: string) {
  return value
    .split(/[；;]/)
    .map((item) => normalizeDefinitionText(item))
    .filter(Boolean);
}

function buildDefinitionGroups(lines: string[]) {
  const groupMap = new Map<string, { definitions: string[]; seenDefinitions: Set<string> }>();
  const orderedPartsOfSpeech: string[] = [];

  for (const line of lines) {
    const { definition, partOfSpeech } = parseDefinitionLine(line);
    const items = splitDefinitionItems(definition);

    if (!groupMap.has(partOfSpeech)) {
      groupMap.set(partOfSpeech, {
        definitions: [],
        seenDefinitions: new Set(),
      });
      orderedPartsOfSpeech.push(partOfSpeech);
    }

    const group = groupMap.get(partOfSpeech);

    if (!group) {
      continue;
    }

    for (const item of items.length > 0 ? items : [definition]) {
      const normalizedItem = normalizeDefinitionText(item);

      if (!normalizedItem || group.seenDefinitions.has(normalizedItem)) {
        continue;
      }

      group.definitions.push(normalizedItem);
      group.seenDefinitions.add(normalizedItem);
    }
  }

  return orderedPartsOfSpeech
    .map((partOfSpeech) => {
      const group = groupMap.get(partOfSpeech);
      const definitions = group?.definitions ?? [];

      return {
        definitions,
        partOfSpeech,
        text: partOfSpeech ? `${partOfSpeech} ${definitions.join("；")}` : definitions.join("；"),
      } satisfies VocabularyDefinitionGroup;
    })
    .filter((group) => group.definitions.length > 0);
}

function getVocabularyLevelScore(level?: string) {
  const normalizedLevel = level?.trim();

  if (!normalizedLevel) {
    return Number.MAX_SAFE_INTEGER;
  }

  const levelOrder: Record<string, number> = {
    小学: 1,
    初中: 2,
    高中: 3,
    四级: 4,
    六级: 5,
    考研: 6,
    托福: 7,
    雅思: 7,
    SAT: 8,
    GRE: 9,
  };

  return levelOrder[normalizedLevel] ?? 20;
}

type VocabularyAccumulator = {
  antonymKeys: Set<string>;
  antonyms: string[];
  definitionLineKeys: Set<string>;
  definitionLines: string[];
  englishDefinitionKeys: Set<string>;
  englishDefinitions: string[];
  englishExampleKeys: Set<string>;
  englishExamples: string[];
  etymologyStory: string;
  etymologySource: string;
  etymologySourceKey: string;
  etymologyReferences: VocabularyEtymologyReference[];
  etymologyReferenceKeys: Set<string>;
  formation: string;
  inflectionKeys: Set<string>;
  inflections: VocabularyInflection[];
  level: string;
  normalizedWord: string;
  phonetic: string;
  reviewNoteKeys: Set<string>;
  reviewNotes: string[];
  rootReferences: VocabularyRootReference[];
  rootReferenceKeys: Set<string>;
  sourceRowNumber: number;
  synonymKeys: Set<string>;
  synonyms: string[];
  ukAudioUrl: string;
  ukPhonetic: string;
  usAudioUrl: string;
  usPhonetic: string;
  word: string;
};

function pickPreferredLevel(currentLevel: string, nextLevel: string) {
  if (!currentLevel) {
    return nextLevel;
  }

  if (!nextLevel) {
    return currentLevel;
  }

  return getVocabularyLevelScore(nextLevel) < getVocabularyLevelScore(currentLevel) ? nextLevel : currentLevel;
}

function normalizeTextList(value?: string[] | string) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : value.split(/\n+/);

  return values
    .flatMap((item) => item.split(/[；;]/))
    .map((item) => normalizeDefinitionText(item))
    .filter(Boolean);
}

function parseCsvRows(value: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let isQuoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const nextCharacter = value[index + 1];

    if (character === "\"") {
      if (isQuoted && nextCharacter === "\"") {
        field += "\"";
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (character === "," && !isQuoted) {
      row.push(field);
      field = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !isQuoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += character;
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function loadEcdictMap() {
  if (cachedEcdictMap) {
    return cachedEcdictMap;
  }

  cachedEcdictMap = new Map();

  if (!existsSync(/* turbopackIgnore: true */ ECDICT_SOURCE_PATH)) {
    return cachedEcdictMap;
  }

  const rows = parseCsvRows(readFileSync(/* turbopackIgnore: true */ ECDICT_SOURCE_PATH, "utf8"));
  const header = rows[0] ?? [];
  const columnIndex = new Map(header.map((column, index) => [column, index]));

  for (const row of rows.slice(1)) {
    const word = normalizeLookupWord(row[columnIndex.get("word") ?? -1] ?? "");

    if (!word) {
      continue;
    }

    cachedEcdictMap.set(word, {
      definition: normalizeDefinitionText(row[columnIndex.get("definition") ?? -1] ?? ""),
      exchange: normalizeDefinitionText(row[columnIndex.get("exchange") ?? -1] ?? ""),
      phonetic: sanitizePhonetic(row[columnIndex.get("phonetic") ?? -1] ?? ""),
      translation: normalizeDefinitionText(row[columnIndex.get("translation") ?? -1] ?? ""),
      word,
    });
  }

  return cachedEcdictMap;
}

function splitEcdictEnglishDefinitions(value: string) {
  const wordnetPartOfSpeechLabels: Record<string, string> = {
    a: "adj.",
    n: "n.",
    r: "adv.",
    s: "adj.",
    v: "v.",
  };

  return value
    .replace(/\\n/g, "\n")
    .split(/\n+/)
    .map((line) => normalizeDefinitionText(line))
    .map((line) => {
      const match = line.match(/^([anrsv])(?:\.|\s)+(.+)$/i);

      if (!match) {
        return line;
      }

      return `${wordnetPartOfSpeechLabels[match[1].toLowerCase()] ?? ""} ${match[2]}`.trim();
    })
    .filter(Boolean);
}

function parseEcdictExchange(exchange: string) {
  const labelsByCode: Record<string, string[]> = {
    "3": ["三单"],
    d: ["过去分词"],
    i: ["现在分词", "动名词"],
    p: ["过去式"],
    r: ["比较级"],
    s: ["复数"],
    t: ["最高级"],
  };

  return exchange
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => {
      const [code, value] = item.split(":");
      const labels = labelsByCode[code];

      if (!labels || !value) {
        return [];
      }

      return value
        .split(";")
        .map((form) => normalizeDefinitionText(form))
        .filter(Boolean)
        .flatMap((form) => labels.map((label) => ({ label, value: form })));
    });
}

function collectEntryInflections(entry: FlatVocabularyEntry) {
  const rawInflections: VocabularyInflection[] = [
    { label: "三单", value: entry.thirdPersonSingular ?? entry.thirdPerson ?? "" },
    { label: "过去式", value: entry.pastTense ?? "" },
    { label: "过去分词", value: entry.pastParticiple ?? "" },
    { label: "现在分词", value: entry.presentParticiple ?? "" },
    { label: "动名词", value: entry.gerund ?? entry.presentParticiple ?? "" },
    { label: "复数", value: entry.plural ?? "" },
  ];

  return rawInflections
    .map((item) => ({ ...item, value: normalizeDefinitionText(item.value) }))
    .filter((item) => item.value);
}

const INFLECTION_LABEL_ORDER = new Map(
  ["三单", "过去式", "过去分词", "现在分词", "动名词", "比较级", "最高级", "复数"].map((label, index) => [
    label,
    index,
  ]),
);

function sortInflections(inflections: VocabularyInflection[]) {
  return [...inflections].sort((a, b) => {
    const orderA = INFLECTION_LABEL_ORDER.get(a.label) ?? 80;
    const orderB = INFLECTION_LABEL_ORDER.get(b.label) ?? 80;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.value.localeCompare(b.value);
  });
}

function loadVocabularyEntries() {
  if (cachedVocabularyEntries) {
    return cachedVocabularyEntries;
  }

  cachedVocabularyEntries = [];

  if (!existsSync(VOCABULARY_SOURCE_PATH)) {
    return cachedVocabularyEntries;
  }

  const rawEntries = JSON.parse(readFileSync(VOCABULARY_SOURCE_PATH, "utf8")) as FlatVocabularyEntry[];
  const ecdictMap = loadEcdictMap();
  const vocabularyMap = new Map<string, VocabularyAccumulator>();

  for (const [index, entry] of rawEntries.entries()) {
    const normalizedWord = normalizeLookupWord(entry.word ?? "");
    const definitionLines = splitDefinition(entry.def ?? "");
    const definition = compactDefinition(entry.def ?? "");
    const ecdictEntry = ecdictMap.get(normalizedWord);

    if (!normalizedWord || !definition) {
      continue;
    }

    const root = entry.root?.trim() ?? "";
    const etymologySource = entry.source?.trim() ?? "";
    const phonetic = sanitizePhonetic(entry.pron);
    const ukPhonetic = sanitizePhonetic(entry.ukPron) || phonetic;
    const usPhonetic = sanitizePhonetic(entry.usPron) || phonetic;
    const rootKey = root ? normalizeDirectoryKey(root) : "";
    const etymologySourceKey = etymologySource ? normalizeDirectoryKey(etymologySource) : "";

    const accumulator =
      vocabularyMap.get(normalizedWord) ??
      ({
        antonymKeys: new Set<string>(),
        antonyms: [],
        definitionLineKeys: new Set<string>(),
        definitionLines: [],
        englishDefinitionKeys: new Set<string>(),
        englishDefinitions: [],
        englishExampleKeys: new Set<string>(),
        englishExamples: [],
        etymologyStory: normalizeDefinitionText(entry.etymologyStory ?? entry.wordStory ?? entry.rootStory ?? ""),
        etymologySource,
        etymologySourceKey,
        etymologyReferences: [],
        etymologyReferenceKeys: new Set<string>(),
        formation: entry.form?.trim() ?? "",
        inflectionKeys: new Set<string>(),
        inflections: [],
        level: entry.level?.trim() ?? "",
        normalizedWord,
        phonetic,
        reviewNoteKeys: new Set<string>(),
        reviewNotes: [],
        rootReferences: [],
        rootReferenceKeys: new Set<string>(),
        sourceRowNumber: index + 2,
        synonymKeys: new Set<string>(),
        synonyms: [],
        ukAudioUrl: entry.ukAudioUrl ?? "",
        ukPhonetic,
        usAudioUrl: entry.usAudioUrl ?? "",
        usPhonetic,
        word: normalizedWord,
      } satisfies VocabularyAccumulator);

    for (const line of definitionLines.length > 0 ? definitionLines : [definition]) {
      const normalizedLine = normalizeDefinitionText(line);

      if (!normalizedLine || accumulator.definitionLineKeys.has(normalizedLine)) {
        continue;
      }

      accumulator.definitionLines.push(normalizedLine);
      accumulator.definitionLineKeys.add(normalizedLine);
    }

    for (const inflection of collectEntryInflections(entry)) {
      const inflectionKey = `${inflection.label}:${inflection.value}`;

      if (accumulator.inflectionKeys.has(inflectionKey)) {
        continue;
      }

      accumulator.inflections.push(inflection);
      accumulator.inflectionKeys.add(inflectionKey);
    }

    for (const inflection of ecdictEntry ? parseEcdictExchange(ecdictEntry.exchange) : []) {
      const inflectionKey = `${inflection.label}:${inflection.value}`;

      if (accumulator.inflectionKeys.has(inflectionKey)) {
        continue;
      }

      accumulator.inflections.push(inflection);
      accumulator.inflectionKeys.add(inflectionKey);
    }

    for (const englishDefinition of normalizeTextList(entry.englishDefinition ?? entry.definitionEn ?? entry.enDef)) {
      if (accumulator.englishDefinitionKeys.has(englishDefinition)) {
        continue;
      }

      accumulator.englishDefinitions.push(englishDefinition);
      accumulator.englishDefinitionKeys.add(englishDefinition);
    }

    for (const englishDefinition of ecdictEntry ? splitEcdictEnglishDefinitions(ecdictEntry.definition) : []) {
      if (accumulator.englishDefinitionKeys.has(englishDefinition)) {
        continue;
      }

      accumulator.englishDefinitions.push(englishDefinition);
      accumulator.englishDefinitionKeys.add(englishDefinition);
    }

    for (const englishExample of normalizeTextList(entry.cambridgeExamples ?? entry.englishExamples ?? entry.examples)) {
      if (accumulator.englishExampleKeys.has(englishExample)) {
        continue;
      }

      accumulator.englishExamples.push(englishExample);
      accumulator.englishExampleKeys.add(englishExample);
    }

    for (const synonym of normalizeTextList(entry.synonyms ?? entry.synonym)) {
      if (accumulator.synonymKeys.has(synonym)) {
        continue;
      }

      accumulator.synonyms.push(synonym);
      accumulator.synonymKeys.add(synonym);
    }

    for (const antonym of normalizeTextList(entry.antonyms ?? entry.antonym)) {
      if (accumulator.antonymKeys.has(antonym)) {
        continue;
      }

      accumulator.antonyms.push(antonym);
      accumulator.antonymKeys.add(antonym);
    }

    for (const reviewNote of normalizeTextList(entry.reviewNotes ?? entry.review)) {
      if (accumulator.reviewNoteKeys.has(reviewNote)) {
        continue;
      }

      accumulator.reviewNotes.push(reviewNote);
      accumulator.reviewNoteKeys.add(reviewNote);
    }

    if (!accumulator.etymologyStory) {
      accumulator.etymologyStory = normalizeDefinitionText(entry.etymologyStory ?? entry.wordStory ?? entry.rootStory ?? "");
    }

    accumulator.level = pickPreferredLevel(accumulator.level, entry.level?.trim() ?? "");

    if (!accumulator.phonetic && phonetic) {
      accumulator.phonetic = phonetic;
    }

    if (!accumulator.ukPhonetic) {
      accumulator.ukPhonetic = ukPhonetic;
    }

    if (!accumulator.usPhonetic) {
      accumulator.usPhonetic = usPhonetic;
    }

    if (!accumulator.ukAudioUrl && entry.ukAudioUrl) {
      accumulator.ukAudioUrl = entry.ukAudioUrl;
    }

    if (!accumulator.usAudioUrl && entry.usAudioUrl) {
      accumulator.usAudioUrl = entry.usAudioUrl;
    }

    const etymologyReferenceKey = `${etymologySourceKey}:${entry.form?.trim() ?? ""}`;

    if (etymologySource && etymologySourceKey && !accumulator.etymologyReferenceKeys.has(etymologyReferenceKey)) {
      accumulator.etymologyReferences.push({
        etymologySource,
        etymologySourceKey,
        formation: entry.form?.trim() ?? "",
        sourceRowNumber: index + 2,
      });
      accumulator.etymologyReferenceKeys.add(etymologyReferenceKey);
    }

    const rootReferenceKey = `${etymologySourceKey}:${rootKey}:${entry.form?.trim() ?? ""}`;

    if (root && rootKey && !accumulator.rootReferenceKeys.has(rootReferenceKey)) {
      accumulator.rootReferences.push({
        etymologySource,
        etymologySourceKey,
        formation: entry.form?.trim() ?? "",
        root,
        rootKey,
        sourceRowNumber: index + 2,
      });
      accumulator.rootReferenceKeys.add(rootReferenceKey);
    }

    if (!accumulator.rootReferences.length && etymologySource && !accumulator.etymologySource) {
      accumulator.etymologySource = etymologySource;
      accumulator.etymologySourceKey = etymologySourceKey;
    }

    if (!accumulator.formation && entry.form) {
      accumulator.formation = entry.form.trim();
    }

    vocabularyMap.set(normalizedWord, accumulator);
  }

  cachedVocabularyEntries = [...vocabularyMap.values()].map((accumulator) => {
    const definitionGroups = buildDefinitionGroups(accumulator.definitionLines);
    const primaryEtymologyReference = accumulator.etymologyReferences[0];
    const primaryRootReference = accumulator.rootReferences[0];

    return {
      definitionCn:
        definitionGroups.length > 0
          ? definitionGroups.map((group) => group.text).join(" / ")
          : accumulator.definitionLines.join(" / "),
      antonyms: accumulator.antonyms,
      definitionGroups,
      definitionLines:
        definitionGroups.length > 0
          ? definitionGroups.map((group) => group.text)
          : accumulator.definitionLines,
      englishDefinitions: accumulator.englishDefinitions,
      englishExamples: accumulator.englishExamples,
      etymologyStory: accumulator.etymologyStory,
      etymologyReferences: accumulator.etymologyReferences,
      etymologySource: primaryEtymologyReference?.etymologySource ?? accumulator.etymologySource,
      etymologySourceKey: primaryEtymologyReference?.etymologySourceKey ?? accumulator.etymologySourceKey,
      formation: primaryEtymologyReference?.formation ?? primaryRootReference?.formation ?? accumulator.formation,
      inflections: sortInflections(accumulator.inflections),
      level: accumulator.level,
      normalizedWord: accumulator.normalizedWord,
      partOfSpeech: definitionGroups[0]?.partOfSpeech ?? "词性待补充",
      phonetic: accumulator.phonetic,
      reviewNotes: accumulator.reviewNotes,
      root: primaryRootReference?.root ?? "",
      rootKey: primaryRootReference?.rootKey ?? "",
      rootReferences: accumulator.rootReferences,
      sourceRowNumber: accumulator.sourceRowNumber,
      synonyms: accumulator.synonyms,
      ukAudioUrl: accumulator.ukAudioUrl,
      ukPhonetic: accumulator.ukPhonetic,
      usAudioUrl: accumulator.usAudioUrl,
      usPhonetic: accumulator.usPhonetic,
      word: accumulator.word,
    } satisfies LocalVocabularyEntry;
  });

  cachedVocabularyEntries.sort((a, b) => {
    const levelDelta = getVocabularyLevelScore(a.level) - getVocabularyLevelScore(b.level);

    if (levelDelta !== 0) {
      return levelDelta;
    }

    return a.word.localeCompare(b.word);
  });

  return cachedVocabularyEntries;
}

function loadFormationTargetMap() {
  if (cachedFormationTargetMap) {
    return cachedFormationTargetMap;
  }

  cachedFormationTargetMap = new Map();

  for (const entry of loadVocabularyEntries()) {
    for (const reference of entry.rootReferences) {
      if (reference.root && reference.rootKey) {
        cachedFormationTargetMap.set(
          normalizeDirectoryKey(reference.root),
          `/vocabulary/roots/${reference.rootKey}#root-${reference.rootKey}`,
        );
      }
    }

    for (const reference of entry.etymologyReferences) {
      if (reference.etymologySource && reference.etymologySourceKey) {
        cachedFormationTargetMap.set(
          normalizeDirectoryKey(reference.etymologySource),
          `/vocabulary/etymologies/${reference.etymologySourceKey}`,
        );
      }
    }

    for (const label of getFormationLabels(entry.formation)) {
      const key = normalizeDirectoryKey(label);

      if (key && !cachedFormationTargetMap.has(key)) {
        cachedFormationTargetMap.set(key, `/vocabulary/etymologies/${key}`);
      }
    }
  }

  return cachedFormationTargetMap;
}

export function getVocabularyFormationParts(entry: LocalVocabularyEntry): VocabularyFormationPart[] {
  if (!entry.formation) {
    return [];
  }

  const targetMap = loadFormationTargetMap();

  return entry.formation
    .split(/\s+\+\s+/)
    .map((label) => normalizeDefinitionText(label))
    .filter(Boolean)
    .map((label) => ({
      href: targetMap.get(normalizeDirectoryKey(label)),
      label,
    }));
}

function loadVocabularyMap() {
  if (cachedVocabularyMap) {
    return cachedVocabularyMap;
  }

  cachedVocabularyMap = new Map();

  for (const entry of loadVocabularyEntries()) {
    cachedVocabularyMap.set(entry.normalizedWord, entry);
  }

  return cachedVocabularyMap;
}

function formatHintPhonetic(value: string) {
  const phonetic = sanitizePhonetic(value).replace(/[\[\]]/g, "").replace(/^\/+|\/+$/g, "").trim();

  return phonetic ? `/ ${phonetic} /` : "";
}

function createEcdictVocabularyEntry(entry: EcdictEntry): LocalVocabularyEntry {
  const definitionLines = entry.translation
    .replace(/\\n/g, "\n")
    .split(/\n+/)
    .map((line) => sanitizeDefinitionLine(line))
    .filter(Boolean);
  const definitionGroups = buildDefinitionGroups(definitionLines);
  const englishDefinitions = splitEcdictEnglishDefinitions(entry.definition);
  const phonetic = formatHintPhonetic(entry.phonetic);

  return {
    antonyms: [],
    definitionCn:
      definitionGroups.length > 0
        ? definitionGroups.map((group) => group.text).join(" / ")
        : definitionLines.join(" / "),
    definitionGroups,
    definitionLines:
      definitionGroups.length > 0
        ? definitionGroups.map((group) => group.text)
        : definitionLines,
    englishDefinitions,
    englishExamples: [],
    etymologySource: "",
    etymologyStory: "",
    etymologyReferences: [],
    formation: "",
    inflections: sortInflections(parseEcdictExchange(entry.exchange)),
    level: "",
    normalizedWord: entry.word,
    partOfSpeech: definitionGroups[0]?.partOfSpeech || "",
    phonetic,
    reviewNotes: [],
    root: "",
    rootReferences: [],
    sourceRowNumber: 0,
    synonyms: [],
    ukPhonetic: phonetic,
    usPhonetic: phonetic,
    word: entry.word,
  };
}

function normalizeDatabaseWordForms(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return sortInflections(
    Object.entries(value)
      .flatMap(([label, rawValue]) => {
        if (typeof rawValue !== "string") {
          return [];
        }

        return rawValue
          .split(";")
          .map((item) => normalizeDefinitionText(item))
          .filter(Boolean)
          .map((item) => ({ label, value: item }));
      }),
  );
}

function createDatabaseVocabularyEntry(entry: DatabaseVocabularyEntry): LocalVocabularyEntry {
  const definitionLines = (entry.definition_cn ?? "")
    .replace(/\\n/g, "\n")
    .split(/\n+/)
    .map((line) => sanitizeDefinitionLine(line))
    .filter(Boolean);
  const definitionGroups = buildDefinitionGroups(definitionLines);
  const phonetic = formatHintPhonetic(entry.phonetic ?? "");
  const ukPhonetic = formatHintPhonetic(entry.uk_phonetic ?? "") || phonetic;
  const usPhonetic = formatHintPhonetic(entry.us_phonetic ?? "") || phonetic;
  const normalizedWord = normalizeLookupWord(entry.word);

  return {
    antonyms: [],
    definitionCn:
      definitionGroups.length > 0
        ? definitionGroups.map((group) => group.text).join(" / ")
        : definitionLines.join(" / "),
    definitionGroups,
    definitionLines:
      definitionGroups.length > 0
        ? definitionGroups.map((group) => group.text)
        : definitionLines,
    englishDefinitions: splitEcdictEnglishDefinitions(entry.definition_en ?? ""),
    englishExamples: [],
    etymologySource: "",
    etymologyStory: "",
    etymologyReferences: [],
    formation: "",
    inflections: normalizeDatabaseWordForms(entry.word_forms),
    level: entry.level?.trim() ?? "",
    normalizedWord,
    partOfSpeech: entry.part_of_speech?.trim() || definitionGroups[0]?.partOfSpeech || "",
    phonetic,
    reviewNotes: [],
    root: "",
    rootReferences: [],
    sourceRowNumber: 0,
    synonyms: [],
    ukAudioUrl: entry.uk_audio_url?.trim() || undefined,
    ukPhonetic,
    usAudioUrl: entry.us_audio_url?.trim() || undefined,
    usPhonetic,
    word: normalizedWord,
  };
}

function mergeVocabularyEntries(
  primary: LocalVocabularyEntry,
  supplemental: LocalVocabularyEntry,
): LocalVocabularyEntry {
  const inflectionKeys = new Set<string>();
  const inflections = [...primary.inflections, ...supplemental.inflections].filter(
    (inflection) => {
      const key = `${inflection.label}:${inflection.value}`.toLowerCase();

      if (inflectionKeys.has(key)) {
        return false;
      }

      inflectionKeys.add(key);
      return true;
    },
  );

  return {
    ...supplemental,
    ...primary,
    antonyms: uniqueNormalizedValues([
      ...primary.antonyms,
      ...supplemental.antonyms,
    ]),
    englishDefinitions: uniqueNormalizedValues([
      ...primary.englishDefinitions,
      ...supplemental.englishDefinitions,
    ]),
    englishExamples: uniqueNormalizedValues([
      ...primary.englishExamples,
      ...supplemental.englishExamples,
    ]),
    inflections: sortInflections(inflections),
    synonyms: uniqueNormalizedValues([
      ...primary.synonyms,
      ...supplemental.synonyms,
    ]),
    ukAudioUrl: primary.ukAudioUrl || supplemental.ukAudioUrl,
    ukPhonetic: primary.ukPhonetic || supplemental.ukPhonetic,
    usAudioUrl: primary.usAudioUrl || supplemental.usAudioUrl,
    usPhonetic: primary.usPhonetic || supplemental.usPhonetic,
  };
}

function normalizeDictionaryAudioUrl(value?: string) {
  const audioUrl = value?.trim() ?? "";

  if (audioUrl.startsWith("//")) {
    return `https:${audioUrl}`;
  }

  return /^https:\/\//i.test(audioUrl) ? audioUrl : "";
}

function getFreeDictionaryPartOfSpeech(value?: string) {
  const labels: Record<string, string> = {
    adjective: "adj.",
    adverb: "adv.",
    conjunction: "conj.",
    exclamation: "int.",
    interjection: "int.",
    noun: "n.",
    preposition: "prep.",
    pronoun: "pron.",
    verb: "v.",
  };

  return labels[value?.trim().toLowerCase() ?? ""] ?? "";
}

function uniqueNormalizedValues(values: Array<string | undefined>) {
  const seen = new Set<string>();

  return values
    .map((value) => normalizeDefinitionText(value ?? ""))
    .filter((value) => {
      const key = value.toLowerCase();

      if (!value || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function createFreeDictionaryVocabularyEntry(
  responseEntry: FreeDictionaryEntry,
  requestedWord: string,
): LocalVocabularyEntry | null {
  const normalizedWord = normalizeLookupWord(responseEntry.word ?? requestedWord);

  if (!normalizedWord) {
    return null;
  }

  const meanings = responseEntry.meanings ?? [];
  const englishDefinitions = meanings.flatMap((meaning) => {
    const partOfSpeech = getFreeDictionaryPartOfSpeech(meaning.partOfSpeech);

    return (meaning.definitions ?? [])
      .map((item) => normalizeDefinitionText(item.definition ?? ""))
      .filter(Boolean)
      .map((definition) => `${partOfSpeech} ${definition}`.trim());
  });

  if (englishDefinitions.length === 0) {
    return null;
  }

  const phonetics = responseEntry.phonetics ?? [];
  const phonetic = formatHintPhonetic(
    responseEntry.phonetic ?? phonetics.find((item) => item.text?.trim())?.text ?? "",
  );
  const audioUrls = uniqueNormalizedValues(
    phonetics.map((item) => normalizeDictionaryAudioUrl(item.audio)),
  );
  const ukAudioUrl =
    audioUrls.find((url) => /(?:^|[\/_-])(?:uk|gb|british)(?:[\/_.-]|$)/i.test(url)) ??
    audioUrls[0];
  const usAudioUrl =
    audioUrls.find((url) => /(?:^|[\/_-])(?:us|american)(?:[\/_.-]|$)/i.test(url)) ??
    audioUrls.find((url) => url !== ukAudioUrl) ??
    audioUrls[0];
  const firstPartOfSpeech = getFreeDictionaryPartOfSpeech(meanings[0]?.partOfSpeech);
  const englishExamples = uniqueNormalizedValues(
    meanings.flatMap((meaning) => (meaning.definitions ?? []).map((item) => item.example)),
  );
  const synonyms = uniqueNormalizedValues(
    meanings.flatMap((meaning) => [
      ...(meaning.synonyms ?? []),
      ...(meaning.definitions ?? []).flatMap((item) => item.synonyms ?? []),
    ]),
  );
  const antonyms = uniqueNormalizedValues(
    meanings.flatMap((meaning) => [
      ...(meaning.antonyms ?? []),
      ...(meaning.definitions ?? []).flatMap((item) => item.antonyms ?? []),
    ]),
  );
  const fallbackDefinition = "暂缺中文释义，请参考下方英文释义。";

  return {
    antonyms,
    definitionCn: fallbackDefinition,
    definitionGroups: [],
    definitionLines: [fallbackDefinition],
    englishDefinitions,
    englishExamples,
    etymologySource: "",
    etymologyStory: "",
    etymologyReferences: [],
    formation: "",
    inflections: [],
    level: "",
    normalizedWord,
    partOfSpeech: firstPartOfSpeech,
    phonetic,
    reviewNotes: [],
    root: "",
    rootReferences: [],
    sourceRowNumber: 0,
    synonyms,
    ukAudioUrl,
    ukPhonetic: phonetic,
    usAudioUrl,
    usPhonetic: phonetic,
    word: normalizedWord,
  };
}

async function getDatabaseVocabularyEntry(candidates: string[]) {
  const { data, error } = await supabase
    .from("vocabulary_entries")
    .select(
      "word, phonetic, uk_phonetic, us_phonetic, part_of_speech, definition_cn, definition_en, uk_audio_url, us_audio_url, level, word_forms",
    )
    .in("word", candidates);

  if (error || !data) {
    return null;
  }

  const rowsByWord = new Map(
    (data as DatabaseVocabularyEntry[]).map((entry) => [normalizeLookupWord(entry.word), entry]),
  );

  for (const candidate of candidates) {
    const entry = rowsByWord.get(candidate);

    if (entry) {
      return createDatabaseVocabularyEntry(entry);
    }
  }

  return null;
}

async function getFreeDictionaryVocabularyEntry(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(candidate)}`,
        {
          next: { revalidate: 60 * 60 * 24 * 30 },
          signal: AbortSignal.timeout(6_000),
        },
      );

      if (!response.ok) {
        continue;
      }

      const entries = (await response.json()) as FreeDictionaryEntry[];
      const exactEntry =
        entries.find((entry) => normalizeLookupWord(entry.word ?? "") === candidate) ??
        entries[0];
      const vocabularyEntry = exactEntry
        ? createFreeDictionaryVocabularyEntry(exactEntry, candidate)
        : null;

      if (vocabularyEntry) {
        return vocabularyEntry;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function getVocabularyLookupCandidates(value: string) {
  const normalizedWord = normalizeLookupWord(value);
  const candidates = new Set<string>();
  const addCandidate = (candidate: string) => {
    const normalizedCandidate = normalizeLookupWord(candidate);
    if (normalizedCandidate.length > 1) {
      candidates.add(normalizedCandidate);
    }
  };

  addCandidate(normalizedWord);

  if (normalizedWord.endsWith("ies") && normalizedWord.length > 4) {
    addCandidate(`${normalizedWord.slice(0, -3)}y`);
  }
  if (normalizedWord.endsWith("ves") && normalizedWord.length > 4) {
    addCandidate(`${normalizedWord.slice(0, -3)}f`);
    addCandidate(`${normalizedWord.slice(0, -3)}fe`);
  }
  if (normalizedWord.endsWith("es") && normalizedWord.length > 3) {
    addCandidate(normalizedWord.slice(0, -2));
    addCandidate(normalizedWord.slice(0, -1));
  }
  if (normalizedWord.endsWith("s") && !normalizedWord.endsWith("ss")) {
    addCandidate(normalizedWord.slice(0, -1));
  }
  if (normalizedWord.endsWith("ied") && normalizedWord.length > 4) {
    addCandidate(`${normalizedWord.slice(0, -3)}y`);
  }
  if (normalizedWord.endsWith("ed") && normalizedWord.length > 3) {
    const stem = normalizedWord.slice(0, -2);
    addCandidate(stem);
    addCandidate(`${stem}e`);
    if (stem.at(-1) === stem.at(-2)) {
      addCandidate(stem.slice(0, -1));
    }
  }
  if (normalizedWord.endsWith("ing") && normalizedWord.length > 5) {
    const stem = normalizedWord.slice(0, -3);
    addCandidate(stem);
    addCandidate(`${stem}e`);
    if (stem.at(-1) === stem.at(-2)) {
      addCandidate(stem.slice(0, -1));
    }
  }

  return [...candidates];
}

function findVocabularyEntry(value: string) {
  const localMap = loadVocabularyMap();
  const ecdictMap = loadEcdictMap();

  for (const candidate of getVocabularyLookupCandidates(value)) {
    const localEntry = localMap.get(candidate);
    if (localEntry) {
      return localEntry;
    }

    const ecdictEntry = ecdictMap.get(candidate);
    if (ecdictEntry) {
      return createEcdictVocabularyEntry(ecdictEntry);
    }
  }

  return null;
}

export function getVocabularyHint(word: string): LocalVocabularyHint | null {
  return findVocabularyEntry(word);
}

function getBoundedLevenshteinDistance(a: string, b: string, maxDistance: number) {
  if (Math.abs(a.length - b.length) > maxDistance) {
    return maxDistance + 1;
  }

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    let rowMinimum = previous[0];

    for (let j = 1; j <= b.length; j += 1) {
      const oldPrevious = previous[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + cost);
      diagonal = oldPrevious;
      rowMinimum = Math.min(rowMinimum, previous[j]);
    }

    if (rowMinimum > maxDistance) {
      return maxDistance + 1;
    }
  }

  return previous[b.length];
}

function extractWordsFromText(value: string) {
  return value
    .match(/[A-Za-z]+(?:['’-][A-Za-z]+)?/g)
    ?.map(normalizeLookupWord)
    .filter(Boolean) ?? [];
}

export function getVocabularyHintsForTexts(texts: string[]) {
  const requestedWords = new Set(texts.flatMap(extractWordsFromText));
  const hints: Record<string, LocalVocabularyHint> = {};

  for (const word of requestedWords) {
    const hint = getVocabularyHint(word);

    if (hint) {
      hints[word] = hint;
    }
  }

  return hints;
}

export function getVocabularyEntry(word: string) {
  const normalizedWord = normalizeLookupWord(word);

  if (!normalizedWord) {
    return null;
  }

  return findVocabularyEntry(normalizedWord);
}

export async function getExtendedVocabularyEntry(word: string) {
  const normalizedWord = normalizeLookupWord(word);

  if (!normalizedWord) {
    return null;
  }

  const candidates = getVocabularyLookupCandidates(normalizedWord);
  const localEntry = getVocabularyEntry(normalizedWord);
  const databaseEntry = await getDatabaseVocabularyEntry(candidates);

  if (localEntry && databaseEntry) {
    return mergeVocabularyEntries(localEntry, databaseEntry);
  }

  if (localEntry) {
    return localEntry;
  }

  if (databaseEntry) {
    return databaseEntry;
  }

  return getFreeDictionaryVocabularyEntry(candidates);
}

export function getVocabularyAutocompleteItems(): VocabularyAutocompleteItem[] {
  return loadVocabularyEntries()
    .map((entry) => ({
      definition: entry.definitionLines[0] ?? entry.definitionCn,
      definitionSearchText: entry.definitionCn.toLowerCase().replace(/\s+/g, ""),
      level: entry.level,
      normalizedWord: entry.normalizedWord,
      ukAudioUrl: entry.ukAudioUrl,
      ukPhonetic: entry.ukPhonetic,
      usAudioUrl: entry.usAudioUrl,
      usPhonetic: entry.usPhonetic,
      word: entry.word,
    }))
    .sort((a, b) => a.word.localeCompare(b.word));
}

export function getFeaturedVocabularyEntries(limit = 9) {
  return loadVocabularyEntries().slice(0, limit);
}

export function getVocabularySearchResults(query: string, limit = 20) {
  const normalizedQuery = normalizeLookupWord(query);

  if (!normalizedQuery) {
    return [];
  }

  const entries = loadVocabularyEntries();
  const results: VocabularySearchResult[] = [];
  const seenWords = new Set<string>();
  const exactMatch = getVocabularyEntry(normalizedQuery);

  if (exactMatch) {
    results.push({ entry: exactMatch, matchType: "exact" });
    seenWords.add(exactMatch.normalizedWord);
  }

  for (const entry of entries) {
    if (results.length >= limit) {
      break;
    }

    if (!seenWords.has(entry.normalizedWord) && entry.normalizedWord.startsWith(normalizedQuery)) {
      results.push({ entry, matchType: "prefix" });
      seenWords.add(entry.normalizedWord);
    }
  }

  if (results.length < limit && normalizedQuery.length >= 3) {
    const maxDistance = normalizedQuery.length <= 5 ? 1 : 2;
    const fuzzyResults = entries
      .filter((entry) => !seenWords.has(entry.normalizedWord))
      .map((entry) => ({
        distance: getBoundedLevenshteinDistance(normalizedQuery, entry.normalizedWord, maxDistance),
        entry,
      }))
      .filter((result) => result.distance <= maxDistance)
      .sort((a, b) => {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }

        return a.entry.normalizedWord.localeCompare(b.entry.normalizedWord);
      })
      .slice(0, limit - results.length);

    for (const result of fuzzyResults) {
      results.push({ entry: result.entry, matchType: "fuzzy" });
    }
  }

  return results;
}

function getEntryEtymologySortRow(entry: LocalVocabularyEntry, etymologySourceKey: string) {
  const matchingRows = entry.etymologyReferences
    .filter((reference) => reference.etymologySourceKey === etymologySourceKey)
    .map((reference) => reference.sourceRowNumber);

  return Math.min(...(matchingRows.length > 0 ? matchingRows : [entry.sourceRowNumber]));
}

function getEntryRootSortRow(entry: LocalVocabularyEntry, etymologySourceKey: string, rootKey: string) {
  if (rootKey === "ungrouped") {
    return getEntryEtymologySortRow(entry, etymologySourceKey);
  }

  const matchingRows = entry.rootReferences
    .filter(
      (reference) =>
        reference.etymologySourceKey === etymologySourceKey && reference.rootKey === rootKey,
    )
    .map((reference) => reference.sourceRowNumber);

  return Math.min(...(matchingRows.length > 0 ? matchingRows : [getEntryEtymologySortRow(entry, etymologySourceKey)]));
}

function getEntryFormationSortRow(entry: LocalVocabularyEntry, formationKey: string) {
  const matchingRows = [...entry.etymologyReferences, ...entry.rootReferences]
    .filter((reference) => formationIncludesKey(reference.formation, formationKey))
    .map((reference) => reference.sourceRowNumber);

  return Math.min(...(matchingRows.length > 0 ? matchingRows : [entry.sourceRowNumber]));
}

function getEntryFormationRootSortRow(entry: LocalVocabularyEntry, formationKey: string, rootKey: string) {
  if (rootKey === "ungrouped") {
    return getEntryFormationSortRow(entry, formationKey);
  }

  const matchingRows = entry.rootReferences
    .filter((reference) => reference.rootKey === rootKey && formationIncludesKey(reference.formation, formationKey))
    .map((reference) => reference.sourceRowNumber);

  return Math.min(...(matchingRows.length > 0 ? matchingRows : [getEntryFormationSortRow(entry, formationKey)]));
}

function isPieRootLabel(rootLabel: string) {
  return /^PIE\b/i.test(rootLabel.trim());
}

export function getVocabularyEtymologyDirectory(sourceKey: string): VocabularyEtymologyDirectory | null {
  const normalizedSourceKey = normalizeDirectoryKey(sourceKey);

  if (!normalizedSourceKey) {
    return null;
  }

  const entries = loadVocabularyEntries();
  const directlyMatchedEntries = entries
    .filter((entry) =>
      entry.etymologyReferences.some((reference) => reference.etymologySourceKey === normalizedSourceKey),
    )
    .sort(
      (a, b) =>
        getEntryEtymologySortRow(a, normalizedSourceKey) -
        getEntryEtymologySortRow(b, normalizedSourceKey),
    );
  const firstReference = directlyMatchedEntries
    .flatMap((entry) => entry.etymologyReferences)
    .find((reference) => reference.etymologySourceKey === normalizedSourceKey);
  const isFormationDirectory = !firstReference;
  const matchedEntries = (isFormationDirectory
    ? entries
        .filter((entry) =>
          [...entry.etymologyReferences, ...entry.rootReferences].some((reference) =>
            formationIncludesKey(reference.formation, normalizedSourceKey),
          ),
        )
        .sort(
          (a, b) =>
            getEntryFormationSortRow(a, normalizedSourceKey) -
            getEntryFormationSortRow(b, normalizedSourceKey),
        )
    : directlyMatchedEntries
  );
  const formationLabel = isFormationDirectory
    ? matchedEntries
        .flatMap((entry) => [...entry.etymologyReferences, ...entry.rootReferences])
        .map((reference) => getFormationLabelByKey(reference.formation, normalizedSourceKey))
        .find(Boolean)
    : "";

  if (!firstReference && !formationLabel) {
    return null;
  }

  const groupMap = new Map<string, VocabularyRootGroup>();
  const groupSortRows = new Map<string, number>();
  const groupWordKeys = new Map<string, Set<string>>();

  for (const entry of matchedEntries) {
    const matchingRootReferences = entry.rootReferences.filter((reference) =>
      isFormationDirectory
        ? formationIncludesKey(reference.formation, normalizedSourceKey)
        : reference.etymologySourceKey === normalizedSourceKey,
    );
    const etymologySortRow = isFormationDirectory
      ? getEntryFormationSortRow(entry, normalizedSourceKey)
      : getEntryEtymologySortRow(entry, normalizedSourceKey);
    const referencesForGrouping: Array<{ root: string; rootKey: string; sourceRowNumber: number }> =
      matchingRootReferences.length > 0
        ? matchingRootReferences
        : [{ root: "未分词根", rootKey: "ungrouped", sourceRowNumber: etymologySortRow }];

    for (const reference of referencesForGrouping) {
      const key = reference.rootKey;
      const currentGroup =
        groupMap.get(key) ??
        ({
          entries: [],
          rootKey: key,
          rootLabel: reference.root,
        } satisfies VocabularyRootGroup);
      const wordKeys = groupWordKeys.get(key) ?? new Set<string>();

      if (!wordKeys.has(entry.normalizedWord)) {
        currentGroup.entries.push(entry);
        wordKeys.add(entry.normalizedWord);
      }

      groupWordKeys.set(key, wordKeys);
      groupMap.set(key, currentGroup);
      groupSortRows.set(key, Math.min(groupSortRows.get(key) ?? Number.MAX_SAFE_INTEGER, reference.sourceRowNumber));
    }
  }

  const groups = [...groupMap.values()]
    .map((group) => ({
      ...group,
      entries: [...group.entries].sort(
        (a, b) =>
          (isFormationDirectory
            ? getEntryFormationRootSortRow(a, normalizedSourceKey, group.rootKey)
            : getEntryRootSortRow(a, normalizedSourceKey, group.rootKey)) -
          (isFormationDirectory
            ? getEntryFormationRootSortRow(b, normalizedSourceKey, group.rootKey)
            : getEntryRootSortRow(b, normalizedSourceKey, group.rootKey)),
      ),
    }))
    .sort((a, b) => {
      if (a.rootKey === "ungrouped" && b.rootKey !== "ungrouped") {
        return 1;
      }

      if (b.rootKey === "ungrouped" && a.rootKey !== "ungrouped") {
        return -1;
      }

      const pieDelta = Number(isPieRootLabel(b.rootLabel)) - Number(isPieRootLabel(a.rootLabel));

      if (pieDelta !== 0) {
        return pieDelta;
      }

      const rowDelta =
        (groupSortRows.get(a.rootKey) ?? Number.MAX_SAFE_INTEGER) -
        (groupSortRows.get(b.rootKey) ?? Number.MAX_SAFE_INTEGER);

      if (rowDelta !== 0) {
        return rowDelta;
      }

      return a.rootLabel.localeCompare(b.rootLabel);
    });

  return {
    entries: matchedEntries,
    etymologySource: firstReference?.etymologySource ?? formationLabel ?? "词源待补充",
    etymologySourceKey: normalizedSourceKey,
    groups,
  };
}

export function getVocabularyRootDirectory(rootKey: string): VocabularyRootDirectory | null {
  const normalizedRootKey = normalizeDirectoryKey(rootKey);

  if (!normalizedRootKey) {
    return null;
  }

  const entries = loadVocabularyEntries();
  const selectedRootRelation = entries
    .flatMap((entry) =>
      entry.rootReferences.map((reference) => ({
        entry,
        reference,
      })),
    )
    .find(({ reference }) => reference.rootKey === normalizedRootKey);

  if (!selectedRootRelation) {
    return null;
  }

  const etymologySourceKey = selectedRootRelation.reference.etymologySourceKey || "uncategorized";
  const etymologyDirectory = getVocabularyEtymologyDirectory(etymologySourceKey);

  if (!etymologyDirectory) {
    return null;
  }

  return {
    etymologySource: etymologyDirectory.etymologySource || selectedRootRelation.reference.etymologySource || "词源待补充",
    etymologySourceKey,
    groups: etymologyDirectory.groups,
    selectedRootKey: normalizedRootKey,
    selectedRootLabel: selectedRootRelation.reference.root,
  };
}
