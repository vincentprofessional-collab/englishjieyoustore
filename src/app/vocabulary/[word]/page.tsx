import Link from "next/link";
import { notFound } from "next/navigation";
import { VocabularyExampleAudioButton, VocabularyExampleFavoriteButton } from "@/components/vocabulary-example-actions";
import { VocabularyAutoplay } from "@/components/vocabulary-autoplay";
import { ContentShareButton } from "@/components/content-share-button";
import { VocabularyFavoriteButton } from "@/components/vocabulary-favorite-button";
import { VocabularyInlinePronunciation } from "@/components/vocabulary-pronunciation";
import { VocabularyShareButton } from "@/components/vocabulary-share-button";
import {
  getExtendedVocabularyEntry,
  getVocabularyFormationParts,
  type LocalVocabularyEntry,
  type VocabularyFormationPart,
} from "@/lib/vocabulary/local-vocabulary";
import { getVocabularyUsageExamples, type VocabularyUsageExample } from "@/lib/vocabulary/examples";
import { getVocabularyPhraseMatches, type VocabularyPhraseMatch } from "@/lib/vocabulary/phrases";

export const dynamic = "force-dynamic";

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
  if (entry.inflections.length === 0) {
    return null;
  }

  return (
    <section className="word-detail-section">
      <h2>词形变化</h2>
      <div className="word-inflection-grid">
        {entry.inflections.map((item) => (
          <span key={`${item.label}-${item.value}`}>
            <b>{item.label}</b>
            <strong>{item.value}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}

function parseEnglishDefinitionLine(definition: string) {
  const partOfSpeechLabels: Record<string, string> = {
    a: "adj.",
    n: "n.",
    r: "adv.",
    s: "adj.",
    v: "v.",
  };
  const normalizedDefinition = definition.replace(/\s+/g, " ").trim();
  const wordnetMatch = normalizedDefinition.match(/^([anrsv])(?:\.|\s)+(.+)$/i);

  if (wordnetMatch) {
    return {
      definition: wordnetMatch[2],
      partOfSpeech: partOfSpeechLabels[wordnetMatch[1].toLowerCase()] ?? "",
    };
  }

  const duplicatedWordnetMatch = normalizedDefinition.match(/^([anrsv])\1\s+(.+)$/i);

  if (duplicatedWordnetMatch) {
    return {
      definition: duplicatedWordnetMatch[2],
      partOfSpeech: partOfSpeechLabels[duplicatedWordnetMatch[1].toLowerCase()] ?? "",
    };
  }

  const match = normalizedDefinition.match(/^([a-z]+(?:\.[a-z]+)*\.)\s+(.+)$/i);

  if (!match) {
    return {
      definition: normalizedDefinition,
      partOfSpeech: "",
    };
  }

  return {
    definition: match[2],
    partOfSpeech: match[1],
  };
}

function getEnglishDefinitionLines(entry: LocalVocabularyEntry) {
  return entry.englishDefinitions.flatMap((definition) =>
    definition
      .replace(/\\n/g, "\n")
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  );
}

function EnglishDefinitionSection({ entry }: { entry: LocalVocabularyEntry }) {
  const englishDefinitions = getEnglishDefinitionLines(entry);

  if (englishDefinitions.length === 0) {
    return null;
  }

  return (
    <section className="word-detail-section">
      <h2>英文释义</h2>
      <div className="english-definition-list">
        {englishDefinitions.map((definition, index) => {
          const parsedDefinition = parseEnglishDefinitionLine(definition);

          return (
            <p className={parsedDefinition.partOfSpeech ? "has-part-of-speech" : undefined} key={`${definition}-${index}`}>
              {parsedDefinition.partOfSpeech ? <strong>{parsedDefinition.partOfSpeech}</strong> : null}
              <span>{parsedDefinition.definition}</span>
            </p>
          );
        })}
      </div>
    </section>
  );
}

function FormationPart({ part }: { part: VocabularyFormationPart }) {
  if (!part.href) {
    return <span className="word-formation-part">{part.label}</span>;
  }

  return (
    <Link className="word-formation-part clickable" href={part.href}>
      {part.label}
    </Link>
  );
}

function WordFormationSection({ parts }: { parts: VocabularyFormationPart[] }) {
  if (parts.length === 0) {
    return null;
  }

  return (
    <section className="word-detail-section word-formation-section">
      <h2>词根词缀</h2>
      <div className="word-formation-card">
        <div className="word-formation-line">
          {parts.map((part, index) => (
            <span className="word-formation-token" key={`${part.label}-${index}`}>
              {index > 0 ? <span className="word-formation-plus">+</span> : null}
              <FormationPart part={part} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function WordDetailListSection({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="word-detail-section">
      <h2>{title}</h2>
      <div className="word-detail-simple-list">
        {items.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </section>
  );
}

function WordDetailTagSection({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="word-detail-section">
      <h2>{title}</h2>
      <div className="word-detail-tag-list">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function EtymologyStorySection({ story }: { story: string }) {
  if (!story) {
    return null;
  }

  return (
    <section className="word-detail-section">
      <h2>词源故事</h2>
      <div className="word-detail-story-card">{story}</div>
    </section>
  );
}

function PhraseSection({ phrases }: { phrases: VocabularyPhraseMatch[] }) {
  if (phrases.length === 0) {
    return null;
  }

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

function UsageExamplesSection({
  englishExamples,
  examples,
}: {
  englishExamples: string[];
  examples: VocabularyUsageExample[];
}) {
  if (examples.length === 0 && englishExamples.length === 0) {
    return null;
  }

  return (
    <section className="word-detail-section">
      <h2>例句</h2>
      {englishExamples.length > 0 ? (
        <div className="english-example-list">
          {englishExamples.map((example) => (
            <blockquote key={example}>{example}</blockquote>
          ))}
        </div>
      ) : null}
      {examples.length > 0 ? (
        <div className="vocabulary-usage-example-list">
          {examples.map((example, index) => (
            <article
              className="vocabulary-usage-example-card"
              id={`vocabulary-example-${index + 1}`}
              key={example.id}
            >
              <div className="vocabulary-usage-example-main">
                <p>{example.englishText}</p>
                {example.chineseText ? <span>{example.chineseText}</span> : null}
                <small>{example.sourceTitle}</small>
              </div>
              <div className="vocabulary-usage-example-actions">
                {example.audioUrl ? <VocabularyExampleAudioButton audioUrl={example.audioUrl} /> : null}
                <VocabularyExampleFavoriteButton example={example} />
                <ContentShareButton
                  label="分享例句"
                  text={`${example.englishText}\n${example.chineseText ?? ""}`.trim()}
                  title="英文例句"
                  url={`#vocabulary-example-${index + 1}`}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default async function VocabularyWordPage({
  params,
}: {
  params: Promise<{ word: string }>;
}) {
  const { word } = await params;
  const entry = await getExtendedVocabularyEntry(decodeURIComponent(word));

  if (!entry) {
    notFound();
  }

  const [usageExamples] = await Promise.all([
    getVocabularyUsageExamples(
      entry.word,
      5,
      entry.inflections.map((inflection) => inflection.value),
    ),
  ]);
  const phrases = getVocabularyPhraseMatches(entry.word);
  const formationParts = getVocabularyFormationParts(entry);

  return (
    <section className="stack vocabulary-word-page">
      <VocabularyAutoplay ukAudioUrl={entry.ukAudioUrl} usAudioUrl={entry.usAudioUrl} word={entry.word} />
      <div className="word-page-head">
        <Link className="back-link" href="/vocabulary">
          ← 返回
        </Link>
        <div className="word-title-row word-detail-title-row">
          <div className="word-title-primary">
            <h1>{entry.word}</h1>
            <div className="word-title-meta">
              <VocabularyInlinePronunciation
                ukAudioUrl={entry.ukAudioUrl}
                ukPhonetic={entry.ukPhonetic}
                usAudioUrl={entry.usAudioUrl}
                usPhonetic={entry.usPhonetic}
                word={entry.word}
              />
              {entry.level ? <span className="vocabulary-level-badge">{entry.level}</span> : null}
            </div>
          </div>
          <div className="word-title-tools word-title-actions">
            <VocabularyFavoriteButton entry={entry} />
            <VocabularyShareButton entry={entry} />
          </div>
        </div>
      </div>

      <div className="word-detail-grid">
        <section className="word-detail-main" aria-label="词条内容">
          <section className="word-detail-section">
            <h2>中文释义</h2>
            <DefinitionRows entry={entry} />
          </section>
          <EnglishDefinitionSection entry={entry} />
          <WordInflectionSection entry={entry} />
          <WordDetailListSection items={entry.reviewNotes} title="温故知新" />
          <UsageExamplesSection englishExamples={entry.englishExamples} examples={usageExamples} />
          <PhraseSection phrases={phrases} />
          <WordDetailTagSection items={entry.synonyms} title="同义词" />
          <WordDetailTagSection items={entry.antonyms} title="反义词" />
          <EtymologyStorySection story={entry.etymologyStory} />
          <WordFormationSection parts={formationParts} />
        </section>
      </div>
    </section>
  );
}
