function cleanRawReadingLine(value: string) {
  return value.replace(/[|]+/g, " ").replace(/\s+/g, " ").trim();
}

function joinRawReadingLines(lines: string[]) {
  return lines.reduce((paragraph, line) => {
    if (!paragraph) return line;
    if (/[A-Za-z]-$/.test(paragraph) && /^[a-z]/.test(line)) {
      return `${paragraph.slice(0, -1)}${line}`;
    }
    return `${paragraph} ${line}`;
  }, "");
}

function isRawReadingInstructionLine(value: string) {
  return (
    /^READING\s+PASSAGE\s+\d/i.test(value) ||
    /^R\s*E\s*A\s*D\s*I\s*N\s*G$/i.test(value) ||
    /^Reading$/i.test(value) ||
    /^Test\s+\d$/i.test(value) ||
    /^You should spend about 20 minutes/i.test(value) ||
    /^should spend about 20 minutes/i.test(value) ||
    /^Reading Passage \d below\.?$/i.test(value) ||
    /^Passage\s+\d\s+(?:below|on\s+(?:the\s+)?(?:following|fo\s*llowing)\s+pages?|on\s+pages?\s+\d{1,3})/i.test(value) ||
    /^below\.[\s·]*$/i.test(value) ||
    /^on the following pages?\.?$/i.test(value) ||
    /^=== (?:PDF|OCR) PAGE \d+ ===$/i.test(value)
  );
}

export function getRawReadingParagraphs(value: string, title: string, subtitle?: string) {
  const titleLine = cleanRawReadingLine(title).toLowerCase();
  const subtitleLine = cleanRawReadingLine(subtitle ?? "").toLowerCase();
  const paragraphs: string[] = [];
  let current: string[] = [];
  let skippedTitle = false;
  let skippedSubtitle = false;

  function flush() {
    if (current.length > 0) {
      paragraphs.push(joinRawReadingLines(current));
      current = [];
    }
  }

  for (const rawLine of value.split("\n")) {
    const line = cleanRawReadingLine(rawLine);
    if (!line) {
      flush();
      continue;
    }
    if (isRawReadingInstructionLine(line)) continue;
    if (!skippedTitle && titleLine && line.toLowerCase() === titleLine) {
      skippedTitle = true;
      continue;
    }
    if (!skippedSubtitle && subtitleLine && line.toLowerCase() === subtitleLine) {
      skippedSubtitle = true;
      continue;
    }
    if (/^[A-Z]$/.test(line) && current.length > 0) flush();
    if (/^\s{2,4}\S/.test(rawLine) && current.length > 0 && /^[A-Z'"]/.test(line)) flush();
    current.push(line);
  }

  flush();
  return paragraphs.length > 0 ? paragraphs : [value];
}
