import { normalizeName, type ParsedTopicRow } from '@/domain/importPlan';
import type { ImportSource } from './types';

const LESSON_HEADERS = new Set(['lesson', 'ders', 'ders adı', 'dersler']);
const TOPIC_HEADERS = new Set(['topic', 'konu', 'konu adı', 'konular']);

/**
 * Turns spreadsheet-like rows into {lesson, topic} rows. If the first row is a
 * header ("lesson,topic" or Turkish "ders,konu", any column order), it picks the
 * columns by name and skips it; otherwise column 1 = lesson, column 2 = topic.
 * Fully empty rows are dropped; incomplete rows are kept (the import plan reports them).
 */
export function tableToTopicRows(rows: readonly (readonly unknown[])[]): ParsedTopicRow[] {
  const cells = rows
    .map((row) => row.map((c) => (c === null || c === undefined ? '' : String(c).trim())))
    .filter((row) => row.some((c) => c !== ''));

  let lessonCol = 0;
  let topicCol = 1;
  let start = 0;
  const header = cells[0]?.map(normalizeName);
  if (header) {
    const l = header.findIndex((c) => LESSON_HEADERS.has(c));
    const t = header.findIndex((c) => TOPIC_HEADERS.has(c));
    if (l >= 0 && t >= 0) {
      lessonCol = l;
      topicCol = t;
      start = 1;
    }
  }

  return cells.slice(start).map((row) => ({ lesson: row[lessonCol] ?? '', topic: row[topicCol] ?? '' }));
}

/**
 * Decodes text files: UTF-8 (BOM stripped) when valid, otherwise Windows-1254,
 * the encoding Turkish Excel uses for "CSV" exports.
 */
export function decodeText(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1254').decode(bytes);
  }
}

export async function readSourceText(source: ImportSource): Promise<string> {
  return source.kind === 'text' ? source.text : decodeText(await source.file.arrayBuffer());
}
