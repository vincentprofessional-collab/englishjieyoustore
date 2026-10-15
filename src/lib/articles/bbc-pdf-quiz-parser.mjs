// Shared with the original BBC PDF catalog importer. No filesystem or network access.

function normalizeSpace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeAnswer(value) {
  return normalizeSpace(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[.。]+$/g, "")
    .toLowerCase();
}

function cleanExtractedAnswer(value) {
  return normalizeSpace(value)
    .replace(/\s+\d+\.\s*$/g, "")
    .replace(/\s+(?:Take Away English|Page \d+ of \d+|词汇表)[\s\S]*$/i, "")
    .trim();
}

function questionTokens(value) {
  return [...value.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?/g)].map((match) => match[0].toLowerCase().replace(/’/g, "'"));
}

function findTokenSequence(value, expectedTokens, startAt = 0) {
  if (!expectedTokens.length) return { start: value.length, end: value.length };
  const tokens = [...value.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?/g)];
  for (let index = 0; index <= tokens.length - expectedTokens.length; index += 1) {
    if (tokens[index].index < startAt) continue;
    const matches = expectedTokens.every((expected, offset) => {
      const actual = tokens[index + offset][0].toLowerCase().replace(/’/g, "'");
      return actual === expected;
    });
    if (matches) {
      const start = tokens[index].index;
      const last = tokens[index + expectedTokens.length - 1];
      return { start, end: last.index + last[0].length };
    }
  }
  return null;
}

