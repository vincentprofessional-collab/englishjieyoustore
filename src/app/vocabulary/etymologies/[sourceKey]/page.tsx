import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectAccessGate } from "@/components/project-access-gate";
import { getPaidContentKey, isFreeVocabularyEtymology } from "@/lib/access-control";
import { VocabularyDirectoryPronunciation } from "@/components/vocabulary-directory-pronunciation";
import { getVocabularyEtymologyDirectory } from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

export default async function VocabularyEtymologyPage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceKey: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { sourceKey } = await params;
  const { from } = await searchParams;
  const directory = getVocabularyEtymologyDirectory(decodeURIComponent(sourceKey));

  if (!directory) {
    notFound();
  }

  const categoryLabel = directory.category === "root"
    ? "词根"
    : directory.category === "prefix"
    ? "前缀"
    : directory.category === "suffix"
    ? "后缀"
    : "一级词源";
  const isAffixDirectory =
    directory.category === "prefix" ||
    directory.category === "suffix" ||
    directory.etymologySource.trimStart().startsWith("/");
  const backHref = from === "lookup" ? "/vocabulary/etymology" : "/vocabulary";
  const content = isAffixDirectory ? (
    <section className="etymology-word-panel suffix-related-words" aria-label="前后缀相关词汇">
      {directory.entries.map((entry) => (
        <div className="etymology-word-row" key={entry.normalizedWord}>
          <Link className="etymology-word-term" href={`/vocabulary/${encodeURIComponent(entry.normalizedWord)}`}>
            {entry.word}
          </Link>
          <VocabularyDirectoryPronunciation
            ukAudioUrl={entry.ukAudioUrl}
            ukPhonetic={entry.ukPhonetic}
            usAudioUrl={entry.usAudioUrl}
            usPhonetic={entry.usPhonetic}
            word={entry.word}
          />
          <span className="etymology-word-level">{entry.level || ""}</span>
          <small className="etymology-word-definition">
            <span>{entry.definitionLines[0] ?? entry.definitionCn}</span>
          </small>
        </div>
      ))}
    </section>
  ) : (
    <section className="etymology-hierarchy-panel" aria-label="词源词根词汇层级">
      {directory.groups.map((group) => (
        <article className={group.rootKey === "ungrouped" ? "ungrouped" : ""} key={group.rootKey}>
          <h2>
            <span className="etymology-root-label">
              {group.rootKey === "ungrouped" ? "二级关系" : "二级词根"}
            </span>
            {group.rootKey === "ungrouped" ? (
              <strong>{group.rootLabel}</strong>
            ) : (
              <Link
                className="etymology-root-link"
                href={`/vocabulary/roots/${encodeURIComponent(group.rootKey)}?from=lookup&sourceKey=${encodeURIComponent(directory.etymologySourceKey)}`}
              >
                {group.rootLabel}
              </Link>
            )}
            <em>
              <b className="stat-number">{group.entries.length}</b> 个同根词
            </em>
          </h2>
          <div className="etymology-word-panel">
            {group.entries.map((entry) => (
              <div className="etymology-word-row" key={entry.normalizedWord}>
                <Link className="etymology-word-term" href={`/vocabulary/${encodeURIComponent(entry.normalizedWord)}`}>
                  {entry.word}
                </Link>
                <VocabularyDirectoryPronunciation
                  ukAudioUrl={entry.ukAudioUrl}
                  ukPhonetic={entry.ukPhonetic}
                  usAudioUrl={entry.usAudioUrl}
                  usPhonetic={entry.usPhonetic}
                  word={entry.word}
                />
                <span className="etymology-word-level">{entry.level || ""}</span>
                <small className="etymology-word-definition">
                  <span>{entry.definitionLines[0] ?? entry.definitionCn}</span>
                </small>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );

  return (
    <section className="stack vocabulary-etymology-page">
      <div className="root-page-head">
        <Link className="back-link" href={backHref}>
          ← 返回
        </Link>
        <div className="etymology-title-row">
          <p className="etymology-source-label">{categoryLabel}</p>
          <h1>{directory.etymologySource}</h1>
          {directory.meaning ? <p className="etymology-source-meaning">中文释义：{directory.meaning}</p> : null}
          <span>
            <b className="stat-number">{directory.entries.length}</b> 个同源词
          </span>
        </div>
      </div>

      {isFreeVocabularyEtymology(directory.etymologySourceKey) ? content : (
        <ProjectAccessGate
          contentKey={getPaidContentKey("vocabulary-etymology", sourceKey)}
          freePreviewLimit={0}
          projectKey="vocabulary.etymology"
          title="词源词根目录需要单独开通"
        >
          {content}
        </ProjectAccessGate>
      )}
    </section>
  );
}
