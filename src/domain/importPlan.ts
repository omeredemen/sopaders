import type { Id, Lesson, Topic } from './types';

/** One row produced by any import parser. */
export interface ParsedTopicRow {
  lesson: string;
  topic: string;
}

export interface PlannedTopic {
  /** Lesson name as it will be shown (existing lesson's spelling, or the new one). */
  lessonName: string;
  /** Existing lesson id, or null if the lesson will be created by this import. */
  lessonId: Id | null;
  topicName: string;
}

export interface TopicImportPlan {
  /** Lessons that don't exist yet and will be created, in first-seen order. */
  newLessons: string[];
  /** Topics that will be created, in file order. */
  topics: PlannedTopic[];
  /** Rows skipped because the topic already exists (in the exam or earlier in the file). */
  duplicates: ParsedTopicRow[];
  /** Rows skipped because lesson or topic name is empty. */
  invalid: ParsedTopicRow[];
}

/** Trims and collapses inner whitespace, for display and storage. */
export function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Comparison key for names: cleaned and lowercased with Turkish rules (I→ı, İ→i). */
export function normalizeName(value: string): string {
  return cleanName(value).toLocaleLowerCase('tr-TR');
}

/**
 * Decides what an import will do, without touching storage:
 * matches lessons by name, creates missing ones, and skips duplicate topics
 * (both against existing topics and repeats within the imported rows).
 */
export function planTopicImport(
  rows: readonly ParsedTopicRow[],
  existingLessons: readonly Pick<Lesson, 'id' | 'name'>[],
  existingTopics: readonly Pick<Topic, 'lessonId' | 'name'>[],
): TopicImportPlan {
  const lessonsByKey = new Map<string, { id: Id | null; name: string }>();
  for (const lesson of existingLessons) {
    lessonsByKey.set(normalizeName(lesson.name), { id: lesson.id, name: lesson.name });
  }

  // Topic keys are "<lessonKey>\u0000<topicKey>" so the same topic name may exist in different lessons.
  const lessonKeyById = new Map(existingLessons.map((l) => [l.id, normalizeName(l.name)]));
  const seenTopics = new Set<string>();
  for (const topic of existingTopics) {
    const lessonKey = lessonKeyById.get(topic.lessonId);
    if (lessonKey !== undefined) seenTopics.add(`${lessonKey}\u0000${normalizeName(topic.name)}`);
  }

  const plan: TopicImportPlan = { newLessons: [], topics: [], duplicates: [], invalid: [] };

  for (const row of rows) {
    const lessonName = cleanName(row.lesson);
    const topicName = cleanName(row.topic);
    if (!lessonName || !topicName) {
      plan.invalid.push(row);
      continue;
    }

    const lessonKey = normalizeName(lessonName);
    let lesson = lessonsByKey.get(lessonKey);
    if (!lesson) {
      lesson = { id: null, name: lessonName };
      lessonsByKey.set(lessonKey, lesson);
      plan.newLessons.push(lessonName);
    }

    const topicKey = `${lessonKey}\u0000${normalizeName(topicName)}`;
    if (seenTopics.has(topicKey)) {
      plan.duplicates.push(row);
      continue;
    }
    seenTopics.add(topicKey);
    plan.topics.push({ lessonName: lesson.name, lessonId: lesson.id, topicName });
  }

  return plan;
}