function extractPlainAnswer(question, answerLines) {
  const raw = normalizeSpace(answerLines.map((line) => line.full).join(" ")).replace(/^\s*\d{1,2}\.\s*/, "");
  if (question.options?.length) {
    const explicitLetter = raw.match(/^([a-z])[.)](?:\s|$)/i);
    if (explicitLetter) return `${explicitLetter[1]}.`;
  }
  const blankMatch = question.prompt.match(/_{2,}/);

  if (blankMatch) {
    const before = question.prompt.slice(0, blankMatch.index);
    const after = question.prompt.slice((blankMatch.index ?? 0) + blankMatch[0].length);
    const beforeMatch = findTokenSequence(raw, questionTokens(before));
    const afterMatch = findTokenSequence(raw, questionTokens(after), beforeMatch?.end ?? 0);
    if (beforeMatch) {
      const answer = raw.slice(beforeMatch.end, afterMatch?.start ?? raw.length).replace(/^[?？！。.:：,，\s"']+|[?？！。.:：,，\s"']+$/g, "");
      if (answer) return answer;
    }
  }

  const questionMatch = findTokenSequence(raw, questionTokens(question.prompt));
  if (!questionMatch) return "";
  return raw.slice(questionMatch.end).replace(/^[?？！。.:：,，\s"']+/, "").trim();
}


function isInstructionLine(value) {
  return /(?:阅读(?:短文|课文)|在不参考课文|将标题和段落配对|根据文章内容|用方框中的单词|答案见词汇表|从每个表格|选择(?:一个)?意思(?:恰当)?|单词或词组|填入句子|without referring|choose the correct)/i.test(value);
}

function parseNumberedLine(value) {
  const match = value.match(/^\s*(\d{1,2})\s*[.)．。]\s*(.*)$/);
  return match ? { number: Number(match[1]), text: match[2].trim() } : null;
}

function findQuestionSequences(lines) {
  const markers = lines.map((line, index) => ({ ...parseNumberedLine(line), index }))
    .filter((marker) => marker.number != null && marker.text && !isInstructionLine(marker.text));
  const sequences = [];
  let sequence = [];
  for (const marker of markers) {
    if (marker.number === 1) {
      if (sequence.length) sequences.push(sequence);
      sequence = [marker];
    } else if (sequence.length && marker.number === sequence.at(-1).number + 1) sequence.push(marker);
  }
  if (sequence.length) sequences.push(sequence);
  return sequences;
}

function splitOptions(line) {
  return line
    .trim()
    .split(/\s{2,}/)
    .map((option) => option.trim())
    .filter(Boolean);
}

function cleanOptionText(value) {
  return value.trim().replace(/^insomia$/i, "insomnia");
}

function parseLetterOptionLine(value) {
  const match = value.match(/^\s*([a-z])\s*[.)]\s*(.+?)\s*$/i);
  return match ? { letter: match[1].toLowerCase(), text: match[2].trim() } : null;
}

function readLetterOptions(lines) {
  const options = [];
  let last = -1;
  for (const line of lines) {
    const option = parseLetterOptionLine(line);
    if (option) {
      last = option.letter.charCodeAt(0) - 97;
      options[last] = option.text;
    } else if (last >= 0 && line.trim() && !isInstructionLine(line) && !/Take Away English|Page \d+ of \d+|^(?:Quiz|Exercise|测验|练习|词汇表)/i.test(line.trim())) {
      options[last] = normalizeSpace(`${options[last]} ${line.trim()}`);
    }
  }
  return Array.from({ length: options.length }, (_, index) => options[index] ?? "");
}

function cleanExtractedPrompt(value) {
  return normalizeSpace(value)
    .replace(/\s+(?:Take Away English|Page \d+ of \d+|答案见词汇表)[\s\S]*$/i, "")
    .trim();
}

function parseQuestionGroup(lines, sequence, isExercise, groupEnd = lines.length) {
  return sequence.map((marker, index) => {
    const end = sequence[index + 1]?.index ?? groupEnd;
    const block = lines.slice(marker.index, end);
    const first = parseNumberedLine(block[0]);
    const contentLines = [first?.text ?? block[0], ...block.slice(1)];

    if (!isExercise) {
      const optionIndex = contentLines.findIndex((line, lineIndex) => lineIndex > 0 && parseLetterOptionLine(line));
      const instructionIndex = contentLines.findIndex(
        (line, lineIndex) => lineIndex > 0 && isInstructionLine(line),
      );
      const firstOptionIndex = optionIndex >= 0 ? optionIndex : contentLines.length;
      const promptEndIndex = instructionIndex >= 0
        ? Math.min(instructionIndex, firstOptionIndex)
        : firstOptionIndex;
      const options = readLetterOptions(contentLines.slice(optionIndex >= 0 ? optionIndex : contentLines.length));

      return {
        number: marker.number,
        ...(options.length ? { options } : {}),
        prompt: cleanExtractedPrompt(
          contentLines.slice(0, promptEndIndex).join(" "),
        ),
      };
    }

    const blankIndex = contentLines.findIndex((line, lineIndex) => lineIndex > 0 && !line.trim());
    const optionAfterBlankIndex = blankIndex >= 0
      ? contentLines.findIndex((line, lineIndex) => lineIndex > blankIndex && !/Take Away English|Page \d+ of \d+/i.test(line) && splitOptions(line).length >= 2)
      : -1;
    const optionIndex = optionAfterBlankIndex >= 0
      ? optionAfterBlankIndex
      : contentLines.findIndex((line) => !/Take Away English|Page \d+ of \d+/i.test(line) && splitOptions(line).length >= 3);
    const options = [];
    if (optionIndex >= 0) {
      for (const line of contentLines.slice(optionIndex)) {
        if (/Take Away English|Page \d+ of \d+/i.test(line)) break;
        const cells = splitOptions(line);
        if (cells.length >= 2) {
          if (options.length >= 3 && cells[0].length <= 4 && /^[a-z]+$/i.test(cells[0]) && options.at(-1).length <= 6) {
            options[options.length - 1] += cells.shift();
          }
          options.push(...cells);
        }
        else if (!line.trim()) break;
      }
    }
    const promptLines = optionIndex >= 0 ? contentLines.slice(0, optionIndex) : contentLines;

    return {
      number: marker.number,
      options,
      prompt: cleanExtractedPrompt(promptLines.join(" ")),
    };
  });
}

function parseMatchingSection(lines) {
  const headingIndex = lines.findIndex((line) => /将标题和段落配对|match(?:ing)?\s+(?:the\s+)?(?:headings?|paragraphs?)/i.test(line));
  const paragraphLookupHeadingIndex = lines.findIndex((line) => /根据文章内容选出正确的段落/i.test(line));
  const paragraphLookupIndex = lines.findIndex((line, index) => index >= paragraphLookupHeadingIndex && /which paragraph contains/i.test(line));
  if (headingIndex < 0 && paragraphLookupIndex < 0) return [];
  if (headingIndex < 0) {
    const endIndex = lines.findIndex((line, index) => index > paragraphLookupIndex && /^(?:二[、.]|2\s*[.)．。])/.test(line.trim()));
    const prompt = cleanExtractedPrompt(lines.slice(paragraphLookupIndex, endIndex >= 0 ? endIndex : paragraphLookupIndex + 1).join(" "));
    return prompt ? [{ type: "matching", number: 1, options: Array.from({ length: 5 }, (_, index) => `Paragraph ${index + 1}`), prompt }] : [];
  }
  const endIndex = lines.findIndex(
    (line, index) => index > headingIndex && /^(?:二[、.]|2\s*[.)．。])/.test(line.trim()),
  );
  const sectionLines = lines.slice(headingIndex + 1, endIndex >= 0 ? endIndex : lines.length);
  const paragraphLines = sectionLines
    .map((line, index) => ({ match: line.match(/^\s*Paragraph\s+(\d+)\s+_{2,}\s*$/i), index }))
    .filter((item) => item.match);
  if (!paragraphLines.length) return [];

  const optionStart = paragraphLines.at(-1).index + 1;
  const options = readLetterOptions(sectionLines.slice(optionStart));
  if (!options.length) return [];

  return paragraphLines.map(({ match }) => ({
    type: "matching",
    number: Number(match[1]),
    options,
    prompt: `Paragraph ${match[1]}`,
  }));
}

