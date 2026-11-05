"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ContentShareButton } from "@/components/content-share-button";
import { VocabularyExampleArticleLink } from "@/components/vocabulary-example-article-link";
import { VocabularyExampleAudioButton, VocabularyExampleFavoriteButton } from "@/components/vocabulary-example-actions";
import { VocabularyFormationPart as VocabularyFormationPartLink } from "@/components/vocabulary-formation-part";
import { VocabularyLookupDisplaySection } from "@/components/vocabulary-lookup-display-section";
import { getVocabularyComponentStyle, getVisibleVocabularyFormationParts, isVocabularyFormationQualityLocked } from "@/components/vocabulary-morphology";
import { VocabularyExamQuestions } from "@/components/vocabulary-exam-questions";
import type { VocabularyUsageExample } from "@/lib/vocabulary/examples";
import type { VocabularyPhraseMatch } from "@/lib/vocabulary/phrases";
import type { VocabularySynonymDistinction } from "@/lib/vocabulary/synonym-distinctions";
import type { LocalVocabularyEntry, VocabularyFormationPart } from "@/lib/vocabulary/local-vocabulary";
import { isSupplementalLearningBook } from "@/lib/vocabulary/learning";
import { getPrimarySchoolVocabularyImageUrl } from "@/lib/vocabulary/primary-school-vocabulary-images";
import { getVocabularyLookupDisplayPreferences, subscribeToVocabularyLookupDisplayPreferences } from "@/lib/vocabulary/lookup-display-preferences";

type VocabularyDetailContentProps = {
  entry: LocalVocabularyEntry;
  etymologyChinese?: string;
  etymologyEnglish?: string;
  formationUnlocked?: boolean;
  formationParts: VocabularyFormationPart[];
  lookupLayout?: boolean;
  showExamples?: boolean;
  showIllustration?: boolean;
  phrases: VocabularyPhraseMatch[];
  synonymDistinctions?: VocabularySynonymDistinction[];
  usageScenario?: { context: string; translation: string; example: string } | null;
  usageExamples: VocabularyUsageExample[];
};

function DefinitionRows({ entry }: { entry: LocalVocabularyEntry }) {
  if (entry.definitionGroups.length === 0) {
    return <p className="muted">{entry.definitionCn}</p>;
  }

  const rows: Array<{ definitions: string[]; key: string; partOfSpeech: string }> = [];
  const rowByPartOfSpeech = new Map<string, (typeof rows)[number]>();

  for (const group of entry.definitionGroups) {
    const partOfSpeech = group.partOfSpeech.trim();
    const normalizedPartOfSpeech = partOfSpeech.toLowerCase().replace(/\s+/g, "");
    const row = normalizedPartOfSpeech ? rowByPartOfSpeech.get(normalizedPartOfSpeech) : undefined;
    const target = row ?? { definitions: [], key: normalizedPartOfSpeech || `definition-${rows.length}`, partOfSpeech };

    if (!row) {
      rows.push(target);
      if (normalizedPartOfSpeech) rowByPartOfSpeech.set(normalizedPartOfSpeech, target);
    }

    for (const definition of group.definitions) {
      const normalizedDefinition = definition.trim().toLocaleLowerCase();
      if (normalizedDefinition && !target.definitions.some((item) => item.trim().toLocaleLowerCase() === normalizedDefinition)) {
        target.definitions.push(definition);
      }
    }
  }

  return (
    <div className="definition-rows large">
      {rows.map((row) => (
        <p className={row.partOfSpeech ? undefined : "no-part-of-speech"} key={row.key}>
          {row.partOfSpeech ? <strong>{row.partOfSpeech}</strong> : null}
          <span>{row.definitions.join("；")}</span>
        </p>
      ))}
    </div>
  );
}

