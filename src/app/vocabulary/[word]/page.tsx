import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { VocabularyExampleAudioButton, VocabularyExampleFavoriteButton } from "@/components/vocabulary-example-actions";
import { VocabularyExampleArticleLink } from "@/components/vocabulary-example-article-link";
import { VocabularyAutoplay } from "@/components/vocabulary-autoplay";
import { VocabularyBbcExampleStrip } from "@/components/vocabulary-bbc-example-strip";
import { ContentShareButton } from "@/components/content-share-button";
import { VocabularyDetailShell } from "@/components/vocabulary-detail-shell";
import { VocabularyDetailContent } from "@/components/vocabulary-detail-content";
import { VocabularyLookupDisplaySection } from "@/components/vocabulary-lookup-display-section";
import { VocabularyVideoPlayer } from "@/components/vocabulary-video-player";
import {
  getExtendedVocabularyEntry,
  getVocabularyFormationParts,
  type LocalVocabularyEntry,
  type VocabularyFormationPart,
} from "@/lib/vocabulary/local-vocabulary";
import { getVocabularyUsageExamples, prioritizeVocabularyUsageExamples, type VocabularyUsageExample } from "@/lib/vocabulary/examples";
import { getVocabularyPhraseMatches, type VocabularyPhraseMatch } from "@/lib/vocabulary/phrases";
import { getVocabularyLookupEtymology } from "@/lib/vocabulary/lookup-etymology";
import { getVocabularySynonymDistinctions } from "@/lib/vocabulary/synonym-distinctions";
import { DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES, isPhoneUserAgent, VOCABULARY_LOOKUP_VIDEO_COOKIE } from "@/lib/vocabulary/lookup-display-preferences";
import { getBbcVocabularyDetail } from "@/lib/articles/bbc-vocabulary";
import { getVocabularyVideoCandidates, getVocabularyVideos } from "@/lib/vocabulary/videos";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
      <h2>词根树</h2>
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
              {example.sourceType === "article" || example.sourceType === "new-concept" ? (
                <VocabularyExampleArticleLink
                  example={example}
                >
                  <div className="vocabulary-usage-example-main">
                    <p>{example.englishText}</p>
                    {example.chineseText ? <span>{example.chineseText}</span> : null}
                    <small>{example.sourceTitle}</small>
                  </div>
                </VocabularyExampleArticleLink>
              ) : (
                <div className="vocabulary-usage-example-main">
                  <p>{example.englishText}</p>
                  {example.chineseText ? <span>{example.chineseText}</span> : null}
                  <small>{example.sourceTitle}</small>
                </div>
              )}
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
  searchParams,
}: {
  params: Promise<{ word: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  const { word } = await params;
  const query = searchParams ? await searchParams : {};
  const requestedReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const backHref = requestedReturnTo && /^\/(?:articles|new-concept)\/[A-Za-z0-9_-]+$/.test(requestedReturnTo)
    ? requestedReturnTo
    : "/vocabulary";
  const decodedWord = decodeURIComponent(word);
  const bbcVocabularyDetail = getBbcVocabularyDetail(decodedWord);
  const entry = /\s/.test(decodedWord) && bbcVocabularyDetail
    ? bbcVocabularyDetail.entry
    : (await getExtendedVocabularyEntry(decodedWord)) ?? bbcVocabularyDetail?.entry;

  if (!entry) {
    notFound();
  }

  const fetchedUsageExamples = prioritizeVocabularyUsageExamples(
    await getVocabularyUsageExamples(
      entry.word,
      5,
      entry.inflections.map((inflection) => inflection.value),
    ),
    bbcVocabularyDetail?.examples ?? [],
  ).slice(0, 5);
  let canAccessBbcExamples = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("can_access_project", {
      _project_key: "bbc",
    });
    canAccessBbcExamples = !error && data === true;
  } catch {
    // Treat an unavailable membership check as a visitor and hide BBC examples.
  }
  const usageExamples = canAccessBbcExamples
    ? fetchedUsageExamples
    : fetchedUsageExamples.filter((example) => example.bookCode !== "BBC");
  const phrases = getVocabularyPhraseMatches(entry.word);
  const formationParts = getVocabularyFormationParts(entry).map((part) => ({
    ...part,
    href: part.href ? `${part.href}${part.href.includes("?") ? "&" : "?"}from=lookup` : part.href,
  }));
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  const isPhoneRequest = isPhoneUserAgent(requestHeaders.get("user-agent") ?? "");
  const etymology = getVocabularyLookupEtymology(entry.word);
  const synonymDistinctions = getVocabularySynonymDistinctions([
    entry.word,
    entry.normalizedWord,
    ...entry.inflections.map((inflection) => inflection.value),
  ]);
  const videoPreference = cookieStore.get(VOCABULARY_LOOKUP_VIDEO_COOKIE)?.value;
  const videoVisible = videoPreference === undefined ? DEFAULT_VOCABULARY_LOOKUP_DISPLAY_PREFERENCES.video : videoPreference === "1";
  const videoCandidates = isPhoneRequest ? [] : getVocabularyVideoCandidates(entry);
  const shouldLoadVideos = videoVisible && !isPhoneRequest;
  const videoData = shouldLoadVideos ? await getVocabularyVideos(entry) : null;
  const videoSection = videoCandidates.length > 0 ? (
    <VocabularyLookupDisplaySection controlsEnabled id="video" initialVisible={videoVisible} title="视频">
      {videoData?.videos.length ? (
        <VocabularyVideoPlayer
          entryWord={entry.normalizedWord}
          totalVideos={videoData.totalVideos}
          videos={videoData.videos}
          votesEnabled={videoData.votesEnabled}
        />
      ) : null}
    </VocabularyLookupDisplaySection>
  ) : null;

  return (
    <section className="stack vocabulary-word-page">
      <VocabularyAutoplay ukAudioUrl={entry.ukAudioUrl} usAudioUrl={entry.usAudioUrl} word={entry.word} />
      <VocabularyDetailShell
        backHref={backHref}
        entry={entry}
        headerAfterActions={<VocabularyBbcExampleStrip examples={usageExamples} />}
      >
        <VocabularyDetailContent
          entry={entry}
          etymologyChinese={etymology?.chinese}
          etymologyEnglish={etymology?.english}
          formationParts={formationParts}
          inlineVideo={!isPhoneRequest ? videoSection : null}
          phrases={phrases}
          synonymDistinctions={synonymDistinctions}
          usageExamples={usageExamples}
        />
      </VocabularyDetailShell>
    </section>
  );
}
