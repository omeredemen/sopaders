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
  studyDeadline: LocalDate | null;
  /** How many wrong answers cancel one correct answer. 0 means no penalty. */
  wrongPenalty: number;
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

/** A trial test result for one lesson. Net is never stored; see calculateNet(). */
export interface TrialTest extends BaseRecord {
  examId: Id;
  lessonId: Id;
  date: LocalDate;
  correct: number;
  wrong: number;
  empty: number;
  notes: string;
}

export interface TrialTestWrongTopic extends BaseRecord {
  trialTestId: Id;
  topicId: Id;
}

/** Fields a caller provides when creating a record; the rest are generated. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>;