function summaryChoiceSection(lines) {
  const start = lines.findIndex((line) => /为本文选择总结句|choose (?:the |a )?(?:best )?summary sentence/i.test(line));
  if (start < 0) return [];
  const next = lines.findIndex((line, index) => index > start && /^(?:[一二三四五六][、.]|\d+[.．)]|Quiz\b|Exercise\b)/i.test(line.trim()));
  return lines.slice(start, next < 0 ? lines.length : next);
}

function parseSummaryChoice(lines) {
  const section = summaryChoiceSection(lines);
  if (!section.length) return [];
  const options = readLetterOptions(section.slice(1));
  return options.length ? [{ number: 1, prompt: section[0].replace(/^[一二三四五六][、.]\s*/, "").trim(), options }] : [];
}

function extractSummaryChoiceAnswers(lines) {
  const section = summaryChoiceSection(lines.map((line) => line.full));
  const option = section.slice(1).map(parseLetterOptionLine).find(Boolean);
  return option ? [{ number: 1, answer: `${option.letter}.` }] : [];
}

function findSummaryHeadingIndex(lines) {
  return lines.findIndex((line) => {
    const text = typeof line === "string" ? line : line.full;
    return /^(?:三[、.]|3\s*[.)．。])\s*用方框中的单词/i.test(text.trim());
  });
}

function parseSummaryExercise(lines) {
  const headingIndex = findSummaryHeadingIndex(lines);
  if (headingIndex < 0) return [];

  const endIndex = lines.findIndex(
    (line, index) => index > headingIndex && /答案见词汇表后|(?:Glossary|词汇表)/i.test(line),
  );
  const sectionLines = lines.slice(headingIndex + 1, endIndex >= 0 ? endIndex : lines.length);
  const lastBlankLineIndex = sectionLines.reduce(
    (lastIndex, line, index) => /\b\d+\)\s*_{2,}/.test(line) ? index : lastIndex,
    -1,
  );
  if (lastBlankLineIndex < 0) return [];

  const optionBreakIndex = sectionLines.findIndex(
    (line, index) => index > lastBlankLineIndex && !line.trim(),
  );
  const promptLines = sectionLines.slice(0, optionBreakIndex >= 0 ? optionBreakIndex : lastBlankLineIndex + 1);
  const promptText = normalizeSpace(promptLines.join(" "));
  const blankMatches = [...promptText.matchAll(/\b\d+\)\s*_{2,}/g)];
  const optionLines = optionBreakIndex >= 0 ? sectionLines.slice(optionBreakIndex + 1) : [];
  const options = optionLines
    .flatMap((line) => /Take Away English|Page \d+ of \d+/i.test(line) ? [] : splitOptions(line))
    .map(cleanOptionText)
    .filter((option) => option && !/答案见词汇表|Take Away English|Page \d+ of \d+/i.test(option));

  return blankMatches.map((blank, index) => {
    const blankStart = blank.index ?? 0;
    const segmentStart = index === 0
      ? 0
      : (blankMatches[index - 1].index ?? 0) + blankMatches[index - 1][0].length;
    const segmentEnd = blankMatches[index + 1]?.index ?? promptText.length;
    const prompt = promptText
      .slice(segmentStart, segmentEnd)
      .replace(blank[0], "________")
      .trim();

    return {
      isSummary: true,
      number: index + 1,
      options,
      prompt,
    };
  });
}

