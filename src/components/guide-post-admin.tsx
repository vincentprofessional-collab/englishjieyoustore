"use client";

import { ChangeEvent, KeyboardEvent, PointerEvent, useEffect, useRef, useState } from "react";
import {
  createGuideBlock,
  GuideBlockType,
  GuideContentBlock,
  GuidePostRow,
  parseGuidePostRow,
} from "@/lib/guide/posts";
import { getPaidPageContentSlug } from "@/lib/access-control";
import { uploadAdminImage } from "@/lib/admin/upload-image";
import { supabase } from "@/lib/supabase/client";
import { uploadAdminAudio } from "@/lib/admin/upload-audio";
import { uploadAdminVideo } from "@/lib/admin/upload-video";

type GuidePostAdminProps = {
  adminUserId: string;
  projectKey?: string;
  projectTitle?: string;
};

type AdminGuidePostRow = GuidePostRow & {
  status: "archived" | "draft" | "published";
  updated_at: string | null;
};

type GuideDraft = {
  author: string;
  blocks: GuideContentBlock[];
  excerpt: string;
  id: string | null;
  publishedAt: string | null;
  slug: string | null;
  status: AdminGuidePostRow["status"];
  title: string;
};

type TextCursorTarget = {
  blockId: string;
  selectionEnd: number;
  selectionStart: number;
};

type MediaDialogKind = "audio" | "image" | "link" | "video";

type MediaDialogState = {
  caption: string;
  file: File | null;
  kind: MediaDialogKind;
  text: string;
  url: string;
};

type EditorSnapshot = Pick<GuideDraft, "author" | "blocks" | "excerpt" | "title">;

const EMPTY_DRAFT: GuideDraft = {
  author: "",
  blocks: [createGuideBlock()],
  excerpt: "",
  id: null,
  publishedAt: null,
  slug: null,
  status: "draft",
  title: "",
};

const BLOCK_LABELS: Record<GuideBlockType, string> = {
  audio: "音频",
  heading: "小标题",
  image: "图片",
  link: "链接",
  paragraph: "正文段落",
  video: "视频",
};

function createEmptyDraft(): GuideDraft {
  return {
    ...EMPTY_DRAFT,
    blocks: [createGuideBlock()],
  };
}

function rowToDraft(row: AdminGuidePostRow): GuideDraft {
  const post = parseGuidePostRow(row);

  return {
    author: post.author ?? "",
    blocks: post.blocks.map((block) => ({ ...block })),
    excerpt: post.excerpt,
    id: row.id,
    publishedAt: row.published_at,
    slug: row.slug,
    status: row.status,
    title: row.title,
  };
}

function firstText(blocks: GuideContentBlock[]) {
  return blocks.find((block) => block.text.trim())?.text.trim() ?? "";
}

function firstImage(blocks: GuideContentBlock[]) {
  return blocks.find((block) => block.type === "image" && block.url)?.url ?? null;
}

const EDITOR_FONT_FAMILIES: Record<GuideContentBlock["fontFamily"], string> = {
  georgia: 'Georgia, "Times New Roman", serif',
  kaiti: '"KaiTi", "STKaiti", serif',
  sans: "Arial, sans-serif",
  serif: '"Songti SC", "SimSun", serif',
};

const EDITOR_FONT_COMMANDS: Record<GuideContentBlock["fontFamily"], string> = {
  georgia: "Georgia",
  kaiti: "KaiTi",
  sans: "Arial",
  serif: "SimSun",
};

function editorBlockStyle(block: GuideContentBlock) {
  return {
    backgroundColor: block.backgroundColor || undefined,
    color: block.color || undefined,
    fontFamily: EDITOR_FONT_FAMILIES[block.fontFamily],
    fontSize: `${block.fontSize}px`,
    fontStyle: block.italic ? "italic" : undefined,
    fontWeight: block.bold ? 800 : undefined,
    textAlign: block.align,
    textDecoration:
      [block.underline ? "underline" : "", block.strike ? "line-through" : ""]
        .filter(Boolean)
        .join(" ") || undefined,
  };
}

function escapeEditorHtml(value: string) {
  if (typeof document === "undefined") {
    return value;
  }

  const container = document.createElement("div");
  container.textContent = value;
  return container.innerHTML;
}

function editorHtml(block: GuideContentBlock) {
  return block.html || escapeEditorHtml(block.text);
}

function textOffsetInElement(element: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.setEnd(node, offset);
  return range.toString().length;
}

function pointAtTextOffset(element: HTMLElement, requestedOffset: number) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let consumed = 0;

  while (node) {
    const length = node.textContent?.length ?? 0;
    if (requestedOffset <= consumed + length) {
      return { node, offset: Math.max(0, requestedOffset - consumed) };
    }
    consumed += length;
    node = walker.nextNode();
  }

  return { node: element, offset: element.childNodes.length };
}

function splitEditorHtml(html: string, offset: number) {
  const root = document.createElement("div");
  root.innerHTML = html;
  const point = pointAtTextOffset(root, Math.max(0, offset));
  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(root);
  beforeRange.setEnd(point.node, point.offset);
  const afterRange = document.createRange();
  afterRange.selectNodeContents(root);
  afterRange.setStart(point.node, point.offset);
  const before = document.createElement("div");
  before.appendChild(beforeRange.cloneContents());
  const after = document.createElement("div");
  after.appendChild(afterRange.cloneContents());
  return { after: after.innerHTML, before: before.innerHTML };
}

