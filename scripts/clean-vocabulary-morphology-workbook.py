#!/usr/bin/env python3
"""Write a formatting-preserving copy with GCIDE and non-morphology cells removed."""

import argparse
import importlib.util
import posixpath
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
IMPORTER_PATH = ROOT / "scripts" / "import-latest-vocabulary-sheet.py"
spec = importlib.util.spec_from_file_location("vocabulary_importer", IMPORTER_PATH)
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)

ROW_PATTERN = re.compile(rb"<row\b[^>]*\br=\"(\d+)\"[^>]*>.*?</row>", re.S)
CELL_PATTERN = re.compile(rb"<c\b([^>]*)>(.*?)</c>|<c\b([^>]*)/>", re.S)
CELL_REF_PATTERN = re.compile(rb"\br=\"([A-Z]+)(\d+)\"")
CELL_TYPE_PATTERN = re.compile(rb"\s+t=\"[^\"]*\"")
XML_ESCAPE = {"&": "&amp;", "<": "&lt;", ">": "&gt;"}


def workbook_sheet_path(archive, title):
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships", "rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
    workbook_xml = ElementTree.fromstring(archive.read("xl/workbook.xml"))
    rel_id = next(sheet.attrib[f"{{{ns['r']}}}id"] for sheet in workbook_xml.findall("m:sheets/m:sheet", ns) if sheet.attrib.get("name") == title)
    rels_xml = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    target = next(rel.attrib["Target"] for rel in rels_xml.findall("rel:Relationship", ns) if rel.attrib.get("Id") == rel_id)
    target = target.lstrip("/")
    return posixpath.normpath(target if target.startswith("xl/") else posixpath.join("xl", target))


def esc(value):
    return "".join(XML_ESCAPE.get(char, char) for char in value).encode("utf-8")


def replace_cell(match, replacements):
    attrs = match.group(1) if match.group(1) is not None else match.group(3)
    ref_match = CELL_REF_PATTERN.search(attrs)
    if not ref_match:
        return match.group(0)
    column = ref_match.group(1).decode("ascii")
    if column not in replacements:
        return match.group(0)

    value = replacements[column]
    clean_attrs = CELL_TYPE_PATTERN.sub(b"", attrs)
    if not value:
        return b"<c" + clean_attrs + b"/>"
    text = esc(value)
    return b'<c' + clean_attrs + b' t="inlineStr"><is><t xml:space="preserve">' + text + b"</t></is></c>"


def rewrite_row(row_xml, row_number, edits):
    replacements = edits.get(row_number)
    if not replacements:
        return row_xml
    return CELL_PATTERN.sub(lambda match: replace_cell(match, replacements), row_xml)


def stream_sheet(source, destination, edits):
    buffer = b""
    while True:
        chunk = source.read(1024 * 1024)
        if chunk:
            buffer += chunk
        else:
            eof = True

        while True:
            match = ROW_PATTERN.search(buffer)
            if match:
                destination.write(buffer[:match.start()])
                row_number = int(match.group(1))
                destination.write(rewrite_row(match.group(0), row_number, edits))
                buffer = buffer[match.end():]
                continue
            start = buffer.find(b"<row")
            if start > 0:
                destination.write(buffer[:start])
                buffer = buffer[start:]
            elif start < 0 and len(buffer) > 64 * 1024:
                destination.write(buffer[:-64 * 1024])
                buffer = buffer[-64 * 1024:]
            break

        if not chunk:
            destination.write(buffer)
            break


def morphology_edits(source_path):
    workbook = load_workbook(source_path, read_only=True, data_only=True)
    sheet = workbook["总24555"]
    rows = sheet.iter_rows(values_only=True)
    headers = {importer.cell_text(value): index for index, value in enumerate(next(rows)) if value is not None}
    edits = {}
    changed_rows = 0
    for row_number, row in enumerate(rows, start=2):
        if "词汇" not in headers or headers["词汇"] >= len(row):
            continue
        word = importer.normalize_word(importer.clean_display_word(row[headers["词汇"]]))
        if not word:
            continue
        etymology, parts, source = importer.clean_morphology(row, headers, word)
        new_values = {"A": etymology, "J": " + ".join(parts), "K": source}
        for index in range(1, 9):
            new_values[chr(65 + index)] = parts[index - 1] if len(parts) >= index else ""
        current_values = {}
        for column, header in [("A", "词源"), *( (chr(65 + index), f"词根/词缀{index}") for index in range(1, 9)), ("J", "词根组成"), ("K", "词根信息来源")]:
            current_values[column] = importer.cell_text(row[headers[header]]) if header in headers else ""
        changed = {column: value for column, value in new_values.items() if value != current_values[column]}
        if changed:
            edits[row_number] = changed
            changed_rows += 1
    workbook.close()
    return edits, changed_rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    if not args.source.is_file():
        raise SystemExit(f"Workbook not found: {args.source}")

    edits, changed_rows = morphology_edits(args.source)
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.source, "r") as source_zip, zipfile.ZipFile(args.destination, "w") as output_zip:
        target_sheet = workbook_sheet_path(source_zip, "总24555")
        for info in source_zip.infolist():
            with source_zip.open(info, "r") as source_file, output_zip.open(info, "w") as output_file:
                if info.filename == target_sheet:
                    stream_sheet(source_file, output_file, edits)
                else:
                    while chunk := source_file.read(1024 * 1024):
                        output_file.write(chunk)

    print({"sheet": "总24555", "rows_cleaned": changed_rows, "edited_rows": len(edits), "output": str(args.destination)})


if __name__ == "__main__":
    main()