function extractSummaryAnswers(lines, options, count = 5) {
  if (!options.length) return [];

  const joinedText = normalizeSpace(lines.map((line) => line.full).join(" "));
  const headingStart = joinedText.search(/(?:用方框中的单词|When things don't go your way|30,?\s*40\s*and\s*50)/i);
  const optionStart = Math.min(
    ...options
      .map((option) => joinedText.toLowerCase().indexOf(option.toLowerCase()))
      .filter((index) => index >= 0),
    Number.POSITIVE_INFINITY,
  );
  const answerText = joinedText
    .slice(headingStart >= 0 ? headingStart : Number.isFinite(optionStart) ? optionStart : 0)
    .replace(/\s+(?:Take Away English|Page \d+ of \d+|词汇表)[\s\S]*$/i, "")
    .trim();
  if (!answerText) return [];
  const normalizedAnswerText = answerText.toLowerCase();
  let cursor = 0;

  return Array.from({ length: count }).map((_, index) => {
    const matches = options
      .map((option) => ({ option, index: normalizedAnswerText.indexOf(option.toLowerCase(), cursor) }))
      .filter((match) => match.index >= cursor)
      .sort((left, right) => left.index - right.index);
    const match = matches[0];

    if (!match) {
      return { number: index + 1, answer: "" };
    }

    cursor = match.index + match.option.length;
    return { number: index + 1, answer: match.option };
  });
}

function extractMatchingAnswers(lines, questions) {
  if (!questions.length) return [];
  return questions.map((question) => {
    const answerLine = lines.find((line) => new RegExp(`^Paragraph\\s+${question.number}\\s+`, "i").test(line.full));
    const answer = answerLine?.full.match(new RegExp(`^Paragraph\\s+${question.number}\\s+([a-z])\\s*[.)]`, "i"));
    const directParagraph = (answerLine ?? lines.find((line) => /^Paragraph\s+\d+\s*[.)]/i.test(line.full)))?.full.match(/^Paragraph\s+(\d+)\s*[.)]/i);
    const letter = answer?.[1]?.toLowerCase();
    const optionIndex = letter ? letter.charCodeAt(0) - 97 : -1;
    return {
      number: question.number,
      answer: optionIndex >= 0 ? question.options[optionIndex] ?? "" : directParagraph ? `Paragraph ${directParagraph[1]}` : "",
    };
  });
}

function resolveChoiceAnswer(question, extractedAnswer) {
  if (!question.options?.length || !extractedAnswer) return extractedAnswer;
  const letter = extractedAnswer.match(/^\s*([a-z])(?:[.)]\s*|\s*$)/i)?.[1]?.toLowerCase();
  if (letter) {
    const option = question.options[letter.charCodeAt(0) - 97];
    if (option) return option;
  }
  const normalizedExtracted = normalizeAnswer(extractedAnswer);
  return question.options.find((option) => normalizedExtracted === normalizeAnswer(option)) ?? extractedAnswer;
}


