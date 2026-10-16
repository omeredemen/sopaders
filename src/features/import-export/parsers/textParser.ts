import Papa from 'papaparse';
import { normalizeName, type ParsedTopicRow } from '@/domain/importPlan';
import { readSourceText, tableToTopicRows } from './tableRows';
import type { TopicParser } from './types';

/** Leading list markers to strip ("- ", "• ", "* "). Numbers are kept: "1. Dünya Savaşı" is a real name. */
const BULLET = /^\s*[-•*–]\s+/;
/** A lesson heading: "Türkçe:" or "# Türkçe" (markdown style). */
const HEADING_COLON = /^(.+?)\s*:$/;
const HEADING_HASH = /^#+\s*(.+)$/;

function headingOf(line: string): string | null {
  const match = HEADING_HASH.exec(line) ?? HEADING_COLON.exec(line);
  return match?.[1]?.trim() || null;
}

/**
 * Plain text, one topic per line. Lines like "Türkçe:" or "# Türkçe" start a new lesson,
 * so one text can hold several lessons:
 *
 *   Türkçe:
 *   - Sözcükte Anlam
 *   Tarih:
 *   - Kurtuluş Savaşı
 *
 * Lines before the first heading go to `targetLessonName`; without one their lesson is ""
 * (the import plan reports them as incomplete, and the UI asks for a lesson).
 */
export function parseTopicText(text: string, targetLessonName = ''): ParsedTopicRow[] {
  let lesson = targetLessonName.trim();
  const rows: ParsedTopicRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = BULLET.test(line) ? null : headingOf(line);
    if (heading) {
      lesson = heading;
      continue;
    }
    rows.push({ lesson, topic: line.replace(BULLET, '').trim() });
  }
  return rows;
}

/** A "ders,konu" / "lesson;topic" header line, as in the CSV sample. */
const TABLE_HEADER = /^(ders|ders adı|lesson)\s*[,;\t]\s*(konu|konu adı|topic)\s*$/;

/** A cell separator, as in "Türkçe,Sözcükte Anlam" or "Türkçe;Sözcükte Anlam". */
const DELIMITER = /[,;\t]/;

function nonEmptyLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/**
 * True if the text is table data rather than the heading format: it starts with the CSV
 * header ("ders,konu", same as the file sample), or every line has a tab (cells copied
 * from Excel / Google Sheets).
 */
export function looksLikeTable(text: string): boolean {
  const lines = nonEmptyLines(text);
  if (lines.length === 0) return false;
  if (TABLE_HEADER.test(normalizeName(lines[0]!))) return true;
  return lines.every((l) => l.includes('\t'));
}

/** True if some line is a lesson heading ("Türkçe:" / "# Türkçe") and not a table row. */
export function hasLessonHeading(text: string): boolean {
  return nonEmptyLines(text).some((l) => !BULLET.test(l) && !DELIMITER.test(l) && headingOf(l) !== null);
}

function parseTable(text: string): ParsedTopicRow[] {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: 'greedy', delimitersToGuess: [',', ';', '\t', '|'] });
  return tableToTopicRows(result.data);
}

/**
 * Pasted text, .txt and .csv files all accept both formats: the "ders,konu" table
 * (also tab-separated cells copied from a spreadsheet) and the heading format.
 * Header-less "Türkçe,Sözcükte Anlam" lines count as a table only when there are no
 * headings and no target lesson; with a target lesson, "Osmanlı Kültür, Medeniyet" stays
 * one topic name.
 */
export function parsePastedTopics(text: string, targetLessonName = ''): ParsedTopicRow[] {
  if (looksLikeTable(text)) return parseTable(text);
  const headerlessTable =
    !targetLessonName.trim() && !hasLessonHeading(text) && nonEmptyLines(text).every((l) => DELIMITER.test(l));
  return headerlessTable ? parseTable(text) : parseTopicText(text, targetLessonName);
}

export const textParser: TopicParser = {
  id: 'text',
  label: 'Metin',
  extensions: ['.txt', '.md'],
  needsTargetLesson: true,
  async parse(source, options) {
    return parsePastedTopics(await readSourceText(source), options?.targetLessonName);
  },
};
