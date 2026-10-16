/**
 * Storage-agnostic repository contracts.
 *
 * The UI talks only to these interfaces (via hooks + useRepositories()).
 * Implementations live in src/data/<backend>/ and are chosen in createRepositories.ts.
 *
 * Conventions every implementation must follow:
 * - Reads return only active records (deletedAt === null).
 * - Deletes are soft (set deletedAt + updatedAt) and cascade to children.
 * - Every write sets updatedAt and notifies `changes` subscribers when it completes.
 * - Lists come back sorted (lessons/topics by `order`, exams by date, trial tests by date).
 */
import type { BackupData } from '@/domain/backup';
import type { Exam, Id, LocalDate, Lesson, Topic, TrialTest } from '@/domain/types';

export type EntityName = 'exams' | 'lessons' | 'topics' | 'trialTests';

export interface ChangeEvent {
  entities: EntityName[];
}

export interface ChangeFeed {
  /** Called after every completed write. Returns an unsubscribe function. */
  subscribe(listener: (event: ChangeEvent) => void): () => void;
}

// ---- Exams -----------------------------------------------------------------

export interface ExamInput {
  name: string;
  examDate: LocalDate;
  studyDeadline?: LocalDate | null;
  /** Defaults to DEFAULT_WRONG_PENALTY. */
  wrongPenalty?: number;
}

export type ExamPatch = Partial<ExamInput>;

export interface ExamRepository {
  /** Active exams, soonest exam date first. */
  list(): Promise<Exam[]>;
  get(id: Id): Promise<Exam | undefined>;
  create(input: ExamInput): Promise<Exam>;
  update(id: Id, patch: ExamPatch): Promise<Exam>;
  /** Soft-deletes the exam with all its lessons, topics and trial tests. */
  delete(id: Id): Promise<void>;
}

// ---- Lessons ---------------------------------------------------------------

export interface LessonInput {
  examId: Id;
  name: string;
}

export interface LessonRepository {
  listByExam(examId: Id): Promise<Lesson[]>;
  get(id: Id): Promise<Lesson | undefined>;
  /** Appends the lesson at the end of the exam's lesson list. */
  create(input: LessonInput): Promise<Lesson>;
  rename(id: Id, name: string): Promise<Lesson>;
  /** Sets `order` to each id's index in `orderedIds`. */
  reorder(examId: Id, orderedIds: Id[]): Promise<void>;
  /** Soft-deletes the lesson with its topics and trial tests. */
  delete(id: Id): Promise<void>;
}

// ---- Topics ----------------------------------------------------------------

export interface TopicInput {
  lessonId: Id;
  name: string;
  /** Defaults to DEFAULT_TOPIC_STATUS_ID. */
  status?: string;
}

export interface TopicRepository {
  listByLesson(lessonId: Id): Promise<Topic[]>;
  /** All topics of all lessons of the exam. */
  listByExam(examId: Id): Promise<Topic[]>;
  get(id: Id): Promise<Topic | undefined>;
  /** Appends the topic at the end of its lesson. */
  create(input: TopicInput): Promise<Topic>;
  /** Bulk create (used by import), in one transaction. Appends per lesson in input order. */
  createMany(inputs: TopicInput[]): Promise<Topic[]>;
  rename(id: Id, name: string): Promise<Topic>;
  setStatus(ids: Id[], status: string): Promise<void>;
  reorder(lessonId: Id, orderedIds: Id[]): Promise<void>;
  /** Soft-deletes the topic and its trial-test wrong-topic links. */
  delete(id: Id): Promise<void>;
}

// ---- Trial tests -----------------------------------------------------------

export interface TrialTestInput {
  examId: Id;
  lessonId: Id;
  date: LocalDate;
  correct: number;
  wrong: number;
  empty: number;
  notes?: string;
  wrongTopicIds?: Id[];
}

export type TrialTestPatch = Partial<Omit<TrialTestInput, 'examId'>>;

/** A trial test with the ids of the topics answered wrong (from TrialTestWrongTopic). */
export interface TrialTestWithTopics extends TrialTest {
  wrongTopicIds: Id[];
}

export interface TrialTestRepository {
  /** Oldest first. */
  listByExam(examId: Id): Promise<TrialTestWithTopics[]>;
  get(id: Id): Promise<TrialTestWithTopics | undefined>;
  create(input: TrialTestInput): Promise<TrialTestWithTopics>;
  /** If `wrongTopicIds` is given, it replaces the previous set. */
  update(id: Id, patch: TrialTestPatch): Promise<TrialTestWithTopics>;
  delete(id: Id): Promise<void>;
}

// ---- Backup ----------------------------------------------------------------

export type RestoreMode = 'merge' | 'restore' | 'replace';

export interface RestoreSummary {
  added: number;
  updated: number;
  unchanged: number;
}

export interface BackupRepository {
  /** Every record of every table, including soft-deleted ones. */
  exportAll(): Promise<BackupData>;
  /**
   * 'merge': last-write-wins by updatedAt (mergeByUpdatedAt), keeping local records not in the backup.
   * 'restore': records in the backup go back to the backup's version (restoreToBackup), keeping
   *   records created here after the backup. `updated` counts the reverted records.
   * 'replace': delete everything local, then write the backup as-is.
   * Runs in one transaction where the backend supports it.
   */
  restore(data: BackupData, mode: RestoreMode): Promise<RestoreSummary>;
}

// ---- Bundle ----------------------------------------------------------------

export interface Repositories {
  exams: ExamRepository;
  lessons: LessonRepository;
  topics: TopicRepository;
  trialTests: TrialTestRepository;
  backup: BackupRepository;
  changes: ChangeFeed;
}

export class NotFoundError extends Error {
  constructor(entity: string, id: Id) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
