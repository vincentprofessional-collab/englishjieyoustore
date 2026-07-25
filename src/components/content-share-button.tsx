"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ContentShareButtonProps = {
  className?: string;
  label: string;
  text?: string;
  title: string;
  url?: string;
};

type ShareChannel = "微信好友" | "朋友圈" | "小红书";

type ShareCardData = {
  detailLines: string[];
  heroTitle: string;
  kind: "article" | "sentence" | "vocabulary" | "generic";
  previewLines: string[];
  previewTitle: string;
  sourceLabel: string;
};

function ShareIcon() {
  return (
    <svg aria-hidden="true" className="content-share-icon" viewBox="0 0 32 32">
      <path d="M11 13.5H8.8A2.8 2.8 0 0 0 6 16.3v8.9A2.8 2.8 0 0 0 8.8 28h14.4a2.8 2.8 0 0 0 2.8-2.8v-8.9a2.8 2.8 0 0 0-2.8-2.8H21" />
      <path d="M16 4v17" />
      <path d="m10.5 9.5 5.5-5.5 5.5 5.5" />
    </svg>
  );
}

function splitCanvasLines(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  const lines: string[] = [];

  value.split("\n").forEach((paragraph) => {
    const tokens = paragraph.match(/[\u3400-\u9fff]|[^\s\u3400-\u9fff]+|\s+/g) ?? [paragraph];
    let line = "";

    tokens.forEach((token) => {
      const candidate = `${line}${token}`;
      if (line.trim() && context.measureText(candidate).width > maxWidth) {
        lines.push(line.trim());
        line = token.trimStart();
      } else {
        line = candidate;
      }
    });

    if (line.trim()) {
      lines.push(line.trim());
    }
  });

  return lines;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const corner = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + corner, y);
  context.arcTo(x + width, y, x + width, y + height, corner);
  context.arcTo(x + width, y + height, x, y + height, corner);
  context.arcTo(x, y + height, x, y, corner);
  context.arcTo(x, y, x + width, y, corner);
  context.closePath();
}

function stripShareTitleSuffix(value: string) {
  return (
    value
      .replace(/\s*(?:词汇和短语|词汇卡片|英文例句|分享卡片)$/u, "")
      .replace(/\s+/g, " ")
      .trim() || value.trim()
  );
}

function stripDuplicateTitlePrefix(line: string, displayTitle: string) {
  const trimmedLine = line.trim();
  const normalizedLine = trimmedLine.toLowerCase();
  const normalizedTitle = displayTitle.toLowerCase();

  if (!normalizedTitle || !normalizedLine.startsWith(normalizedTitle)) {
    return trimmedLine;
  }

  return trimmedLine
    .slice(displayTitle.length)
    .replace(/^[\s\-:：|｜/]+/u, "")
    .trim();
}

function getSharePreviewLines(rawTitle: string, rawText?: string) {
  const displayTitle = stripShareTitleSuffix(rawTitle);
  return (rawText ?? "")
    .split("\n")
    .map((line, index) => (index === 0 ? stripDuplicateTitlePrefix(line, displayTitle) : line.trim()))
    .filter(Boolean);
}

