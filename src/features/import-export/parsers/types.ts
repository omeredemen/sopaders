import type { ParsedTopicRow } from '@/domain/importPlan';

/** What a parser receives: an uploaded file, or text pasted into the paste box. */
export type ImportSource = { kind: 'file'; file: File } | { kind: 'text'; text: string };

export interface ParseOptions {
  /** Lesson to use for formats that don't contain a lesson column (e.g. plain text). */
  targetLessonName?: string;
}

/**
 * Common contract for all topic import formats. Parsers only turn input into
 * rows; matching lessons and skipping duplicates happens in domain/importPlan.ts.
 */
export interface TopicParser {
  /** Stable id, e.g. "csv". */
  id: string;
  /** Turkish label shown in the UI. */
  label: string;
  /** File extensions handled (lowercase, with dot). Empty for text-only parsers. */
  extensions: string[];
  /** True if rows may lack a lesson and need ParseOptions.targetLessonName (e.g. plain text without headings). */
  needsTargetLesson: boolean;
  parse(source: ImportSource, options?: ParseOptions): Promise<ParsedTopicRow[]>;
}
