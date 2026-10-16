import Dexie, { type Table } from 'dexie';
import type { Exam, Lesson, Topic, TrialTest, TrialTestWrongTopic } from '@/domain/types';

/** Internal identifier from the original name "study-tracker". Do NOT rename it: every device would open a new, empty database. */
export const DEFAULT_DB_NAME = 'study-tracker';

/**
 * IndexedDB schema. Only indexed fields are listed in `stores`; all other
 * fields are stored as-is. To change the schema, add a new `this.version(n)`
 * block (never edit an existing one) with an upgrade function if data must move.
 */
export class StudyDatabase extends Dexie {
  exams!: Table<Exam, string>;
  lessons!: Table<Lesson, string>;
  topics!: Table<Topic, string>;
  trialTests!: Table<TrialTest, string>;
  trialTestWrongTopics!: Table<TrialTestWrongTopic, string>;

  constructor(name: string = DEFAULT_DB_NAME) {
    super(name);
    this.version(1).stores({
      exams: 'id, updatedAt',
      lessons: 'id, examId, updatedAt',
      topics: 'id, lessonId, updatedAt',
      trialTests: 'id, examId, lessonId, updatedAt',
      trialTestWrongTopics: 'id, trialTestId, topicId, updatedAt',
    });
  }
}
