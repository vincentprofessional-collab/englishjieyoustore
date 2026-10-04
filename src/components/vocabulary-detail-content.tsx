"use client";

import type { ReactNode } from "react";
import { ContentShareButton } from "@/components/content-share-button";
import { VocabularyExampleArticleLink } from "@/components/vocabulary-example-article-link";
import { VocabularyExampleAudioButton, VocabularyExampleFavoriteButton } from "@/components/vocabulary-example-actions";
import { VocabularyFormationPart as VocabularyFormationPartLink } from "@/components/vocabulary-formation-part";
import { VocabularyLookupDisplaySection } from "@/components/vocabulary-lookup-display-section";
import type { VocabularyUsageExample } from "@/lib/vocabulary/examples";
import type { VocabularyPhraseMatch } from "@/lib/vocabulary/phrases";
import type { LocalVocabularyEntry, VocabularyFormationPart } from "@/lib/vocabulary/local-vocabulary";

type VocabularyDetailContentProps = {
  entry: LocalVocabularyEntry;
  etymologyChinese?: string;
  etymologyEnglish?: string;
  formationUnlocked?: boolean;
  formationParts: VocabularyFormationPart[];
  inlineVideo?: ReactNode;
  phrases: VocabularyPhraseMatch[];
  usageExamples: VocabularyUsageExample[];
};

function DefinitionRows({ entry }: { entry: LocalVocabularyEntry }) {
  if (entry.definitionGroups.length === 0) {
    return <p className="muted">{entry.definitionCn}</p>;
  }

  return (
    <div className="definition-rows large">
      {entry.definitionGroups.map((group) => (
        <p className={group.partOfSpeech ? undefined : "no-part-of-speech"} key={group.partOfSpeech || group.text}>
          {group.partOfSpeech ? <strong>{group.partOfSpeech}</strong> : null}
          <span>{group.definitions.join("；")}</span>
        </p>
      ))}
    </div>
  );
}

function WordInflectionSection({ entry }: { entry: LocalVocabularyEntry }) {
  if (entry.inflections.length === 0) return null;

  return (
    <VocabularyLookupDisplaySection controlsEnabled id="inflections" title="词性变化">
      <div className="word-inflection-grid">
        {entry.inflections.map((item) => (
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

function FormationPart({ part, unlocked }: { part: VocabularyFormationPart; unlocked: boolean }) {
  if (!part.href) return <span className="word-formation-part">{part.label}</span>;
  return <VocabularyFormationPartLink href={part.href} label={part.label} unlocked={unlocked} />;
}

function WordFormationSection({ parts, unlocked }: { parts: VocabularyFormationPart[]; unlocked: boolean }) {
  if (parts.length === 0) return null;
  return (
    <VocabularyLookupDisplaySection className="word-formation-section" controlsEnabled id="rootTree" title="词根树">
      <div className="word-formation-card">
        <div className="word-formation-line">
          {parts.map((part, index) => (
            <span className="word-formation-token" key={`${part.label}-${index}`}>
              {index > 0 ? <span className="word-formation-plus">+</span> : null}
              <FormationPart part={part} unlocked={unlocked} />
            </span>
          ))}
        </div>
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

function EtymologySection({ chinese, english, story }: { chinese: string; english: string; story: string }) {
  if (!chinese && !english && !story) return null;
  return (
    <VocabularyLookupDisplaySection controlsEnabled id="etymology" title="词源">
      <div className="word-lookup-etymology-card">
        {english ? <div><strong>英文词源</strong><p>{english}</p></div> : null}
        {chinese ? <div><strong>中文词源</strong><p>{chinese}</p></div> : null}
        {!english && !chinese && story ? <div><strong>词源说明</strong><p>{story}</p></div> : null}
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
            {phrase.sourceTitle ? <small>{phrase.sourceTitle}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function UsageExamplesSection({ entry, examples }: { entry: LocalVocabularyEntry; examples: VocabularyUsageExample[] }) {
  if (examples.length === 0 && entry.englishExamples.length === 0) return null;
  return (
    <VocabularyLookupDisplaySection className="vocabulary-usage-examples" controlsEnabled id="examples" title="例句">
      <div data-has-non-bbc-examples={entry.englishExamples.length > 0 || examples.some((example) => example.bookCode !== "BBC") ? "true" : "false"}>
      {entry.englishExamples.length > 0 ? <div className="english-example-list">{entry.englishExamples.map((example) => <blockquote key={example}>{example}</blockquote>)}</div> : null}
      {examples.length > 0 ? (
        <div className="vocabulary-usage-example-list">
          {examples.map((example, index) => (
            <article className="vocabulary-usage-example-card" data-book-code={example.bookCode} id={`vocabulary-example-${index + 1}`} key={example.id}>
              {example.sourceType === "article" || example.sourceType === "new-concept" ? (
                <VocabularyExampleArticleLink example={example}>
                  <div className="vocabulary-usage-example-main"><p>{example.englishText}</p>{example.chineseText ? <span>{example.chineseText}</span> : null}<small>{example.sourceTitle}</small></div>
                </VocabularyExampleArticleLink>
              ) : (
                <div className="vocabulary-usage-example-main"><p>{example.englishText}</p>{example.chineseText ? <span>{example.chineseText}</span> : null}<small>{example.sourceTitle}</small></div>
              )}
              <div className="vocabulary-usage-example-actions">
                {example.audioUrl ? <VocabularyExampleAudioButton audioUrl={example.audioUrl} /> : null}
                <VocabularyExampleFavoriteButton example={example} />
                <ContentShareButton label="分享例句" text={`${example.englishText}\n${example.chineseText ?? ""}`.trim()} title="英文例句" url={`#vocabulary-example-${index + 1}`} />
              </div>
            </article>
          ))}
        </div>
      ) : null}
      </div>
    </VocabularyLookupDisplaySection>
  );
}

export function VocabularyDetailContent({
  entry,
  etymologyChinese = "",
  etymologyEnglish = "",
  formationParts,
  formationUnlocked = false,
  inlineVideo,
  phrases,
  usageExamples,
}: VocabularyDetailContentProps) {
  const hasEtymologyContent = Boolean(etymologyEnglish || etymologyChinese || entry.etymologyStory || formationParts.length);
  const wordTreeAndEtymology = hasEtymologyContent ? (
    <>
      <WordFormationSection parts={formationParts} unlocked={formationUnlocked} />
      <EtymologySection chinese={etymologyChinese} english={etymologyEnglish} story={entry.etymologyStory} />
    </>
  ) : null;
  return (
    <>
      <VocabularyLookupDisplaySection controlsEnabled id="chineseDefinition" title="中文释义"><DefinitionRows entry={entry} /></VocabularyLookupDisplaySection>
      <EnglishDefinitionSection entry={entry} />
      <WordInflectionSection entry={entry} />
      {wordTreeAndEtymology}
      {inlineVideo}
      <WordDetailListSection items={entry.reviewNotes} title="温故知新" />
      <UsageExamplesSection entry={entry} examples={usageExamples} />
      <PhraseSection phrases={phrases} />
      <WordDetailTagSection items={entry.synonyms} title="同义词" />
      <WordDetailTagSection items={entry.antonyms} title="反义词" />
    </>
  );
}

export type { VocabularyDetailContentProps };