function WordInflectionSection({ entry }: { entry: LocalVocabularyEntry }) {
  const partsOfSpeech = [...entry.definitionGroups.map((group) => group.partOfSpeech), entry.partOfSpeech].join(" ");
  const hasVerb = /(?:^|[^a-z])(?:v(?:t|i)?|aux)\./i.test(partsOfSpeech);
  const hasNoun = /(?:^|[^a-z])n\./i.test(partsOfSpeech);
  const hasAdjectiveOrAdverb = /(?:^|[^a-z])(?:adj|adv)\./i.test(partsOfSpeech);
  const hasRecognizedPartOfSpeech = hasVerb || hasNoun || hasAdjectiveOrAdverb;
  const verbForms = new Set(["三单", "过去式", "过去分词", "现在分词", "动名词"]);
  const degreeForms = new Set(["比较级", "最高级"]);
  const inflections = entry.inflections.filter((item) => {
    if (!hasRecognizedPartOfSpeech) return true;
    if (verbForms.has(item.label)) return hasVerb;
    if (item.label === "复数") return hasNoun;
    if (degreeForms.has(item.label)) return hasAdjectiveOrAdverb;
    return true;
  });
  if (inflections.length === 0) return null;

  return (
    <VocabularyLookupDisplaySection controlsEnabled id="inflections" title="词性变化">
      <div className="word-inflection-grid">
        {inflections.map((item) => (
          <span key={`${item.label}-${item.value}`}>
            <b>{item.label}</b>
            <strong>{item.value}</strong>
          </span>
        ))}
      </div>
    </VocabularyLookupDisplaySection>
  );
}

function parseEnglishDefinitionLine(definition: string) {
  const partOfSpeechLabels: Record<string, string> = { a: "adj.", n: "n.", r: "adv.", s: "adj.", v: "v." };
  const normalizedDefinition = definition.replace(/\s+/g, " ").trim();
  const wordnetMatch = normalizedDefinition.match(/^([anrsv])(?:\.|\s)+(.+)$/i);
  if (wordnetMatch) {
    return { definition: wordnetMatch[2], partOfSpeech: partOfSpeechLabels[wordnetMatch[1].toLowerCase()] ?? "" };
  }

  const duplicatedWordnetMatch = normalizedDefinition.match(/^([anrsv])\1\s+(.+)$/i);
  if (duplicatedWordnetMatch) {
    return { definition: duplicatedWordnetMatch[2], partOfSpeech: partOfSpeechLabels[duplicatedWordnetMatch[1].toLowerCase()] ?? "" };
  }

  const match = normalizedDefinition.match(/^([a-z]+(?:\.[a-z]+)*\.)\s+(.+)$/i);
  return match ? { definition: match[2], partOfSpeech: match[1] } : { definition: normalizedDefinition, partOfSpeech: "" };
}

function EnglishDefinitionSection({ entry }: { entry: LocalVocabularyEntry }) {
  const definitions = entry.englishDefinitions
    .flatMap((definition) => definition.replace(/\\n/g, "\n").split(/\n+/))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (definitions.length === 0) return null;

  return (
    <VocabularyLookupDisplaySection controlsEnabled id="englishDefinition" title="英文释义">
      <div className="english-definition-list">
        {definitions.map((definition, index) => {
          const parsed = parseEnglishDefinitionLine(definition);
          return (
            <p className={parsed.partOfSpeech ? "has-part-of-speech" : undefined} key={`${definition}-${index}`}>
              {parsed.partOfSpeech ? <strong>{parsed.partOfSpeech}</strong> : null}
              <span>{parsed.definition}</span>
            </p>
          );
        })}
      </div>
    </VocabularyLookupDisplaySection>
  );
}

function FormationPart({ index, part, unlocked }: { index: number; part: VocabularyFormationPart; unlocked: boolean }) {
  const style = getVocabularyComponentStyle(index);
  if (!part.href) return <span className="word-formation-part" style={style}>{part.label}</span>;
  return <VocabularyFormationPartLink href={part.href} label={part.label} style={style} unlocked={unlocked} />;
}

function WordFormationSection({ word, parts, unlocked }: { word: string; parts: VocabularyFormationPart[]; unlocked: boolean }) {
  const visibleParts = getVisibleVocabularyFormationParts(parts);
  if (visibleParts.length === 0) return null;
  const qualityLocked = isVocabularyFormationQualityLocked(word, visibleParts);
  return (
    <VocabularyLookupDisplaySection className="word-formation-section" controlsEnabled id="rootTree" title="词根树">
      <div className="word-formation-card">
        {qualityLocked ? <button aria-label="暂未达到上线质量要求" className="word-formation-quality-lock" onClick={() => window.alert("暂未达到上线质量要求")} title="点击查看质量状态" type="button">🔒</button> : (
          <div className="word-formation-line">
            {visibleParts.map((part, index) => (
              <span className="word-formation-token" key={`${part.label}-${index}`}>
                {index > 0 ? <span className="word-formation-plus">+</span> : null}
                <FormationPart index={index} part={part} unlocked={unlocked} />
              </span>
            ))}
          </div>
        )}
      </div>
    </VocabularyLookupDisplaySection>
  );
}

