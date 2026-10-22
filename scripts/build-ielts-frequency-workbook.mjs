export function populateFrequencyWorkbook(workbook, data, manifest) {
  const main = workbook.worksheets.add("词频");
  const removed = workbook.worksheets.add("删除记录");
  const method = workbook.worksheets.add("统计口径");
  const color = "#284D3E";
  function format(sheet, lastColumn, lastRow, headerRow = 5) {
    sheet.showGridLines = false;
    const range = sheet.getRange(`A2:${lastColumn}${lastRow}`);
    range.format.font = { name: "Arial", size: 10, color: "#253B32" };
    range.format.rowHeight = 20;
    range.format.verticalAlignment = "center";
    sheet.getRange("A2").format.font = { name: "Arial", size: 15, bold: true, color };
    const header = sheet.getRange(`A${headerRow}:${lastColumn}${headerRow}`);
    header.format.fill = color;
    header.format.font = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
    header.format.rowHeight = 27;
    header.format.horizontalAlignment = "center";
    sheet.freezePanes.freezeRows(headerRow);
    sheet.freezePanes.freezeColumns(2);
    return range;
  }
  const finalRow = data.rows.length + 5;
  main.getRange("A2").values = [["雅思听力与阅读词频"]];
  main.getRange("A3").values = [["剑桥1–21，84套听力与84套阅读，按归并后的总词频降序"]];
  main.getRange("A5:G5").values = [["序号", "词元", "总词频", "听力词频", "阅读词频", "出现册数", "已归并词形与次数"]];
  main.getRange(`A6:G${finalRow}`).values = data.rows.map((r, i) => [i + 1, r.lemma, null, r.listening, r.reading, r.bookCount, r.forms]);
  main.getRange(`C6:C${finalRow}`).formulas = data.rows.map((r, i) => [`=SUM(D${i + 6}:E${i + 6})`]);
  format(main, "G", finalRow);
  main.tabColor = color;
  main.getRange(`A6:A${finalRow}`).setNumberFormat("0");
  main.getRange(`C6:F${finalRow}`).setNumberFormat("#,##0");
  main.getRange(`A5:A${finalRow}`).format.columnWidth = 8;
  main.getRange(`B5:B${finalRow}`).format.columnWidth = 24;
  main.getRange(`C5:F${finalRow}`).format.columnWidth = 13;
  main.getRange(`G5:G${finalRow}`).format.columnWidth = 80;
  main.getRange(`G6:G${finalRow}`).format.wrapText = true;
  main.getRange("G6:G30").format.autofitRows();
  data.rows.forEach((row, index) => {
    if (row.forms.length > 70) main.getRange(`A${index + 6}:G${index + 6}`).format.rowHeight = 20 * Math.ceil(row.forms.length / 70);
  });
  main.tables.add(`A5:G${finalRow}`, true, "IeltsFrequency");
  main.getRange(`G6:G${finalRow}`).format.wrapText = true;
  main.getRange("G6:G30").format.autofitRows();

  const removedEnd = data.deleted.length + 5;
  removed.getRange("A2").values = [["删除记录"]];
  removed.getRange("A3").values = [["这些出现次数未计入词频；同形普通词按所在语境保留。"]];
  removed.getRange("A5:D5").values = [["原词形", "删除原因", "删除次数", "来源示例"]];
  removed.getRange(`A6:D${removedEnd}`).values = data.deleted.map((r) => [r.word, r.reason, r.count, r.sample]);
  format(removed, "D", removedEnd);
  removed.getRange(`A5:A${removedEnd}`).format.columnWidth = 25;
  removed.getRange(`B5:B${removedEnd}`).format.columnWidth = 31;
  removed.getRange(`C5:C${removedEnd}`).format.columnWidth = 15;
  removed.getRange(`D5:D${removedEnd}`).format.columnWidth = 42;
  removed.getRange(`C6:C${removedEnd}`).setNumberFormat("#,##0");
  removed.tables.add(`A5:D${removedEnd}`, true, "IeltsRemovedForms");

  method.getRange("A2").values = [["统计口径与来源"]];
  const rules = [
    ["范围", "剑桥1–21的84套听力题干及对应音频原文、84套阅读文章与题干；不统计答案、解析、写作、口语和前言。"],
    ["归并", "根据语境词性归并复数、三单、动名词、过去式和过去分词；moral与morals统一为moral。"],
    ["删除", "排除可识别专名、缩写、单位、残片、比较级、最高级，以及公众号、店铺、推广和水印等无关文字。"],
    ["同形词", "区分IT与it、US与us；普通代词和助动词保留，专名在对应语境排除。"],
    ["扫描件", "扫描本使用本机OCR与英文词典过滤；原始扫描中的未识别词列入删除记录，可按来源回查。"],
    ["有效词元", data.counts.lemmas], ["有效出现次数", data.counts.tokens],
    ["听力出现次数", data.counts.listeningTokens], ["阅读出现次数", data.counts.readingTokens],
    ["删除出现次数", data.counts.deletedTokens],
  ];
  method.getRange("A5:B5").values = [["项目", "口径或数值"]];
  method.getRange("A6:B15").values = rules;
  method.getRange("A18:F18").values = [["册号", "PDF来源", "原PDF页数", "听力语料页数", "阅读语料页数", "原PDF SHA256"]];
  method.getRange("A19:F39").values = manifest.books.map((book) => {
    const skillPages = (skill) => new Set(data.sources.filter((s) => s.book === book.book && s.skill === skill).flatMap((s) => s.pages)).size;
    return [`CI${book.book}`, book.source.split("/").pop(), book.pages, skillPages("listening"), skillPages("reading"), book.sha256];
  });
  format(method, "F", 39);
  method.getRange("A6:A39").format.columnWidth = 19;
  method.getRange("B6:B39").format.columnWidth = 65;
  method.getRange("C6:E39").format.columnWidth = 18;
  method.getRange("F6:F39").format.columnWidth = 68;
  method.getRange("B6:B10").format.wrapText = true;
  method.getRange("A6:B10").format.rowHeight = 42;
  method.getRange("A18:F18").format.fill = color;
  method.getRange("A18:F18").format.font = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
  method.getRange("A18:F18").format.horizontalAlignment = "center";
  method.getRange("A18:F18").format.rowHeight = 28;
  method.getRange("C19:E39").setNumberFormat("0");
  method.freezePanes.unfreeze();
  workbook.recalculate();
  return { mainRows: data.rows.length, removedRows: data.deleted.length, sheets: [main.name, removed.name, method.name] };
}