function ResizableImagePreview({
  block,
  onResize,
}: {
  block: GuideContentBlock;
  onResize: (width: number, height: number) => void;
}) {
  const [width, setWidth] = useState(block.width ?? 640);
  const [height, setHeight] = useState(block.height ?? 360);
  const sizeRef = useRef({ height: block.height ?? 360, width: block.width ?? 640 });
  const dragRef = useRef<{ startHeight: number; startWidth: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const nextWidth = block.width ?? 640;
    const nextHeight = block.height ?? 360;
    sizeRef.current = { height: nextHeight, width: nextWidth };
    setWidth(nextWidth);
    setHeight(nextHeight);
  }, [block.height, block.width]);

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startHeight: sizeRef.current.height,
      startWidth: sizeRef.current.width,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function resize(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const nextWidth = Math.min(1400, Math.max(120, Math.round(drag.startWidth + event.clientX - drag.startX)));
    const nextHeight = Math.min(1000, Math.max(80, Math.round(drag.startHeight + event.clientY - drag.startY)));
    sizeRef.current = { height: nextHeight, width: nextWidth };
    setWidth(nextWidth);
    setHeight(nextHeight);
  }

  function finishResize(event: PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onResize(sizeRef.current.width, sizeRef.current.height);
  }

  return (
    <figure className="guide-editor-inline-media guide-editor-resizable-media" style={{ height, width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="guide-editor-asset-preview" alt={block.caption || "图片预览"} src={block.url} />
      {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      <button
        aria-label="拖动调整图片大小"
        className="guide-editor-resize-handle"
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={finishResize}
        type="button"
      />
    </figure>
  );
}

export function GuidePostAdmin({ adminUserId, projectKey, projectTitle }: GuidePostAdminProps) {
  const isPaidPage = Boolean(projectKey);
  const paidPageTitle = projectTitle?.trim() || "收费页面说明";
  const [draft, setDraft] = useState<GuideDraft>(createEmptyDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<AdminGuidePostRow[]>([]);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [textCursorTarget, setTextCursorTarget] = useState<TextCursorTarget | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [mediaDialog, setMediaDialog] = useState<MediaDialogState | null>(null);
  const editableRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const historyRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const [, refreshHistory] = useState(0);

  useEffect(() => {
    void loadPosts();
  }, []);

  async function getAdminAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function loadPosts(preferredId?: string) {
    setIsLoading(true);
    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setMessage("管理员登录已失效，请重新登录。");
      setIsLoading(false);
      return;
    }

    const query = isPaidPage
      ? `?scope=paid&projectKey=${encodeURIComponent(projectKey ?? "")}`
      : "";
    const response = await fetch(`/api/guide-posts${query}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const responseBody = (await response.json().catch(() => null)) as {
      error?: string;
      posts?: AdminGuidePostRow[];
    } | null;

    if (!response.ok) {
      setMessage(`无法读取帖子：${responseBody?.error ?? "请稍后再试。"}`);
      setIsLoading(false);
      return;
    }

    const nextRows = responseBody?.posts ?? [];
    setRows(nextRows);

    if (isPaidPage && !nextRows.length) {
      setDraft({ ...createEmptyDraft(), title: paidPageTitle });
      setIsLoading(false);
      return;
    }

    const selectedRow =
      nextRows.find((row) => row.id === preferredId) ??
      (draft.id ? nextRows.find((row) => row.id === draft.id) : undefined);

    if (selectedRow) {
      setDraft(rowToDraft(selectedRow));
    }

    setIsLoading(false);
  }

  function startNewPost() {
    setDraft(isPaidPage ? { ...createEmptyDraft(), title: paidPageTitle } : createEmptyDraft());
    setActiveBlockId(null);
    historyRef.current = [];
    futureRef.current = [];
    refreshHistory((value) => value + 1);
    setMessage("");
  }

  function snapshot(current: GuideDraft): EditorSnapshot {
    return {
      author: current.author,
      blocks: current.blocks.map((block) => ({ ...block })),
      excerpt: current.excerpt,
      title: current.title,
    };
  }

  function updateBlock(
    blockId: string,
    patch: Partial<GuideContentBlock>,
    recordHistory = false,
  ) {
    if (recordHistory) {
      historyRef.current = [...historyRef.current, snapshot(draft)].slice(-50);
      futureRef.current = [];
      refreshHistory((value) => value + 1);
    }
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...block, ...patch } : block,
      ),
    }));
    setMessage("");
  }

  function rememberTextCursor(blockId: string, element: HTMLElement) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
      return;
    }

    setActiveBlockId(blockId);
    setTextCursorTarget({
      blockId,
      selectionEnd: textOffsetInElement(element, range.endContainer, range.endOffset),
      selectionStart: textOffsetInElement(element, range.startContainer, range.startOffset),
    });
  }

  function restoreTextSelection(blockId: string) {
    const target = textCursorTarget;
    const element = editableRefs.current[blockId];
    if (!element || !target || target.blockId !== blockId) {
      return false;
    }

    const selection = window.getSelection();
    if (!selection) {
      return false;
    }

    const start = pointAtTextOffset(element, target.selectionStart);
    const end = pointAtTextOffset(element, target.selectionEnd);
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function syncEditableBlock(blockId: string, element: HTMLElement, recordHistory = false) {
    const text = element.innerText.replace(/\u00a0/g, " ");
    const html = element.innerHTML;
    updateBlock(blockId, { html, text }, recordHistory);
    rememberTextCursor(blockId, element);
  }

  function applySelectionCommand(command: string, value?: string) {
    const block = activeBlock();
    const element = block ? editableRefs.current[block.id] : null;
    if (!block || !element || (block.type !== "paragraph" && block.type !== "heading")) {
      return false;
    }

    element.focus();
    if (!restoreTextSelection(block.id)) {
      return false;
    }

    document.execCommand(command, false, value);
    syncEditableBlock(block.id, element, true);
    return true;
  }

  function changeBlockType(blockId: string, type: GuideBlockType) {
    updateBlock(blockId, {
      caption: "",
      fontSize: type === "heading" ? 28 : 18,
      text: "",
      type,
      url: "",
      html: undefined,
    });
  }

  function addBlock(type: GuideBlockType) {
    if (type === "image" || type === "video" || type === "audio" || type === "link") {
      openMediaDialog(type);
      return;
    }

    const block = createGuideBlock(type);
    setDraft((current) => ({
      ...current,
      blocks: [...current.blocks, block],
    }));
    setActiveBlockId(block.id);
    setMessage("");
  }

  function activeBlock() {
    return draft.blocks.find((block) => block.id === activeBlockId) ?? draft.blocks[0];
  }

  function toggleFormat(field: "bold" | "italic" | "strike" | "underline") {
    const block = activeBlock();
    if (!block || (block.type !== "paragraph" && block.type !== "heading")) return;
    const command = field === "bold" ? "bold" : field === "italic" ? "italic" : field === "underline" ? "underline" : "strikeThrough";
    if (applySelectionCommand(command)) {
      return;
    }
    updateBlock(block.id, { [field]: !block[field] }, true);
  }

  function applyFontFamily(fontFamily: GuideContentBlock["fontFamily"]) {
    if (applySelectionCommand("fontName", EDITOR_FONT_COMMANDS[fontFamily])) {
      return;
    }
    const block = activeBlock();
    if (block) updateBlock(block.id, { fontFamily }, true);
  }

  function applyFontSize(fontSize: number) {
    const sizeMap: Record<number, string> = { 14: "1", 16: "2", 17: "3", 18: "3", 20: "4", 24: "5", 28: "6", 32: "7", 36: "7", 42: "7" };
    if (applySelectionCommand("fontSize", sizeMap[fontSize] ?? "3")) {
      return;
    }
    const block = activeBlock();
    if (block) updateBlock(block.id, { fontSize }, true);
  }

  function applyColor(command: "foreColor" | "hiliteColor", color: string) {
    if (applySelectionCommand(command, color)) {
      return;
    }
    const block = activeBlock();
    if (block) updateBlock(block.id, command === "foreColor" ? { color } : { backgroundColor: color }, true);
  }

  function clearFormatting() {
    const block = activeBlock();
    if (!block) return;
    if (applySelectionCommand("removeFormat")) {
      return;
    }
    updateBlock(block.id, {
      align: "left",
      backgroundColor: undefined,
      bold: false,
      color: undefined,
      fontFamily: "serif",
      fontSize: block.type === "heading" ? 28 : 18,
      italic: false,
      strike: false,
      underline: false,
    }, true);
  }

  function insertEmoji() {
    const block = activeBlock();
    if (!block || (block.type !== "paragraph" && block.type !== "heading")) return;
    if (applySelectionCommand("insertText", "😊")) {
      return;
    }
    updateBlock(block.id, { text: `${block.text}${block.text ? " " : ""}😊`, html: undefined }, true);
  }

  function undo() {
    const previous = historyRef.current.pop();
    if (!previous) return;
    futureRef.current.unshift(snapshot(draft));
    setDraft((current) => ({ ...current, ...previous, blocks: previous.blocks.map((block) => ({ ...block })) }));
    refreshHistory((value) => value + 1);
    setMessage("已撤销上一步格式操作。");
  }

  function redo() {
    const next = futureRef.current.shift();
    if (!next) return;
    historyRef.current.push(snapshot(draft));
    setDraft((current) => ({ ...current, ...next, blocks: next.blocks.map((block) => ({ ...block })) }));
    refreshHistory((value) => value + 1);
    setMessage("已恢复上一步格式操作。");
  }

  function insertBlockAtTextCursor(
    type: MediaDialogKind,
    payload: { caption?: string; text?: string; url: string },
  ) {
    setDraft((current) => {
      const blockId = textCursorTarget?.blockId;
      const blockIndex = blockId
        ? current.blocks.findIndex((block) => block.id === blockId)
        : -1;
      const block = current.blocks[blockIndex];
      const insertedBlock: GuideContentBlock = {
        ...createGuideBlock(type),
        caption: payload.caption ?? "",
        text: payload.text ?? "",
        url: payload.url,
      };

      if (blockIndex < 0 || !block || (block.type !== "paragraph" && block.type !== "heading")) {
        return {
          ...current,
          blocks: [...current.blocks, insertedBlock],
        };
      }

      const cursor: TextCursorTarget =
        textCursorTarget?.blockId === block.id
          ? textCursorTarget
          : {
              blockId: block.id,
              selectionEnd: block.text.length,
              selectionStart: block.text.length,
            };
      const selectionStart = Math.min(cursor.selectionStart, block.text.length);
      const selectionEnd = Math.min(cursor.selectionEnd, block.text.length);
      const beforeText = block.text.slice(0, selectionStart);
      const afterText = block.text.slice(selectionEnd);
      const htmlParts = splitEditorHtml(editorHtml(block), selectionStart);
      const replacementBlocks: GuideContentBlock[] = [
        ...(beforeText
          ? [{ ...block, html: htmlParts.before, text: beforeText }]
          : []),
        { ...insertedBlock, align: block.align },
        ...(afterText
          ? [
              {
                ...block,
                id: createGuideBlock("paragraph").id,
                html: htmlParts.after,
                text: afterText,
              },
            ]
          : []),
      ];

      return {
        ...current,
        blocks: [
          ...current.blocks.slice(0, blockIndex),
          ...(replacementBlocks.length ? replacementBlocks : [insertedBlock]),
          ...current.blocks.slice(blockIndex + 1),
        ],
      };
    });
    setTextCursorTarget(null);
    setActiveBlockId(null);
    setMessage(`${BLOCK_LABELS[type]}已插入到正文光标处。`);
  }

  function openMediaDialog(kind: MediaDialogKind) {
    setMediaDialog({
      caption: "",
      file: null,
      kind,
      text: kind === "link" ? "查看链接" : "",
      url: "",
    });
  }

  function closeMediaDialog() {
    if (!uploadingBlockId) {
      setMediaDialog(null);
    }
  }

  async function confirmMediaDialog() {
    if (!mediaDialog) return;
    const { caption, file, kind, text, url } = mediaDialog;

    if (kind === "link" && !url.trim()) {
      setMessage("请输入链接地址。");
      return;
    }
    if (kind !== "link" && !file && !url.trim()) {
      setMessage(`请选择${BLOCK_LABELS[kind]}文件，或填写直链。`);
      return;
    }

    setUploadingBlockId("media-dialog");
    setMessage("");
    try {
      const publicUrl = file
        ? kind === "image"
          ? await uploadAdminImage(file, "site/guide")
          : kind === "video"
            ? await uploadAdminVideo(file, "site/guide")
            : await uploadAdminAudio(file, "site/guide")
        : url.trim();
      insertBlockAtTextCursor(kind, {
        caption: caption.trim(),
        text: kind === "link" ? text.trim() : "",
        url: publicUrl,
      });
      setMediaDialog(null);
    } catch (error) {
      setMessage(`${BLOCK_LABELS[kind]}上传失败：${error instanceof Error ? error.message : "请稍后再试。"}`);
    } finally {
      setUploadingBlockId(null);
    }
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.blocks.length) {
      return;
    }

    const blocks = [...draft.blocks];
    [blocks[index], blocks[nextIndex]] = [blocks[nextIndex], blocks[index]];
    setDraft((current) => ({ ...current, blocks }));
    setMessage("");
  }

  function removeBlock(blockId: string) {
    setDraft((current) => {
      const blocks = current.blocks.filter((block) => block.id !== blockId);
      return {
        ...current,
        blocks: blocks.length ? blocks : [createGuideBlock()],
      };
    });
    setMessage("");
  }

  function handleTextKeyDown(
    block: GuideContentBlock,
    blockIndex: number,
    event: KeyboardEvent<HTMLDivElement>,
  ) {
    if (event.key !== "Backspace" && event.key !== "Delete") {
      return;
    }

    const selection = window.getSelection();
    if (!selection?.isCollapsed || !selection.anchorNode) {
      return;
    }

    const element = event.currentTarget;
    const text = element.innerText.replace(/\u00a0/g, " ");
    const cursorOffset = textOffsetInElement(element, selection.anchorNode, selection.anchorOffset);

    if (!text.trim()) {
      event.preventDefault();
      removeBlock(block.id);
      return;
    }

    if (event.key === "Backspace" && cursorOffset === 0) {
      const previousBlock = draft.blocks[blockIndex - 1];
      if (previousBlock && previousBlock.type !== "paragraph" && previousBlock.type !== "heading") {
        event.preventDefault();
        removeBlock(previousBlock.id);
      }
      return;
    }

    if (event.key === "Delete" && cursorOffset >= text.length) {
      const nextBlock = draft.blocks[blockIndex + 1];
      if (nextBlock && nextBlock.type !== "paragraph" && nextBlock.type !== "heading") {
        event.preventDefault();
        removeBlock(nextBlock.id);
      }
    }
  }

  function handleBlockKeyDown(block: GuideContentBlock, event: KeyboardEvent<HTMLElement>) {
    if ((event.key === "Backspace" || event.key === "Delete") && block.type !== "paragraph" && block.type !== "heading") {
      event.preventDefault();
      removeBlock(block.id);
    }
  }

  async function uploadImage(
    blockId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("请选择图片文件。");
      return;
    }

    setUploadingBlockId(blockId);
    setMessage("");

    try {
      const publicUrl = await uploadAdminImage(file, "site/guide");
      updateBlock(blockId, { url: publicUrl });
      setMessage("图片上传成功。");
    } catch (error) {
      setMessage(`图片上传失败：${error instanceof Error ? error.message : "请稍后再试。"}`);
    } finally {
      setUploadingBlockId(null);
    }
  }

  async function savePost(status: "draft" | "published") {
    const title = draft.title.trim();
    const excerpt = draft.excerpt.trim() || firstText(draft.blocks).slice(0, 140);

    if (!title) {
      setMessage("请先填写帖子标题。");
      return;
    }

    if (!draft.blocks.some((block) => block.text.trim() || block.url.trim())) {
      setMessage("请至少填写一个正文、链接、图片或视频区块。");
      return;
    }

    setIsSaving(true);
    setMessage("");
    const now = new Date().toISOString();
    const slug = isPaidPage
      ? getPaidPageContentSlug(projectKey ?? "")
      : draft.slug ?? `guide-${Date.now().toString(36)}`;
    const payload = {
      access_feature_key: null,
      cover_image_url: firstImage(draft.blocks),
      created_by: adminUserId,
      is_paid_only: false,
      meta_json: {
        author: draft.author.trim(),
        blocks: draft.blocks,
        excerpt,
        kind: "guide-post",
      },
      module: "site",
      published_at:
        status === "published" ? draft.publishedAt ?? now : draft.publishedAt,
      slug,
      status,
      summary: excerpt,
      template_key: "site_announcement_page",
      title,
      updated_at: now,
    };

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setMessage("管理员登录已失效，请重新登录。");
      setIsSaving(false);
      return;
    }

    const response = await fetch("/api/guide-posts", {
      body: JSON.stringify({
        post: { ...payload, id: draft.id },
        projectKey: isPaidPage ? projectKey : undefined,
        scope: isPaidPage ? "paid" : "guide",
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const responseBody = (await response.json().catch(() => null)) as {
      error?: string;
      post?: AdminGuidePostRow;
    } | null;

    if (!response.ok || !responseBody?.post) {
      setMessage(`保存失败：${responseBody?.error ?? "未返回帖子数据"}`);
      setIsSaving(false);
      return;
    }

    setMessage(status === "published" ? "帖子已发布到首页。" : "草稿已保存。");
    await loadPosts(responseBody.post.id);
    setIsSaving(false);
  }

  async function deletePost() {
    if (!draft.id) {
      return;
    }

    const confirmed = window.confirm(
      `确定删除帖子“${draft.title || "未命名帖子"}”吗？帖子及其评论会永久删除，无法恢复。`,
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    const deletedId = draft.id;
    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setMessage("管理员登录已失效，请重新登录。");
      setIsSaving(false);
      return;
    }

    const response = await fetch(`/api/guide-posts?id=${encodeURIComponent(deletedId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      method: "DELETE",
    });
    const responseBody = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage(`删除失败：${responseBody?.error ?? "请稍后再试。"}`);
      setIsSaving(false);
      return;
    }

    const remainingRows = rows.filter((row) => row.id !== deletedId);
    setRows(remainingRows);
    setDraft(
      remainingRows.length
        ? rowToDraft(remainingRows[0])
        : isPaidPage
          ? { ...createEmptyDraft(), title: paidPageTitle }
          : createEmptyDraft(),
    );
    setMessage("帖子已删除。");
    setIsSaving(false);
  }

  const selectedBlock = activeBlock();

  return (
    <section className="guide-admin">
      <header className="guide-admin-heading">
        <div>
          <span>{isPaidPage ? "PAID PAGE CONTENT · 收费页内容" : "HOME POSTS · 首页发帖"}</span>
          <h2>{isPaidPage ? `${paidPageTitle}前台内容` : "首页发帖后台"}</h2>
          <p>
            {isPaidPage
              ? "内容默认隐藏；打开前台显示后，用户会在收费页面的套餐下方看到这里的正文。"
              : "组合正文、链接、图片和视频区块，设置字体、字号与对齐方式后直接发布。"}
          </p>
        </div>
        {!isPaidPage ? (
          <button className="button secondary" onClick={startNewPost} type="button">
            ＋ 新建帖子
          </button>
        ) : null}
      </header>

      <div className="guide-admin-layout">
        {!isPaidPage ? (
          <aside className="guide-admin-posts">
          <header>
            <strong>帖子</strong>
            <span>{rows.length}</span>
          </header>
          {isLoading ? <p>正在读取帖子…</p> : null}
          {!isLoading && !rows.length ? <p>还没有首页帖子，可以先新建一篇。</p> : null}
          {rows.map((row) => (
            <button
              className={draft.id === row.id ? "active" : ""}
              key={row.id}
              onClick={() => {
                setDraft(rowToDraft(row));
                setMessage("");
              }}
              type="button"
            >
              <span>{row.status === "published" ? "已发布" : "草稿"}</span>
              <strong>{row.title}</strong>
              <small>{row.updated_at ? new Date(row.updated_at).toLocaleDateString("zh-CN") : ""}</small>
            </button>
          ))}
          </aside>
        ) : null}

        <div className="guide-admin-editor">
          <section className="guide-rich-editor">
            <div className="guide-rich-toolbar" aria-label="文章格式工具栏">
              <div className="guide-rich-toolbar-group">
                <button aria-label="撤销" disabled={!historyRef.current.length} onClick={undo} title="撤销" type="button">↶</button>
                <button aria-label="重做" disabled={!futureRef.current.length} onClick={redo} title="重做" type="button">↷</button>
                <button aria-label="清除格式" onClick={clearFormatting} title="清除格式" type="button">◇</button>
              </div>
              <div className="guide-rich-toolbar-group guide-rich-toolbar-selects">
                <select aria-label="字体" disabled={!selectedBlock} onChange={(event) => applyFontFamily(event.target.value as GuideContentBlock["fontFamily"])} value={selectedBlock?.fontFamily ?? "serif"}>
                  <option value="serif">宋体</option>
                  <option value="sans">黑体</option>
                  <option value="kaiti">楷体</option>
                  <option value="georgia">Georgia</option>
                </select>
                <select aria-label="字号" disabled={!selectedBlock} onChange={(event) => applyFontSize(Number(event.target.value))} value={selectedBlock?.fontSize ?? 18}>
                  {[14, 16, 17, 18, 20, 24, 28, 32, 36, 42].map((size) => <option key={size} value={size}>{size}px</option>)}
                </select>
              </div>
              <div className="guide-rich-toolbar-group">
                <button aria-pressed={Boolean(selectedBlock?.bold)} className={selectedBlock?.bold ? "active" : ""} onClick={() => toggleFormat("bold")} title="粗体" type="button"><strong>B</strong></button>
                <button aria-pressed={Boolean(selectedBlock?.italic)} className={selectedBlock?.italic ? "active" : ""} onClick={() => toggleFormat("italic")} title="斜体" type="button"><em>I</em></button>
                <button aria-pressed={Boolean(selectedBlock?.underline)} className={selectedBlock?.underline ? "active" : ""} onClick={() => toggleFormat("underline")} title="下划线" type="button"><u>U</u></button>
                <button aria-pressed={Boolean(selectedBlock?.strike)} className={selectedBlock?.strike ? "active" : ""} onClick={() => toggleFormat("strike")} title="删除线" type="button"><s>S</s></button>
                <label className="guide-color-tool" title="文字颜色"><span style={{ color: selectedBlock?.color || "#1f5b4d" }}>A</span><input aria-label="文字颜色" disabled={!selectedBlock} onChange={(event) => applyColor("foreColor", event.target.value)} type="color" value={selectedBlock?.color || "#1f5b4d"} /></label>
                <label className="guide-color-tool" title="背景高亮"><span style={{ backgroundColor: selectedBlock?.backgroundColor || "#fff3bf" }}>ab</span><input aria-label="背景高亮" disabled={!selectedBlock} onChange={(event) => applyColor("hiliteColor", event.target.value)} type="color" value={selectedBlock?.backgroundColor || "#fff3bf"} /></label>
              </div>
              <div className="guide-rich-toolbar-group guide-rich-align-group" aria-label="文字对齐">
                {(["left", "center", "right"] as const).map((align) => <button aria-label={`${align === "left" ? "左" : align === "center" ? "居中" : "右"}对齐`} aria-pressed={selectedBlock?.align === align} className={selectedBlock?.align === align ? "active" : ""} key={align} onClick={() => selectedBlock && updateBlock(selectedBlock.id, { align }, true)} title={`${align === "left" ? "左" : align === "center" ? "居中" : "右"}对齐`} type="button">{align === "center" ? "≣" : "≡"}</button>)}
              </div>
              <div className="guide-rich-toolbar-group guide-rich-insert-group">
                <button aria-label="添加小标题" onClick={() => addBlock("heading")} title="添加小标题" type="button">H</button>
                <button aria-label="插入链接" onClick={() => openMediaDialog("link")} title="插入链接" type="button">↗</button>
                <button aria-label="插入图片" onClick={() => openMediaDialog("image")} title="插入图片" type="button">▧</button>
                <button aria-label="插入视频" onClick={() => openMediaDialog("video")} title="插入视频" type="button">▶</button>
                <button aria-label="插入音频" onClick={() => openMediaDialog("audio")} title="插入音频" type="button">♫</button>
                <button aria-label="插入表情" onClick={insertEmoji} title="插入表情" type="button">☺</button>
              </div>
            </div>

            <div className="guide-editor-workspace">
              <div className="guide-editor-paper">
                {!isPaidPage ? (
                  <>
                    <label className="guide-editor-title-field">
                      <input aria-label="文章标题" maxLength={64} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="请在这里输入标题" value={draft.title} />
                      <span>{draft.title.length}/64</span>
                    </label>
                    <label className="guide-editor-author-field">
                      <input aria-label="文章作者" maxLength={8} onChange={(event) => setDraft((current) => ({ ...current, author: event.target.value }))} placeholder="请输入作者" value={draft.author} />
                      <span>{draft.author.length}/8</span>
                    </label>
                  </>
                ) : null}
                <div className="guide-editor-body">
                  {draft.blocks.map((block, index) => (
                    <article className={`guide-editor-block ${activeBlockId === block.id ? "active" : ""}`} key={block.id} onClick={() => setActiveBlockId(block.id)} onKeyDown={(event) => handleBlockKeyDown(block, event)} onMouseDown={(event) => { if (block.type !== "paragraph" && block.type !== "heading") event.currentTarget.focus(); }} tabIndex={block.type === "paragraph" || block.type === "heading" ? -1 : 0}>
                      {block.type === "paragraph" || block.type === "heading" ? (
                        <div
                          aria-label={`${BLOCK_LABELS[block.type]}内容`}
                          className={block.type === "heading" ? "guide-editor-heading-input" : "guide-editor-text-input"}
                          contentEditable
                          data-placeholder={block.type === "heading" ? "输入小标题" : index === 0 ? "从这里开始写正文" : "继续输入正文"}
                          onClick={(event) => rememberTextCursor(block.id, event.currentTarget)}
                          onFocus={(event) => rememberTextCursor(block.id, event.currentTarget)}
                          onInput={(event) => syncEditableBlock(block.id, event.currentTarget)}
                          onKeyDown={(event) => handleTextKeyDown(block, index, event)}
                          onKeyUp={(event) => rememberTextCursor(block.id, event.currentTarget)}
                          onMouseUp={(event) => rememberTextCursor(block.id, event.currentTarget)}
                          onSelect={(event) => rememberTextCursor(block.id, event.currentTarget)}
                          role="textbox"
                          spellCheck
                          style={editorBlockStyle(block)}
                          suppressContentEditableWarning
                          ref={(element) => {
                            editableRefs.current[block.id] = element;
                            if (element && element.innerHTML !== editorHtml(block)) {
                              element.innerHTML = editorHtml(block);
                            }
                          }}
                        />
                      ) : null}
                      {block.type === "link" && block.url ? <a className="guide-editor-link-preview" href={block.url} rel="noreferrer" target="_blank">{block.text || block.url} ↗</a> : null}
                      {block.type === "image" && block.url ? <ResizableImagePreview block={block} onResize={(width, height) => updateBlock(block.id, { height, width }, true)} /> : null}
                      {block.type === "video" && block.url ? <figure className="guide-editor-inline-media guide-editor-video-media"><video className="guide-editor-asset-preview" controls playsInline preload="metadata" src={block.url} />{block.caption ? <figcaption>{block.caption}</figcaption> : null}<a href={block.url} rel="noreferrer" target="_blank">在新窗口打开视频 ↗</a></figure> : null}
                      {block.type === "audio" && block.url ? <figure className="guide-editor-inline-media guide-editor-audio-media"><audio className="guide-editor-asset-preview" controls preload="metadata" src={block.url} />{block.caption ? <figcaption>{block.caption}</figcaption> : null}<a href={block.url} rel="noreferrer" target="_blank">打开音频 ↗</a></figure> : null}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {!isPaidPage ? <section className="guide-admin-card guide-admin-legacy-meta">
            <div className="guide-admin-field-grid">
              <label className="wide">
                <span>帖子标题</span>
                <input
                  maxLength={120}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="例如：资料下载或使用说明"
                  value={draft.title}
                />
              </label>
              <label className="wide">
                <span>列表摘要</span>
                <textarea
                  maxLength={240}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, excerpt: event.target.value }))
                  }
                  placeholder="用一两句话说明这篇帖子能解决什么问题"
                  rows={3}
                  value={draft.excerpt}
                />
              </label>
            </div>
          </section> : null}

          <section className="guide-admin-card guide-admin-legacy-blocks">
            <header className="guide-blocks-heading">
              <div>
                <span>CONTENT BLOCKS</span>
                <h3>正文区块</h3>
              </div>
              <small>每个区块都可以单独设置格式和顺序</small>
            </header>

            <div className="guide-block-editor-list">
              {draft.blocks.map((block, index) => (
                <article className="guide-block-editor" key={block.id}>
                  <header>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <select
                      aria-label={`第 ${index + 1} 个区块类型`}
                      onChange={(event) =>
                        changeBlockType(block.id, event.target.value as GuideBlockType)
                      }
                      value={block.type}
                    >
                      {Object.entries(BLOCK_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <div>
                      <button
                        aria-label="上移区块"
                        disabled={index === 0}
                        onClick={() => moveBlock(index, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label="下移区块"
                        disabled={index === draft.blocks.length - 1}
                        onClick={() => moveBlock(index, 1)}
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        aria-label="删除区块"
                        className="danger"
                        onClick={() => removeBlock(block.id)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </header>

                  <div className="guide-format-toolbar">
                    <label>
                      <span>字体</span>
                      <select
                        onChange={(event) =>
                          updateBlock(block.id, {
                            fontFamily: event.target.value as GuideContentBlock["fontFamily"],
                          })
                        }
                        value={block.fontFamily}
                      >
                        <option value="serif">宋体 / 衬线</option>
                        <option value="sans">黑体 / 无衬线</option>
                        <option value="kaiti">楷体</option>
                        <option value="georgia">Georgia</option>
                      </select>
                    </label>
                    <label>
                      <span>字号</span>
                      <select
                        onChange={(event) =>
                          updateBlock(block.id, { fontSize: Number(event.target.value) })
                        }
                        value={block.fontSize}
                      >
                        {[14, 16, 18, 20, 24, 28, 32, 36, 42].map((size) => (
                          <option key={size} value={size}>
                            {size}px
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="guide-align-controls" aria-label="文字对齐">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          aria-pressed={block.align === align}
                          className={block.align === align ? "active" : ""}
                          key={align}
                          onClick={() => updateBlock(block.id, { align })}
                          type="button"
                        >
                          {align === "left" ? "左" : align === "center" ? "中" : "右"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {block.type === "paragraph" || block.type === "heading" ? (
                    <>
                      <textarea
                        aria-label={`${BLOCK_LABELS[block.type]}内容`}
                        onChange={(event) => {
                          updateBlock(block.id, { text: event.target.value });
                          rememberTextCursor(block.id, event.currentTarget);
                        }}
                        onClick={(event) => rememberTextCursor(block.id, event.currentTarget)}
                        onFocus={(event) => rememberTextCursor(block.id, event.currentTarget)}
                        onKeyUp={(event) => rememberTextCursor(block.id, event.currentTarget)}
                        onSelect={(event) => rememberTextCursor(block.id, event.currentTarget)}
                        placeholder={block.type === "heading" ? "输入小标题" : "输入正文内容"}
                        rows={block.type === "heading" ? 2 : 5}
                        value={block.text}
                      />
                    </>
                  ) : null}

                  {block.type === "link" ? (
                    <div className="guide-admin-field-grid">
                      <label>
                        <span>链接文字</span>
                        <input
                          onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                          placeholder="查看详细说明"
                          value={block.text}
                        />
                      </label>
                      <label>
                        <span>链接地址</span>
                        <input
                          onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                          placeholder="https://..."
                          type="url"
                          value={block.url}
                        />
                      </label>
                    </div>
                  ) : null}

                  {block.type === "image" ? (
                    <div className="guide-admin-field-grid">
                      <label>
                        <span>图片地址</span>
                        <input
                          onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                          placeholder="https://..."
                          value={block.url}
                        />
                      </label>
                      <label>
                        <span>图片说明</span>
                        <input
                          onChange={(event) =>
                            updateBlock(block.id, { caption: event.target.value })
                          }
                          placeholder="可选"
                          value={block.caption}
                        />
                      </label>
                      <label className="guide-upload-control">
                        <span>或从电脑上传</span>
                        <input
                          accept="image/*"
                          disabled={uploadingBlockId === block.id}
                          onChange={(event) => void uploadImage(block.id, event)}
                          type="file"
                        />
                      </label>
                    </div>
                  ) : null}

                  {block.type === "video" ? (
                    <div className="guide-admin-field-grid">
                      <label>
                        <span>视频直链</span>
                        <input
                          onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                          placeholder="https://.../video.mp4"
                          type="url"
                          value={block.url}
                        />
                      </label>
                      <label>
                        <span>视频说明</span>
                        <input
                          onChange={(event) =>
                            updateBlock(block.id, { caption: event.target.value })
                          }
                          placeholder="可选"
                          value={block.caption}
                        />
                      </label>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="guide-add-blocks">
              <span>添加：</span>
              {Object.entries(BLOCK_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => addBlock(type as GuideBlockType)}
                  type="button"
                >
                  ＋ {label}
                </button>
              ))}
            </div>
          </section>

          <footer className="guide-admin-publish">
            <div>
              <strong>{draft.id ? `正在编辑：${draft.title || "未命名帖子"}` : "正在新建帖子"}</strong>
              <span>
                {draft.status === "published" ? "当前已发布" : "当前为草稿"}
                {message ? ` · ${message}` : ""}
              </span>
            </div>
            {isPaidPage ? (
              <label className="guide-paid-visibility-toggle">
                <input
                  checked={draft.status === "published"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.checked ? "published" : "draft",
                    }))
                  }
                  type="checkbox"
                />
                <span>前台显示内容</span>
              </label>
            ) : null}
            {draft.id ? (
              <button
                className="button danger guide-delete-post"
                disabled={isSaving}
                onClick={() => void deletePost()}
                type="button"
              >
                删除帖子
              </button>
            ) : null}
            {isPaidPage ? (
              <button
                className="button primary"
                disabled={isSaving}
                onClick={() => void savePost(draft.status === "published" ? "published" : "draft")}
                type="button"
              >
                {isSaving ? "保存中…" : "保存收费页内容"}
              </button>
            ) : (
              <>
                <button
                  className="button secondary"
                  disabled={isSaving}
                  onClick={() => void savePost("draft")}
                  type="button"
                >
                  保存草稿
                </button>
                <button
                  className="button primary"
                  disabled={isSaving}
                  onClick={() => void savePost("published")}
                  type="button"
                >
                  {isSaving ? "保存中…" : "发布到首页"}
                </button>
              </>
            )}
          </footer>
        </div>
      </div>
      {mediaDialog ? (
        <div className="guide-media-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMediaDialog(); }}>
          <section aria-labelledby="guide-media-dialog-title" aria-modal="true" className="guide-media-dialog" role="dialog">
            <header>
              <div>
                <span>INSERT · 插入内容</span>
                <h3 id="guide-media-dialog-title">插入{BLOCK_LABELS[mediaDialog.kind]}</h3>
              </div>
              <button aria-label="关闭插入对话框" onClick={closeMediaDialog} type="button">×</button>
            </header>
            {mediaDialog.kind === "link" ? (
              <label><span>链接地址</span><input autoFocus onChange={(event) => setMediaDialog((current) => current ? { ...current, url: event.target.value } : current)} placeholder="https://..." type="url" value={mediaDialog.url} /></label>
            ) : (
              <>
                <label><span>从本机选择文件</span><input accept={mediaDialog.kind === "image" ? "image/*" : mediaDialog.kind === "video" ? "video/*" : "audio/*"} autoFocus onChange={(event) => setMediaDialog((current) => current ? { ...current, file: event.target.files?.[0] ?? null } : current)} type="file" /></label>
                <label><span>或填写直链</span><input onChange={(event) => setMediaDialog((current) => current ? { ...current, url: event.target.value } : current)} placeholder="https://..." type="url" value={mediaDialog.url} /></label>
              </>
            )}
            {mediaDialog.kind === "link" ? <label><span>链接文字</span><input onChange={(event) => setMediaDialog((current) => current ? { ...current, text: event.target.value } : current)} placeholder="查看链接" value={mediaDialog.text} /></label> : null}
            {mediaDialog.kind !== "link" ? <label><span>说明（可选）</span><input onChange={(event) => setMediaDialog((current) => current ? { ...current, caption: event.target.value } : current)} placeholder="为插入内容添加说明" value={mediaDialog.caption} /></label> : null}
            <footer>
              <button className="button secondary" disabled={uploadingBlockId === "media-dialog"} onClick={closeMediaDialog} type="button">取消</button>
              <button className="button primary" disabled={uploadingBlockId === "media-dialog"} onClick={() => void confirmMediaDialog()} type="button">{uploadingBlockId === "media-dialog" ? "处理中…" : "确定插入"}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
