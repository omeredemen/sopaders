import { csvParser } from './csvParser';
import { textParser } from './textParser';
import type { TopicParser } from './types';
import { xlsxParser } from './xlsxParser';

/**
 * All available import parsers. To add a format: implement TopicParser in a
 * new file in this folder and append it here. The file picker's `accept`
 * list and format detection are derived from this list.
 */
export const TOPIC_PARSERS: TopicParser[] = [csvParser, xlsxParser, textParser];

/** Finds the parser for a file name by its extension. */
export function findParserForFile(fileName: string, parsers: TopicParser[] = TOPIC_PARSERS): TopicParser | undefined {
  const lower = fileName.toLowerCase();
  return parsers.find((p) => p.extensions.some((ext) => lower.endsWith(ext)));
}

export function getParser(id: string, parsers: TopicParser[] = TOPIC_PARSERS): TopicParser {
  const parser = parsers.find((p) => p.id === id);
  if (!parser) throw new Error(`Unknown parser: ${id}`);
  return parser;
}

/** Value for <input type="file" accept>. */
export const ACCEPTED_FILE_EXTENSIONS = TOPIC_PARSERS.flatMap((p) => p.extensions).join(',');
