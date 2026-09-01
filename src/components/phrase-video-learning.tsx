"use client";

import { useMemo, useState, type CSSProperties } from "react";

type ClipSample = {
  clip_id: string;
  occurrence_count: number;
  english_text: string;
  relative_path: string;
  source_key: string;
  rights_status: string;
  media_url: string | null;
};

type Phrase = {
  phrase_id: string;
  rank: number;
  phrase: string;
  word_count: number;
  occurrence_count: number;
  clip_count: number;
  source_count: number;
  rule_reason: string;
  review_status: string;
  rights_status: string;
  samples: ClipSample[];
};

type PhraseManifest = {
  title: string;
  visibility: string;
  rights_status: string;
  media_policy: string;
  phrase_sort: string[];
  phrase_count: number;
  clip_count: number;
  phrases: Phrase[];
};

export function PhraseVideoLearning({ manifest }: { manifest: PhraseManifest | null }) {
  const [query, setQuery] = useState("");
  const filteredPhrases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return manifest?.phrases || [];
    return (manifest?.phrases || []).filter(
      (phrase) =>
        phrase.phrase.includes(normalizedQuery) ||
        phrase.samples.some((sample) => sample.english_text.toLowerCase().includes(normalizedQuery)),
    );
  }, [manifest, query]);

  if (!manifest) {
    return (
      <main style={styles.shell}>
        <h1 style={styles.title}>短语视频学习</h1>
        <p style={styles.muted}>本地审核 manifest 尚未生成。请先完成只读扫描与短语构建。</p>
      </main>
    );
  }

  return (
    <main style={styles.shell}>
      <p style={styles.eyebrow}>LOCAL REVIEW ONLY</p>
      <h1 style={styles.title}>{manifest.title}</h1>
      <p style={styles.muted}>
        {manifest.clip_count.toLocaleString()} 个视频 · {manifest.phrase_count.toLocaleString()} 个候选短语
      </p>
      <div style={styles.notice}>
        <strong>版权与媒体状态：</strong> {manifest.rights_status}。{manifest.media_policy}
      </div>
      <div style={styles.toolbar}>
        <input
          aria-label="搜索短语或台词"
          placeholder="搜索短语或台词"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={styles.input}
        />
        <span style={styles.muted}>排序：{manifest.phrase_sort.join(" → ")}</span>
      </div>
      {!filteredPhrases.length ? (
        <p style={styles.empty}>没有匹配结果。</p>
      ) : (
        <div style={styles.grid}>
          {filteredPhrases.map((phrase) => (
            <article key={phrase.phrase_id} style={styles.card}>
              <div style={styles.rank}>#{phrase.rank}</div>
              <h2 style={styles.phrase}>{phrase.phrase}</h2>
              <p style={styles.stats}>
                {phrase.clip_count} 个视频 · {phrase.source_count} 个来源 · {phrase.occurrence_count} 次出现
              </p>
              <p style={styles.review}>规则候选 · 待人工复核 · {phrase.rule_reason}</p>
              {phrase.samples.map((sample) => (
                <div key={sample.clip_id} style={styles.sample}>
                  <p style={styles.sampleText}>{sample.english_text}</p>
                  <p style={styles.path}>{sample.relative_path}</p>
                  <span style={styles.disabledMedia}>媒体未接入：rights_status 未授权</span>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "48px 24px 72px",
  },
  eyebrow: {
    color: "#6366f1",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.14em",
    margin: 0,
  },
  title: {
    color: "#111827",
    fontSize: "clamp(32px, 5vw, 52px)",
    letterSpacing: "-0.04em",
    lineHeight: 1.08,
    margin: "10px 0 10px",
  },
  muted: {
    color: "#64748b",
    lineHeight: 1.6,
  },
  notice: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 14,
    color: "#9a3412",
    lineHeight: 1.7,
    margin: "24px 0",
    padding: "14px 16px",
  },
  toolbar: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    margin: "24px 0",
  },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontSize: 16,
    minWidth: 280,
    padding: "11px 13px",
  },
  grid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    boxShadow: "0 5px 18px rgba(15, 23, 42, 0.05)",
    padding: 18,
  },
  rank: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 700,
  },
  phrase: {
    color: "#1e1b4b",
    fontSize: 22,
    margin: "4px 0 5px",
  },
  stats: {
    color: "#475569",
    fontSize: 14,
    margin: 0,
  },
  review: {
    color: "#7c3aed",
    fontSize: 12,
    margin: "8px 0 0",
  },
  sample: {
    borderTop: "1px solid #eef2f7",
    marginTop: 14,
    paddingTop: 12,
  },
  sampleText: {
    color: "#1f2937",
    lineHeight: 1.6,
    margin: 0,
  },
  path: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
    margin: "5px 0",
    overflowWrap: "anywhere",
  },
  disabledMedia: {
    color: "#b45309",
    fontSize: 12,
  },
  empty: {
    background: "#ffffff",
    borderRadius: 12,
    color: "#64748b",
    padding: 20,
  },
};