function WordDetailListSection({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <section className="word-detail-section">
      <h2>{title}</h2>
      <div className="word-detail-simple-list">{items.map((item) => <p key={item}>{item}</p>)}</div>
    </section>
  );
}

function WordDetailTagSection({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <section className="word-detail-section">
      <h2>{title}</h2>
      <div className="word-detail-tag-list">{items.map((item) => <span key={item}>{item}</span>)}</div>
    </section>
  );
}

function SynonymDistinctionSection({ groups }: { groups: VocabularySynonymDistinction[] }) {
  if (groups.length === 0) return null;
  return (
    <VocabularyLookupDisplaySection controlsEnabled id="synonymDistinctions" title="同义词辨析">
      <div className="vocabulary-synonym-distinction-list">
        {groups.map((group, index) => (
          <article className="vocabulary-synonym-distinction-card" key={`${group.terms.join("-")}-${index}`}>
            <h3>{group.terms.join(" · ")}</h3>
            {group.summary ? <p className="vocabulary-synonym-distinction-summary">{group.summary}</p> : null}
            {group.entries.map((entry, entryIndex) => (
              <div className="vocabulary-synonym-distinction-entry" key={`${entry.term}-${entryIndex}`}>
                <p><strong>{entry.term}</strong>{entry.distinction ? `：${entry.distinction}` : null}</p>
                {entry.details.map((detail, detailIndex) => <p className="vocabulary-synonym-distinction-detail" key={`${detailIndex}-${detail}`}>{detail}</p>)}
              </div>
            ))}
            {group.notes.map((note, noteIndex) => <p className="vocabulary-synonym-distinction-note" key={`${noteIndex}-${note}`}>{note}</p>)}
          </article>
        ))}
      </div>
    </VocabularyLookupDisplaySection>
  );
}

function EtymologySection({ chinese, english, story }: { chinese: string; english: string; story: string }) {
  if (!chinese && !english && !story) return null;
  return (
    <VocabularyLookupDisplaySection controlsEnabled id="etymology" title="词源">
      <div className="word-lookup-etymology-card">
        {english ? <div><strong>英文词源</strong><p>{english}</p></div> : null}
        {chinese ? <div><strong>中文词源</strong><p>{chinese}</p></div> : null}
        {!english && !chinese && story ? <div><p>{story}</p></div> : null}
      </div>
    </VocabularyLookupDisplaySection>
  );
}

