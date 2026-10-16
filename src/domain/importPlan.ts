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
  /** Rows of new lessons the user chose to skip. */
  skipped: ParsedTopicRow[];
}

/** What to do with a lesson name from the file that matches no existing lesson. */
export type LessonDecision = { kind: 'create' } | { kind: 'existing'; lessonId: Id } | { kind: 'skip' };

export interface PlanOptions {
  /** Decisions for unknown lessons, keyed by normalizeName(lesson name). Missing = create. */
  lessonDecisions?: ReadonlyMap<string, LessonDecision>;
}

/** Trims and collapses inner whitespace, for display and storage. */
export function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Comparison key for names: cleaned and lowercased with Turkish rules (I→ı, İ→i). */
export function normalizeName(value: string): string {
  return cleanName(value).toLocaleLowerCase('tr-TR');
}

const TURKISH_FOLD: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/**
 * Looser comparison key: like normalizeName but ignoring Turkish letters and punctuation,
 * so "Turkce", "TÜRKÇE" and "Türkçe" (and "TARIH" vs "Tarih") compare equal.
 */
export function foldName(value: string): string {
  return normalizeName(value)
    .replace(/[çğıöşüâîû]/g, (c) => TURKISH_FOLD[c] ?? c)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** An existing lesson whose name matches loosely (see foldName), if any. */
export function findSimilarLesson<L extends Pick<Lesson, 'id' | 'name'>>(name: string, lessons: readonly L[]): L | undefined {
  const key = foldName(name);
  return lessons.find((l) => foldName(l.name) === key);
}

export interface NewLessonCandidate {
  /** Name as written in the file (first occurrence). */
  name: string;
  /** normalizeName(name), the key for PlanOptions.lessonDecisions. */
  key: string;
  /** Topics that would be added under it. */
  topicCount: number;
  /** Existing lesson with a loosely matching name; a likely typo/spelling variant. */
  similarLessonId: Id | null;
}

/** Lessons in the file that don't exist yet, for asking the user what to do with them. */
export function findNewLessonCandidates(
  rows: readonly ParsedTopicRow[],
  existingLessons: readonly Pick<Lesson, 'id' | 'name'>[],
  existingTopics: readonly Pick<Topic, 'lessonId' | 'name'>[],
): NewLessonCandidate[] {
  const plan = planTopicImport(rows, existingLessons, existingTopics);
  return plan.newLessons.map((name) => ({
    name,
    key: normalizeName(name),
    topicCount: plan.topics.filter((t) => t.lessonId === null && t.lessonName === name).length,
    similarLessonId: findSimilarLesson(name, existingLessons)?.id ?? null,
  }));
}

/**
 * Decides what an import will do, without touching storage:
 * matches lessons by name, creates missing ones (unless `lessonDecisions` says to
 * map them to an existing lesson or skip them), and skips duplicate topics
 * (both against existing topics and repeats within the imported rows).
 */
export function planTopicImport(
  rows: readonly ParsedTopicRow[],
  existingLessons: readonly Pick<Lesson, 'id' | 'name'>[],
  existingTopics: readonly Pick<Topic, 'lessonId' | 'name'>[],
  options: PlanOptions = {},
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

  const plan: TopicImportPlan = { newLessons: [], topics: [], duplicates: [], invalid: [], skipped: [] };

  for (const row of rows) {
    const lessonName = cleanName(row.lesson);
    const topicName = cleanName(row.topic);
    if (!lessonName || !topicName) {
      plan.invalid.push(row);
      continue;
    }

    let lessonKey = normalizeName(lessonName);
    let lesson = lessonsByKey.get(lessonKey);
    if (!lesson) {
      const decision = options.lessonDecisions?.get(lessonKey) ?? { kind: 'create' };
      if (decision.kind === 'skip') {
        plan.skipped.push(row);
        continue;
      }
      const target = decision.kind === 'existing' ? existingLessons.find((l) => l.id === decision.lessonId) : undefined;
      if (target) {
        // Duplicates are then checked against the chosen lesson's topics.
        lesson = { id: target.id, name: target.name };
        lessonKey = normalizeName(target.name);
      } else {
        lesson = { id: null, name: lessonName };
        lessonsByKey.set(lessonKey, lesson);
        plan.newLessons.push(lessonName);
      }
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
