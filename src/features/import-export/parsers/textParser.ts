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

/**
 * True if pasted text is table data rather than one topic per line: either it starts
 * with the CSV header ("ders,konu", same as the file sample), or every line has a tab
 * (cells copied from Excel / Google Sheets).
 */
export function looksLikeTable(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  if (TABLE_HEADER.test(normalizeName(lines[0]!))) return true;
  return text.split(/\r?\n/).filter((l) => l.trim()).every((l) => l.includes('\t'));
}

/**
 * Pasted text or a .txt file: accepts the same "ders,konu" table format as CSV files
 * (and tab-separated cells copied from a spreadsheet), otherwise the heading format.
 */
export function parsePastedTopics(text: string, targetLessonName = ''): ParsedTopicRow[] {
  if (!looksLikeTable(text)) return parseTopicText(text, targetLessonName);
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: 'greedy', delimitersToGuess: [',', ';', '\t', '|'] });
  return tableToTopicRows(result.data);
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
