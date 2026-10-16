import type { ParsedTopicRow } from '@/domain/importPlan';
import { readSourceText } from './tableRows';
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

export const textParser: TopicParser = {
  id: 'text',
  label: 'Metin',
  extensions: ['.txt', '.md'],
  needsTargetLesson: true,
  async parse(source, options) {
    return parseTopicText(await readSourceText(source), options?.targetLessonName);
  },
};