function PhraseSection({ phrases }: { phrases: VocabularyPhraseMatch[] }) {
  if (phrases.length === 0) return null;
  return (
    <section className="word-detail-section">
      <h2>习惯表达</h2>
      <div className="word-phrase-list">
        {phrases.map((phrase) => (
          <article className="word-phrase-card" key={phrase.id}>
            <strong>{phrase.phrase}</strong>
            {phrase.chineseText ? <span>{phrase.chineseText}</span> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function useVocabularyIllustration(word: string | null, respectLookupPreferences = true) {
  const imageUrl = word ? getPrimarySchoolVocabularyImageUrl(word) : null;
  const [imagesVisible, setImagesVisible] = useState(true);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  useEffect(() => { setFailedImageUrl(null); }, [imageUrl]);
  useEffect(() => {
    if (!respectLookupPreferences) return;
    const sync = () => setImagesVisible(getVocabularyLookupDisplayPreferences().images);
    sync();
    return subscribeToVocabularyLookupDisplayPreferences(sync);
  }, [respectLookupPreferences]);

  return (!respectLookupPreferences || imagesVisible) && imageUrl && failedImageUrl !== imageUrl ? (
    <img
      alt={`${word} 的词汇插图`}
      className="vocabulary-primary-school-word-picture"
      decoding="async"
      loading="eager"
      onError={() => setFailedImageUrl(imageUrl)}
      src={imageUrl}
    />
  ) : null;
}

function UsageExamplesSection({
  examples,
  illustration,
}: {
  examples: VocabularyUsageExample[];
  illustration?: ReactNode;
}) {
  const bilingualExamples = [
    ...examples.filter((example) => example.bookCode !== "BBC"),
    ...examples.filter((example) => example.bookCode === "BBC"),
  ].filter((example) => example.englishText.trim() && (example.chineseText.trim() || example.sourceType === "article"));

  if (bilingualExamples.length === 0) {
    if (!illustration) return null;
    return (
      <VocabularyLookupDisplaySection controlsEnabled id="images" title="图片">
        <div className="vocabulary-primary-school-picture-only">{illustration}</div>
      </VocabularyLookupDisplaySection>
    );
  }

  return (
    <VocabularyLookupDisplaySection className="vocabulary-usage-examples" controlsEnabled id="examples" title="例句">
      <div
        className={`vocabulary-usage-example-layout${illustration ? " has-primary-school-picture" : ""}`}
      >
        <div className="vocabulary-usage-example-list">
          {bilingualExamples.map((example, index) => (
            <article className="vocabulary-usage-example-card" data-book-code={example.bookCode} id={`vocabulary-example-${index + 1}`} key={example.id}>
              <VocabularyExampleArticleLink example={example}>
                <div className="vocabulary-usage-example-main">
                  <p>{example.englishText}</p>
                  {example.chineseText ? <span>{example.chineseText}</span> : null}
                  {example.sourceTitle ? <small className="vocabulary-usage-example-source">来源：{example.sourceTitle}</small> : null}
                </div>
              </VocabularyExampleArticleLink>
              <div className="vocabulary-usage-example-actions">
                {example.audioUrl ? <VocabularyExampleAudioButton audioUrl={example.audioUrl} /> : null}
                <VocabularyExampleFavoriteButton example={example} />
                <ContentShareButton label="分享例句" text={`${example.englishText}\n${example.chineseText ?? ""}`.trim()} title="英文例句" url={`#vocabulary-example-${index + 1}`} />
              </div>
            </article>
          ))}
        </div>
        {illustration}
      </div>
    </VocabularyLookupDisplaySection>
  );
}

function splitSupplementalReviewNotes(notes: string[]) {
  const text = notes.join(" ").trim();
  const scenarioMarker = /场景考察\s*[：:]\s*/u.exec(text);
  if (!scenarioMarker) return { caution: text, scenario: null };

  const scenarioText = text.slice(scenarioMarker.index + scenarioMarker[0].length)
    .replace(/^(?:情景|场景)\s*[：:]\s*/u, "");
  const exampleMarker = /(?:^|\s)例句\s*[：:]\s*/u.exec(scenarioText);
  const translationMarker = /(?:^|\s)(?:翻译|译文)\s*[：:]\s*/u.exec(scenarioText);
  const context = exampleMarker
    ? scenarioText.slice(0, exampleMarker.index).trim()
    : scenarioText.trim();
  const example = exampleMarker
    ? scenarioText.slice(
      exampleMarker.index + exampleMarker[0].length,
      translationMarker && translationMarker.index > exampleMarker.index ? translationMarker.index : undefined,
    ).trim()
    : "";
  const translation = translationMarker && (!exampleMarker || translationMarker.index > exampleMarker.index)
    ? scenarioText.slice(translationMarker.index + translationMarker[0].length).trim()
    : "";

  return {
    caution: text.slice(0, scenarioMarker.index).trim(),
    scenario: { context, translation, example },
  };
}

function SupplementalUsageScenario({ context, translation, example }: { context: string; translation: string; example: string }) {
  if (!context && !translation && !example) return null;
  const splitDialogueLines = (value: string, language: "zh" | "en") => {
    const marker = language === "zh" ? /(?=(?:朋友|你)\s*[：:])/gu : /(?=(?:friend|you)\s*[：:])/giu;
    return value.split(marker).map((line) => line.trim()).filter(Boolean);
  };
  const translationLines = splitDialogueLines(translation, "zh");
  const exampleLines = splitDialogueLines(example, "en");
  const dialogueRows = Array.from({ length: Math.max(translationLines.length, exampleLines.length) }, (_, index) => ({
    translation: translationLines[index] ?? "",
    example: exampleLines[index] ?? "",
  }));
  return (
    <section className="word-detail-section">
      <h2>使用场景</h2>
      <div className="word-lookup-etymology-card vocabulary-expression-scenario-card">
        {context ? <p className="vocabulary-expression-scenario-context">{context}</p> : null}
        {dialogueRows.map((row, index) => (
          <div className="vocabulary-expression-scenario-row" key={`dialogue-${index}`}>
            <p className="vocabulary-expression-scenario-translation">{row.translation}</p>
            <p className="vocabulary-expression-scenario-example" lang="en">{row.example}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function VocabularyDetailContent({
  entry,
  etymologyChinese = "",
  etymologyEnglish = "",
  formationParts,
  formationUnlocked = false,
  lookupLayout = false,
  showExamples = true,
  showIllustration = true,
  phrases,
  synonymDistinctions = [],
  usageScenario,
  usageExamples,
}: VocabularyDetailContentProps) {
  const illustration = useVocabularyIllustration(showIllustration ? entry.word : null);
  const chineseDefinition = (
    <VocabularyLookupDisplaySection controlsEnabled id="chineseDefinition" title="中文释义"><DefinitionRows entry={entry} /></VocabularyLookupDisplaySection>
  );
  if (isSupplementalLearningBook(entry.level)) {
    const { caution, scenario: noteScenario } = splitSupplementalReviewNotes(entry.reviewNotes);
    const scenario = entry.level === "小学短语" || entry.level === "初中短语"
      ? null
      : usageScenario ?? noteScenario;
    return (
      <>
        <VocabularyLookupDisplaySection controlsEnabled id="chineseDefinition" title="中文释义"><DefinitionRows entry={entry} /></VocabularyLookupDisplaySection>
        <EnglishDefinitionSection entry={entry} />
        <UsageExamplesSection
          key={entry.normalizedWord}
          examples={showExamples ? usageExamples : []}
        />
        <SynonymDistinctionSection groups={synonymDistinctions} />
        {entry.etymologyStory ? <EtymologySection chinese="" english="" story={entry.etymologyStory} /> : null}
        {caution ? <WordDetailListSection items={[caution]} title="注意事项" /> : null}
        {entry.extension ? <WordDetailListSection items={[entry.extension]} title="延伸扩展" /> : null}
        {scenario && showExamples ? <SupplementalUsageScenario {...scenario} /> : null}
        <VocabularyExamQuestions key={`${entry.word}:${entry.level}`} word={entry.word} level={entry.level} />
      </>
    );
  }

  const hasEtymologyContent = Boolean(etymologyEnglish || etymologyChinese || entry.etymologyStory || formationParts.length);
  const wordTreeAndEtymology = hasEtymologyContent ? (
    <>
      <WordFormationSection word={entry.word} parts={formationParts} unlocked={formationUnlocked} />
      <EtymologySection chinese={etymologyChinese} english={etymologyEnglish} story={entry.etymologyStory} />
    </>
  ) : null;
  const definitionsAndExamples = <>
    {chineseDefinition}
    <EnglishDefinitionSection entry={entry} />
    {lookupLayout && illustration ? (
      <VocabularyLookupDisplaySection className="vocabulary-lookup-mobile-picture" controlsEnabled id="images" title="图片">
        <div className="vocabulary-primary-school-picture-only">{illustration}</div>
      </VocabularyLookupDisplaySection>
    ) : null}
    {!lookupLayout ? <WordInflectionSection entry={entry} /> : null}
    <UsageExamplesSection
      key={entry.normalizedWord}
      examples={showExamples ? usageExamples : []}
      illustration={!lookupLayout ? illustration : null}
    />
  </>;
  return (
    <>
      {lookupLayout && illustration ? (
        <div className="vocabulary-definition-illustration-layout">
          <div className="vocabulary-definition-illustration">{illustration}</div>
          {definitionsAndExamples}
        </div>
      ) : definitionsAndExamples}
      <SynonymDistinctionSection groups={synonymDistinctions} />
      {wordTreeAndEtymology}
      {lookupLayout ? <WordInflectionSection entry={entry} /> : null}
      <WordDetailListSection items={entry.reviewNotes} title="温故知新" />
      <PhraseSection phrases={phrases} />
      <WordDetailTagSection items={entry.synonyms} title="同义词" />
      <WordDetailTagSection items={entry.antonyms} title="反义词" />
      <VocabularyExamQuestions key={`${entry.word}:${entry.level}`} word={entry.word} level={entry.level} />
    </>
  );
}

export type { VocabularyDetailContentProps };
