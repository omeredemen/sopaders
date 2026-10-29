import type { TopicStatusId } from '@/config/topicStatuses';

export type Id = string;
/** Full ISO 8601 timestamp, e.g. "2026-10-15T18:30:00.000Z". */
export type IsoDateTime = string;
/** Calendar date without time or timezone, "YYYY-MM-DD". */
export type LocalDate = string;

/**
 * Fields every stored record has. They exist to make cloud sync possible:
 * - `id` is a client-generated UUID, so records can be created offline.
 * - `updatedAt` drives last-write-wins merging.
 * - `deletedAt` is a soft-delete marker (tombstone), so deletions can sync too.
 */
export interface BaseRecord {
  id: Id;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  deletedAt: IsoDateTime | null;
}

export interface Exam extends BaseRecord {
  name: string;
  examDate: LocalDate;
  /** Day the user started studying for this exam. The actual tempo is measured from here. */
  studyStartDate: LocalDate;
  studyDeadline: LocalDate | null;
  /** How many wrong answers cancel one correct answer. 0 means no penalty. */
  wrongPenalty: number;
  /**
   * Fixed number of questions per lesson in this exam's trial tests (lessonId → count).
   * Lessons without an entry are entered freely (D/Y/B). Keys of deleted lessons are ignored.
   */
  trialQuestionCounts: Record<Id, number>;
}

export interface Lesson extends BaseRecord {
  examId: Id;
  name: string;
  order: number;
}

export interface Topic extends BaseRecord {
  lessonId: Id;
  name: string;
  /** Usually a TopicStatusId; may be an unknown string if config changed. Resolve via getTopicStatus(). */
  status: TopicStatusId | (string & {});
  order: number;
}

/** One lesson's answers in a trial test. Net is never stored; see calculateNet(). */
export interface TrialLessonResult {
  lessonId: Id;
  correct: number;
  wrong: number;
  empty: number;
}

/**
 * A trial test (deneme) of a whole exam: one result per lesson that was in it.
 * A single-lesson test ("branş denemesi") is just a test with one result.
 */
export interface TrialTest extends BaseRecord {
  examId: Id;
  /** Optional label, e.g. publisher and number. "" when not given. */
  name: string;
  date: LocalDate;
  /** At most one result per lesson. */
  results: TrialLessonResult[];
  notes: string;
}

export interface TrialTestWrongTopic extends BaseRecord {
  trialTestId: Id;
  topicId: Id;
}

/** Fields a caller provides when creating a record; the rest are generated. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>;