function extractAnswerForQuestion(question, answerLines) {
  const full = normalizeSpace(answerLines.map((line) => line.full).join(" ")).replace(/^\s*\d{1,2}\.\s*/, "");
  const explicitLetter = question?.options?.length ? full.match(/^([a-z])[.)](?:\s|$)/i) : null;
  return cleanExtractedAnswer(explicitLetter ? `${explicitLetter[1]}.` :
    normalizeSpace(answerLines.map((line) => line.bold).filter(Boolean).join(" ")) ||
    (question ? extractPlainAnswer(question, answerLines) : ""));
}

function parseAnswerGroup(lines, headingPattern, stopPattern, questions = []) {
  const headingIndex = lines.findIndex(
    (line) => headingPattern.test(line.full) && /^(?:Qui\s*z|Exer\s*cise|Quiz|Exercise|测验|练习|小测验)(?:\s|$)/i.test(line.full),
  );
  if (headingIndex < 0) return [];
  const stopIndex = stopPattern ? lines.findIndex((line, index) => index > headingIndex && stopPattern.test(line.full)) : -1;
  const footerIndex = lines.findIndex((line, index) => index > headingIndex && /Take Away English|Page \d+ of \d+/i.test(line.full));
  const glossaryIndex = lines.findIndex((line, index) => index > headingIndex && /(?:Glossary|词汇表)/i.test(line.full));
  const endIndex = [stopIndex, footerIndex, glossaryIndex, lines.length].filter((index) => index >= 0).sort((left, right) => left - right)[0];
  const groupLines = lines.slice(headingIndex + 1, endIndex);
  const markers = groupLines
    .map((line, index) => ({ ...parseNumberedLine(line.full), index }))
    .filter((marker) => marker.number != null && marker.text && !isInstructionLine(marker.text));

  return markers.map((marker, index) => {
    const end = markers[index + 1]?.index ?? groupLines.length;
    const question = questions.find((item) => item.number === marker.number);
    const answerLines = groupLines.slice(marker.index, end);
    return {
      number: marker.number,
      answer: extractAnswerForQuestion(question, answerLines),
    };
  });
}

function parseAnswerGroupsWithoutHeadings(lines, questionGroups = []) {
  const markers = lines
    .map((line, index) => ({ ...parseNumberedLine(line.full), index }))
    .filter((marker) => marker.number != null && marker.text && !isInstructionLine(marker.text));
  const groups = [];
  let currentGroup = [];
  for (const marker of markers) {
    if (marker.number === 1 && currentGroup.length) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(marker);
  }
  if (currentGroup.length) groups.push(currentGroup);
  const footerIndex = lines.findIndex((line) => /Take Away English|Page \d+ of \d+/i.test(line.full));
  const glossaryIndex = lines.findIndex((line) => /(?:Glossary|词汇表)/i.test(line.full));

  return groups.slice(0, 2).map((sequence, sequenceIndex) => {
    const nextSequenceStart = groups[sequenceIndex + 1]?.[0]?.index ?? lines.length;
    const sectionIndex = lines.findIndex(
      (line, index) => index > (sequence.at(-1)?.index ?? -1) && index < nextSequenceStart && isInstructionLine(line.full),
    );
    const endIndex = [nextSequenceStart, sectionIndex >= 0 ? sectionIndex : lines.length, footerIndex >= 0 ? footerIndex : lines.length, glossaryIndex >= 0 ? glossaryIndex : lines.length]
      .sort((left, right) => left - right)[0];
    return sequence.map((marker, index) => {
      const end = sequence[index + 1]?.index ?? endIndex;
      const question = questionGroups[sequenceIndex]?.find((item) => item.number === marker.number);
      const answerLines = lines.slice(marker.index, end);
      return {
        number: marker.number,
        answer: extractAnswerForQuestion(question, answerLines),
      };
    });
  });
}


export { normalizeSpace, normalizeAnswer, parseMatchingSection, parseSummaryChoice, extractSummaryChoiceAnswers, findQuestionSequences, parseQuestionGroup, parseSummaryExercise, findSummaryHeadingIndex, parseAnswerGroupsWithoutHeadings, parseAnswerGroup, extractSummaryAnswers, extractMatchingAnswers, resolveChoiceAnswer };
