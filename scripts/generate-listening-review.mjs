import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSectionAudioTranscriptReview } from "./listening-review/listening-review-lib.mjs";
import { cambridgeFiveTestOneSectionOneReviewConfig } from "./listening-review/data/cambridge-5-test-1-section-1.mjs";

const reviewConfigs = {
  "cambridge-5-test-1-section-1": cambridgeFiveTestOneSectionOneReviewConfig,
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHtml(review) {
  const rows = review.items
    .map((item) => {
      const answerQuestions =
        item.answerQuestionNos.length > 0 ? "Q" + item.answerQuestionNos.join(", Q") : "";
      const changed = item.changedFromSrt ? "changed" : "";
      const audioSrc = item.smallAudio.reviewRelativePath ?? "";
      const durationDelta =
        item.smallAudio.durationDeltaSeconds == null ? "" : item.smallAudio.durationDeltaSeconds.toFixed(3) + "s";

      return `
        <tr class="${changed}">
          <td>${String(item.cueNo).padStart(3, "0")}</td>
          <td>${escapeHtml(item.time.start)} - ${escapeHtml(item.time.end)}</td>
          <td>${audioSrc ? `<audio controls preload="none" src="${escapeHtml(audioSrc)}"></audio>` : "missing"}</td>
          <td>${escapeHtml(durationDelta)}</td>
          <td>${escapeHtml(item.srtEnglishText)}</td>
          <td>${escapeHtml(item.reviewEnglishText)}</td>
          <td>${escapeHtml(answerQuestions)}</td>
          <td><input type="checkbox"></td>
        </tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(review.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
      margin: 24px;
      color: #17231d;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th,
    td {
      border: 1px solid #d9d1bd;
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f6f0e2;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    tr.changed {
      background: #fff7d6;
    }
    audio {
      width: 180px;
    }
    .summary {
      margin-bottom: 18px;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(review.title)}</h1>
  <div class="summary">
    <p>句子数：${review.summary.cueCount}；小音频：${review.summary.smallAudioCount}；缺失小音频：${review.summary.missingSmallAudioCount}；英文修正：${review.summary.changedEnglishCount}；答案句：${review.summary.answerCueCount}</p>
    <p>审查方式：逐行播放小音频，核对“校准英文”。确认无误后，勾选最右侧复选框。黄色行表示 SRT 原文被修正过。</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>时间</th>
        <th>小音频</th>
        <th>时长差</th>
        <th>SRT 原文</th>
        <th>校准英文</th>
        <th>答案题号</th>
        <th>确认</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

export function writeReviewOutput(review, outputDir) {
  const audioOutputDir = path.join(outputDir, "audio");
  mkdirSync(audioOutputDir, { recursive: true });

  const reviewWithRelativeAudio = {
    ...review,
    items: review.items.map((item) => {
      const fileName = String(item.cueNo).padStart(3, "0") + ".mp3";
      const audioOutputPath = path.join(audioOutputDir, fileName);

      if (item.smallAudio.exists) {
        copyFileSync(item.smallAudio.path, audioOutputPath);
      }

      return {
        ...item,
        smallAudio: {
          ...item.smallAudio,
          reviewRelativePath: item.smallAudio.exists ? "audio/" + fileName : "",
        },
      };
    }),
  };

  const jsonPath = path.join(outputDir, "audio-transcript-review.json");
  const htmlPath = path.join(outputDir, "audio-transcript-review.html");

  writeFileSync(jsonPath, JSON.stringify(reviewWithRelativeAudio, null, 2) + "\n");
  writeFileSync(htmlPath, renderHtml(reviewWithRelativeAudio));

  return { htmlPath, jsonPath };
}

function main() {
  const reviewId = process.argv[2] ?? "cambridge-5-test-1-section-1";
  const config = reviewConfigs[reviewId];

  if (!config) {
    throw new Error("Unknown listening review id: " + reviewId);
  }

  const review = buildSectionAudioTranscriptReview(config);
  const outputDir = path.join(process.cwd(), "tmp", "listening-review", reviewId);
  const { htmlPath, jsonPath } = writeReviewOutput(review, outputDir);

  console.log("Review JSON: " + jsonPath);
  console.log("Review HTML: " + htmlPath);
  console.log(
    "Summary: " +
      JSON.stringify({
        cueCount: review.summary.cueCount,
        smallAudioCount: review.summary.smallAudioCount,
        missingSmallAudioCount: review.summary.missingSmallAudioCount,
        changedEnglishCount: review.summary.changedEnglishCount,
        answerCueCount: review.summary.answerCueCount,
      }),
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
