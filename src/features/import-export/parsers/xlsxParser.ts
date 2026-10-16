import { tableToTopicRows } from './tableRows';
import type { TopicParser } from './types';

/** Excel workbook: first sheet, "lesson,topic" columns. SheetJS is loaded on demand (large). */
export const xlsxParser: TopicParser = {
  id: 'xlsx',
  label: 'Excel',
  extensions: ['.xlsx', '.xls', '.ods'],
  needsTargetLesson: false,
  async parse(source) {
    if (source.kind !== 'file') throw new Error('Excel parser needs a file');
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await source.file.arrayBuffer(), { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
    return tableToTopicRows(rows);
  },
};
