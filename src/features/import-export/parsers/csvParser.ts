import Papa from 'papaparse';
import { readSourceText, tableToTopicRows } from './tableRows';
import type { TopicParser } from './types';

/** CSV with "lesson,topic" columns. Delimiter (comma, semicolon, tab) is auto-detected. */
export const csvParser: TopicParser = {
  id: 'csv',
  label: 'CSV',
  extensions: ['.csv', '.tsv'],
  needsTargetLesson: false,
  async parse(source) {
    const text = await readSourceText(source);
    const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy', delimitersToGuess: [',', ';', '\t', '|'] });
    return tableToTopicRows(result.data);
  },
};
