import Papa from 'papaparse';
import { readSourceText, tableToTopicRows } from './tableRows';
import { hasLessonHeading, looksLikeTable, parseTopicText } from './textParser';
import type { TopicParser } from './types';

/**
 * CSV with "lesson,topic" columns. Delimiter (comma, semicolon, tab) is auto-detected.
 * A .csv saved in the heading format ("Türkçe:" + topic lines) is read as such.
 */
export const csvParser: TopicParser = {
  id: 'csv',
  label: 'CSV',
  extensions: ['.csv', '.tsv'],
  needsTargetLesson: false,
  async parse(source) {
    const text = await readSourceText(source);
    if (!looksLikeTable(text) && hasLessonHeading(text)) return parseTopicText(text);
    const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy', delimitersToGuess: [',', ';', '\t', '|'] });
    return tableToTopicRows(result.data);
  },
};