function getShareCardData(rawTitle: string, rawText?: string): ShareCardData {
  const previewTitle = stripShareTitleSuffix(rawTitle);
  const previewLines = getSharePreviewLines(rawTitle, rawText);
  const isVocabularyCard = /\s*词汇卡片$/u.test(rawTitle);
  const articleMatch = previewTitle.match(/^(\d{6})[-\s]+(.+)$/u);
  const sentenceMatch = previewTitle.match(/^(\d{6})\s*第\s*(\d+)\s*句$/u);

  if (isVocabularyCard) {
    return {
      detailLines: previewLines.length ? previewLines : ["打开网页查看完整内容"],
      heroTitle: previewTitle,
      kind: "vocabulary",
      previewLines,
      previewTitle,
      sourceLabel: "外刊学习",
    };
  }

  if (articleMatch) {
    const englishTitle = previewLines.find((line) => !/[\u3400-\u9fff]/u.test(line)) ?? articleMatch[2];
    const chineseTitle = previewLines.find((line) => /[\u3400-\u9fff]/u.test(line)) ?? "";

    return {
      detailLines: [articleMatch[1], englishTitle, chineseTitle].filter(Boolean),
      heroTitle: "BBC TAKE AWAY ENGLISH",
      kind: "article",
      previewLines,
      previewTitle,
      sourceLabel: "外刊学习",
    };
  }

  if (sentenceMatch) {
    return {
      detailLines: [`${sentenceMatch[1]} 第 ${sentenceMatch[2]} 句`, ...previewLines].filter(Boolean),
      heroTitle: "BBC TAKE AWAY ENGLISH",
      kind: "sentence",
      previewLines,
      previewTitle,
      sourceLabel: "外刊学习",
    };
  }

  return {
    detailLines: previewLines.length ? previewLines : ["打开网页查看完整内容"],
    heroTitle: previewTitle,
    kind: "generic",
    previewLines,
    previewTitle,
    sourceLabel: "外刊学习",
  };
}

function setFittedCanvasFont(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: number,
  startSize: number,
  minSize: number,
  family: string,
) {
  let size = startSize;
  do {
    context.font = `${weight} ${size}px ${family}`;
    if (context.measureText(text).width <= maxWidth || size <= minSize) {
      return size;
    }
    size -= 2;
  } while (size >= minSize);

  return size;
}

function drawWrappedCanvasLines(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const wrappedLines = lines.flatMap((line) => splitCanvasLines(context, line, maxWidth));
  const visibleLines = wrappedLines.slice(0, maxLines);
  if (wrappedLines.length > visibleLines.length && visibleLines.length) {
    visibleLines[visibleLines.length - 1] = `${visibleLines[visibleLines.length - 1].replace(/[,.，。!?！？]?$/u, "")}…`;
  }

  visibleLines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });

  return y + visibleLines.length * lineHeight;
}

