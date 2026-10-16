import { createChangeEmitter } from '../changeEmitter';
import type { Repositories } from '../repositories';
import { DEFAULT_DB_NAME, StudyDatabase } from './db';
import { DexieBackupRepository } from './DexieBackupRepository';
import { DexieExamRepository } from './DexieExamRepository';
import { DexieLessonRepository } from './DexieLessonRepository';
import { DexieTopicRepository } from './DexieTopicRepository';
import { DexieTrialTestRepository } from './DexieTrialTestRepository';

/** Builds all repositories backed by one local IndexedDB database. */
export function createDexieRepositories(dbName: string = DEFAULT_DB_NAME): Repositories {
  const db = new StudyDatabase(dbName);
  const changes = createChangeEmitter();
  return {
    exams: new DexieExamRepository(db, changes),
    lessons: new DexieLessonRepository(db, changes),
    topics: new DexieTopicRepository(db, changes),
    trialTests: new DexieTrialTestRepository(db, changes),
    backup: new DexieBackupRepository(db, changes),
    changes,
  };
}
