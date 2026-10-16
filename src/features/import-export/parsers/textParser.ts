import { readSourceText } from './tableRows';
import type { TopicParser } from './types';

/** Leading list markers to strip ("- ", "• ", "* "). Numbers are kept: "1. Dünya Savaşı" is a real name. */
const BULLET = /^\s*[-•*–]\s+/;

/** Plain text: one topic per line, all into the chosen lesson. */
export const textParser: TopicParser = {
  id: 'text',
  label: 'Metin',
  extensions: ['.txt'],
  needsTargetLesson: true,
  async parse(source, options) {
    const lesson = options?.targetLessonName?.trim();
    if (!lesson) throw new Error('Plain text import needs a target lesson');
    const text = await readSourceText(source);
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(BULLET, '').trim())
      .filter((line) => line !== '')
      .map((topic) => ({ lesson, topic }));
  },
};
