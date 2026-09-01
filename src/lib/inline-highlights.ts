export type PersistedInlineHighlight = { id: string; occurrence: number; text: string };

export function inlineHighlightKey(sourceId: string) {
  return `ielts-platform.inlineHighlights:${sourceId}`;
}

function textOffset(root: HTMLElement, target: Node, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node === target) return total + offset;
    total += node.textContent?.length ?? 0;
  }
  return total;
}

function positionAt(root: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    if (offset <= total + length) return { node, offset: offset - total };
    total += length;
  }
  return null;
}

function rangeFor(root: HTMLElement, text: string, occurrence: number) {
  const full = root.textContent ?? "";
  let start = -1;
  let from = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    start = full.indexOf(text, from);
    if (start < 0) return null;
    from = start + text.length;
  }
  const begin = positionAt(root, start);
  const end = positionAt(root, start + text.length);
  if (!begin || !end) return null;
  const range = document.createRange();
  range.setStart(begin.node, begin.offset);
  range.setEnd(end.node, end.offset);
  return range;
}

export function restoreInlineHighlights(root: HTMLElement, key: string) {
  let saved: PersistedInlineHighlight[] = [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    saved = Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.text === "string" && typeof item.occurrence === "number") : [];
  } catch { return; }
  for (const item of saved) {
    const range = rangeFor(root, item.text, item.occurrence);
    if (!range || range.collapsed) continue;
    const marker = document.createElement("mark");
    marker.className = "inline-user-highlight";
    marker.dataset.highlightId = item.id;
    try { range.surroundContents(marker); } catch { const contents = range.extractContents(); marker.appendChild(contents); range.insertNode(marker); }
  }
}

export function persistInlineHighlight(root: HTMLElement, range: Range, key: string) {
  const text = range.toString();
  const start = textOffset(root, range.startContainer, range.startOffset);
  const occurrence = (root.textContent?.slice(0, start).split(text).length ?? 1) - 1;
  const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, occurrence, text };
  try {
    const current = JSON.parse(window.localStorage.getItem(key) || "[]");
    window.localStorage.setItem(key, JSON.stringify([...(Array.isArray(current) ? current : []), item]));
  } catch { /* best effort */ }
  return item.id;
}

export function clearPersistedInlineHighlights(root: HTMLElement, key: string) {
  root.querySelectorAll("mark.inline-user-highlight").forEach((highlight) => {
    const parent = highlight.parentNode;
    if (!parent) return;
    while (highlight.firstChild) parent.insertBefore(highlight.firstChild, highlight);
    parent.removeChild(highlight);
    parent.normalize();
  });
  try { window.localStorage.removeItem(key); } catch { /* best effort */ }
}
