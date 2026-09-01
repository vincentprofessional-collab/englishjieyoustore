import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectAccessGate } from "@/components/project-access-gate";
import { getPaidContentKey } from "@/lib/access-control";
import { VocabularyDirectoryPronunciation } from "@/components/vocabulary-directory-pronunciation";
import { getVocabularyEtymologyDirectory } from "@/lib/vocabulary/local-vocabulary";

export const dynamic = "force-dynamic";

export default async function VocabularyEtymologyPage({
  params,
}: {
  params: Promise<{ sourceKey: string }>;
}) {
  const { sourceKey } = await params;
  const directory = getVocabularyEtymologyDirectory(decodeURIComponent(sourceKey));

  if (!directory) {
    notFound();
  }

  return (
    <section className="stack vocabulary-etymology-page">
      <div className="root-page-head">
        <Link className="back-link" href="/vocabulary">
          ← 返回
        </Link>
        <div className="etymology-title-row">
          <p className="etymology-source-label">一级词源</p>
          <h1>{directory.etymologySource}</h1>
          <span>
            <b className="stat-number">{directory.entries.length}</b> 个同源词
          </span>
        </div>
      </div>

      <ProjectAccessGate
        contentKey={getPaidContentKey("vocabulary-etymology", sourceKey)}
        projectKey="vocabulary.etymology"
        title="词源词根目录需要单独开通"
      >
        <section className="etymology-hierarchy-panel" aria-label="词源词根词汇层级">
          {directory.groups.map((group) => (
            <article className={group.rootKey === "ungrouped" ? "ungrouped" : ""} key={group.rootKey}>
              <h2>
                <span className="etymology-root-label">
                  {group.rootKey === "ungrouped" ? "二级关系" : "二级词根"}
                </span>
                <strong>{group.rootKey === "ungrouped" ? "直接来自词源（未分词根）" : group.rootLabel}</strong>
                <em>
                  <b className="stat-number">{group.entries.length}</b> 个同根词
                </em>
              </h2>
              <div className="etymology-word-panel">
                {group.entries.map((entry) => (
                  <div className="etymology-word-row" key={entry.normalizedWord}>
                    <Link
                      className="etymology-word-term"
                      href={`/vocabulary/${encodeURIComponent(entry.normalizedWord)}`}
                    >
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
      </ProjectAccessGate>
    </section>
  );
}