export function ContentShareButton({
  className = "",
  label,
  text,
  title,
  url,
}: ContentShareButtonProps) {
  const [feedback, setFeedback] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setIsMounted(true), []);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current != null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      document.body.classList.remove("share-sheet-open");
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.classList.add("share-sheet-open");
    closeButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("share-sheet-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function showFeedback(message: string) {
    setFeedback(message);
    if (feedbackTimerRef.current != null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(""), 2400);
  }

  function closeShareSheet() {
    setIsOpen(false);
    setFeedback("");
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function openShareSheet() {
    setShareUrl(new URL(url || window.location.href, window.location.href).toString());
    setFeedback("");
    setIsOpen(true);
  }

  function shareCopy() {
    const cardData = getShareCardData(title, text);
    return [cardData.previewTitle, ...cardData.previewLines, shareUrl].filter(Boolean).join("\n");
  }

  async function copyToClipboard(value: string) {
    if (navigator.clipboard?.writeText) {
      try {
        await Promise.race([
          navigator.clipboard.writeText(value),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("Clipboard timeout")), 900);
          }),
        ]);
        return;
      } catch {
        // Safari and embedded browsers can expose Clipboard API without granting it.
      }
    }

    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const didCopy = document.execCommand("copy");
    input.remove();
    if (!didCopy) {
      throw new Error("Clipboard is unavailable");
    }
  }

  async function copyShareUrl() {
    try {
      await copyToClipboard(shareUrl);
      showFeedback("精确位置链接已复制");
    } catch {
      showFeedback("复制失败，请稍后重试");
    }
  }

  async function openSystemShare({
    files,
    text: shareText,
    title: shareTitle,
    url: targetUrl,
  }: {
    files?: File[];
    text: string;
    title: string;
    url?: string;
  }) {
    if (!navigator.share) {
      return false;
    }

    const shareData: ShareData = files?.length
      ? { files, text: shareText, title: shareTitle }
      : { text: shareText, title: shareTitle, url: targetUrl };

    if (files?.length && navigator.canShare && !navigator.canShare(shareData)) {
      return false;
    }

    await navigator.share(shareData);
    return true;
  }

  function createShareCardFile(blob: Blob) {
    return new File([blob], `share-card-${Date.now()}.png`, { type: "image/png" });
  }

  async function shareToChannel(channel: ShareChannel) {
    try {
      const cardData = getShareCardData(title, text);
      const copiedShareText = shareCopy();

      if (channel === "微信好友") {
        const didOpenSystemShare = await openSystemShare({
          text: [cardData.previewTitle, ...cardData.previewLines].filter(Boolean).join("\n"),
          title: cardData.previewTitle,
          url: shareUrl,
        });

        if (didOpenSystemShare) {
          showFeedback("系统分享已打开，可选择微信好友发送");
          return;
        }

        await copyToClipboard(copiedShareText);
        showFeedback("内容已复制，请打开微信粘贴给好友");
      } else {
        setIsGenerating(true);
        const blob = await createShareCardBlob();
        const file = createShareCardFile(blob);
        const didOpenSystemShare = await openSystemShare({
          files: [file],
          text: copiedShareText,
          title: cardData.previewTitle,
        });

        if (didOpenSystemShare) {
          showFeedback(channel === "朋友圈" ? "系统分享已打开，可选择微信朋友圈发布" : "系统分享已打开，可选择小红书发布");
          return;
        }

        downloadBlob(blob);
        await copyToClipboard(copiedShareText);
        showFeedback(channel === "朋友圈" ? "图片和文案已准备好，请打开微信朋友圈发布" : "图片与文案已准备好，请打开小红书发布");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        await copyToClipboard(shareCopy());
        showFeedback(
          channel === "微信好友"
            ? "内容已复制，请打开微信粘贴给好友"
            : channel === "朋友圈"
              ? "文案已复制，请打开微信朋友圈发布"
              : "文案已复制，请打开小红书发布",
        );
      } catch {
        showFeedback("暂时无法分享，请稍后重试");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function openWeiboShare() {
    const cardData = getShareCardData(title, text);
    const weiboUrl = new URL("https://service.weibo.com/share/share.php");
    weiboUrl.searchParams.set("url", shareUrl);
    weiboUrl.searchParams.set("title", [cardData.previewTitle, ...cardData.previewLines].filter(Boolean).join("\n"));
    window.open(weiboUrl.toString(), "_blank", "noopener,noreferrer");
    showFeedback("已打开微博发布页面");
  }

  async function createShareCardBlob() {
    await document.fonts?.ready;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is unavailable");
    }

    canvas.width = 1200;
    canvas.height = 1500;

    const cardData = getShareCardData(title, text);
    const background = context.createLinearGradient(0, 0, 1200, 1500);
    background.addColorStop(0, "#fffdf7");
    background.addColorStop(0.58, "#f7f0df");
    background.addColorStop(1, "#efe2bf");
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#0b6b52";
    context.fillRect(0, 0, 28, canvas.height);
    context.fillStyle = "rgba(200, 148, 25, 0.16)";
    context.beginPath();
    context.arc(1115, 120, 220, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#0b6b52";
    context.font = '800 34px "Songti SC", "Noto Serif SC", serif';
    context.fillText(cardData.sourceLabel, 92, 118);
    context.fillStyle = "#c89419";
    context.font = '800 24px Georgia, "Times New Roman", serif';
    context.fillText("SHARE CARD", 92, 158);

    context.fillStyle = "#121611";
    setFittedCanvasFont(
      context,
      cardData.heroTitle,
      1016,
      800,
      cardData.heroTitle.length > 24 ? 62 : 74,
      44,
      'Georgia, "Songti SC", serif',
    );
    const titleLines = splitCanvasLines(context, cardData.heroTitle, 1016).slice(0, 2);
    let cursorY = 280;
    titleLines.forEach((line) => {
      context.fillText(line, 92, cursorY);
      cursorY += 82;
    });

    function drawBrandBlock(drawingContext: CanvasRenderingContext2D, x: number, y: number) {
      drawRoundedRect(drawingContext, x, y, 96, 96, 24);
      drawingContext.fillStyle = "rgba(255, 255, 255, 0.82)";
      drawingContext.fill();
      drawingContext.strokeStyle = "rgba(15, 86, 67, 0.24)";
      drawingContext.lineWidth = 2;
      drawingContext.stroke();
      drawingContext.fillStyle = "#0b6b52";
      drawingContext.font = '800 46px "Songti SC", "Noto Serif SC", serif';
      drawingContext.fillText("英", x + 26, y + 63);
      drawingContext.font = '800 30px "Songti SC", "Noto Serif SC", serif';
      drawingContext.fillText("英文解忧杂货铺", x + 114, y + 70);
      drawingContext.strokeStyle = "#c89419";
      drawingContext.lineWidth = 4;
      drawingContext.beginPath();
      drawingContext.moveTo(x, y + 126);
      drawingContext.lineTo(Math.min(1128, x + 382), y + 126);
      drawingContext.stroke();
    }

    function drawLinkBlock(drawingContext: CanvasRenderingContext2D, y: number) {
      drawRoundedRect(drawingContext, 72, y, 1056, 130, 34);
      drawingContext.fillStyle = "rgba(255, 255, 255, 0.72)";
      drawingContext.fill();
      drawingContext.strokeStyle = "rgba(200, 148, 25, 0.45)";
      drawingContext.lineWidth = 2;
      drawingContext.stroke();
      drawingContext.fillStyle = "#0b6b52";
      drawingContext.font = '800 25px "Songti SC", sans-serif';
      drawingContext.fillText("点击链接直达分享内容", 112, y + 55);
      drawingContext.fillStyle = "#4d554f";
      drawingContext.font = '500 24px "Helvetica Neue", sans-serif';
      const urlLines = splitCanvasLines(drawingContext, shareUrl, 970).slice(0, 2);
      urlLines.forEach((line, index) => drawingContext.fillText(line, 112, y + 100 + index * 32));
    }

    if (cardData.kind === "vocabulary") {
      const rootLineIndex = cardData.detailLines.findIndex((line) => line.startsWith("词根词缀："));
      const phoneticLine = cardData.detailLines[0] ?? "";
      const definitionLines =
        rootLineIndex > 0 ? cardData.detailLines.slice(1, rootLineIndex) : cardData.detailLines.slice(1, 3);
      const rootLine = rootLineIndex >= 0 ? cardData.detailLines[rootLineIndex] : "";
      let vocabularyCursorY = Math.max(cursorY + 28, 398);

      if (phoneticLine) {
        context.fillStyle = "#171b17";
        context.font = '800 42px Georgia, "Times New Roman", serif';
        drawWrappedCanvasLines(context, [phoneticLine], 92, vocabularyCursorY, 920, 54, 1);
        vocabularyCursorY += 72;
      }

      if (definitionLines.length) {
        context.fillStyle = "#171b17";
        context.font = '800 38px "Songti SC", "Noto Serif SC", serif';
        vocabularyCursorY = drawWrappedCanvasLines(context, definitionLines, 92, vocabularyCursorY, 920, 56, 3) + 34;
      }

      if (rootLine) {
        context.fillStyle = "#171b17";
        context.font = '700 32px Georgia, "Songti SC", serif';
        drawWrappedCanvasLines(context, [rootLine], 92, vocabularyCursorY, 920, 44, 3);
      }

      drawBrandBlock(context, 820, 760);
      drawLinkBlock(context, 980);
    } else {
      context.fillStyle = "#171b17";
      const detailStartY = 930;
      if (cardData.detailLines[0]) {
        context.font = '800 42px Georgia, "Songti SC", serif';
        context.fillText(cardData.detailLines[0], 92, detailStartY);
      }
      if (cardData.detailLines[1]) {
        context.font = '700 44px Georgia, "Songti SC", serif';
        drawWrappedCanvasLines(context, [cardData.detailLines[1]], 92, detailStartY + 76, 680, 56, 2);
      }
      if (cardData.detailLines[2]) {
        context.font = '700 38px "Songti SC", "Noto Serif SC", serif';
        drawWrappedCanvasLines(context, [cardData.detailLines[2]], 92, detailStartY + 190, 680, 50, 2);
      }
      if (cardData.detailLines.length > 3) {
        context.fillStyle = "#314038";
        context.font = '500 30px Georgia, "Songti SC", serif';
        drawWrappedCanvasLines(context, cardData.detailLines.slice(3), 92, detailStartY + 300, 680, 42, 3);
      }

      drawBrandBlock(context, 820, 1115);
      drawLinkBlock(context, 1260);
    }

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to create image"));
        }
      }, "image/png");
    });
  }

  function downloadBlob(blob: Blob) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `share-card-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  async function generateShareImage() {
    setIsGenerating(true);
    try {
      downloadBlob(await createShareCardBlob());
      showFeedback("分享图片已生成");
    } catch {
      showFeedback("图片生成失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  }

  const cardData = getShareCardData(title, text);
  const shareSheet = isOpen ? (
    <div
      className="share-sheet-overlay"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          closeShareSheet();
        }
      }}
      role="presentation"
    >
      <section aria-label={`${title} 分享面板`} aria-modal="true" className="share-sheet-panel" role="dialog">
        <div aria-hidden="true" className="share-sheet-handle" />
        <header className="share-sheet-head">
          <div>
            <span>Share · 分享</span>
            <h2>把这一内容分享给朋友</h2>
          </div>
          <button aria-label="关闭分享面板" className="share-sheet-close" onClick={closeShareSheet} ref={closeButtonRef} type="button">
            ×
          </button>
        </header>

        <article className="share-sheet-preview">
          <div className="share-sheet-preview-mark">{cardData.sourceLabel}</div>
          <h3>{cardData.previewTitle}</h3>
          {cardData.previewLines.length ? (
            <div className="share-sheet-preview-copy">
              {cardData.previewLines.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          ) : null}
          <a href={shareUrl} rel="noreferrer" target="_blank">
            <span>打开分享内容</span>
            <small>{shareUrl}</small>
            <b aria-hidden="true">↗</b>
          </a>
        </article>

        <div aria-label="分享方式" className="share-sheet-actions">
          <button onClick={() => void shareToChannel("微信好友")} type="button">
            <span aria-hidden="true" className="share-sheet-channel-icon wechat">微</span>
            <strong>微信好友</strong>
          </button>
          <button disabled={isGenerating} onClick={() => void shareToChannel("朋友圈")} type="button">
            <span aria-hidden="true" className="share-sheet-channel-icon moments">圈</span>
            <strong>朋友圈</strong>
          </button>
          <button onClick={openWeiboShare} type="button">
            <span aria-hidden="true" className="share-sheet-channel-icon weibo">博</span>
            <strong>微博</strong>
          </button>
          <button disabled={isGenerating} onClick={() => void shareToChannel("小红书")} type="button">
            <span aria-hidden="true" className="share-sheet-channel-icon xiaohongshu">书</span>
            <strong>小红书</strong>
          </button>
          <button disabled={isGenerating} onClick={() => void generateShareImage()} type="button">
            <span aria-hidden="true" className="share-sheet-channel-icon image">图</span>
            <strong>{isGenerating ? "生成中" : "生成图片"}</strong>
          </button>
          <button onClick={() => void copyShareUrl()} type="button">
            <span aria-hidden="true" className="share-sheet-channel-icon link">链</span>
            <strong>复制链接</strong>
          </button>
        </div>

        <footer className="share-sheet-footer">
          <span>{feedback || "分享链接会精确定位到当前文章、句子或词汇。"}</span>
        </footer>
      </section>
    </div>
  ) : null;

  return (
    <span className={`content-share-control ${className}`.trim()}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={label}
        className="content-share-button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openShareSheet();
        }}
        ref={triggerRef}
        title={label}
        type="button"
      >
        <ShareIcon />
      </button>
      {isMounted && shareSheet ? createPortal(shareSheet, document.body) : null}
    </span>
  );
}
