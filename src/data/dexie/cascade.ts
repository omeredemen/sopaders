import type { Id, IsoDateTime } from '@/domain/types';
import type { StudyDatabase } from './db';

/*
 * Soft-delete cascades. Each function must run inside a Dexie 'rw' transaction
 * that includes every table it touches (see CASCADE_TABLES).
 *
 * Note: no early returns on empty id lists. Every step must issue an IndexedDB
 * request, otherwise the transaction can auto-commit before later steps run.
 */

const tombstone = (now: IsoDateTime) => ({ deletedAt: now, updatedAt: now });
const active = (r: { deletedAt: IsoDateTime | null }) => r.deletedAt === null;

export const CASCADE_TABLES = (db: StudyDatabase) => [
  db.exams,
  db.lessons,
  db.topics,
  db.trialTests,
  db.trialTestWrongTopics,
];

export async function deleteTrialTestsCascade(db: StudyDatabase, trialTestIds: Id[], now: IsoDateTime) {
  await db.trialTests.where('id').anyOf(trialTestIds).filter(active).modify(tombstone(now));
  await db.trialTestWrongTopics.where('trialTestId').anyOf(trialTestIds).filter(active).modify(tombstone(now));
}

export async function deleteTopicsCascade(db: StudyDatabase, topicIds: Id[], now: IsoDateTime) {
  await db.topics.where('id').anyOf(topicIds).filter(active).modify(tombstone(now));
  await db.trialTestWrongTopics.where('topicId').anyOf(topicIds).filter(active).modify(tombstone(now));
}

export async function deleteLessonsCascade(db: StudyDatabase, lessonIds: Id[], now: IsoDateTime) {
  const topicIds = await db.topics.where('lessonId').anyOf(lessonIds).filter(active).primaryKeys();
  const trialIds = await db.trialTests.where('lessonId').anyOf(lessonIds).filter(active).primaryKeys();
  await deleteTopicsCascade(db, topicIds, now);
  await deleteTrialTestsCascade(db, trialIds, now);
  await db.lessons.where('id').anyOf(lessonIds).filter(active).modify(tombstone(now));
}

export async function deleteExamCascade(db: StudyDatabase, examId: Id, now: IsoDateTime) {
  const lessonIds = await db.lessons.where('examId').equals(examId).filter(active).primaryKeys();
  await deleteLessonsCascade(db, lessonIds, now);
  // Trial tests whose lesson was already gone are still attached to the exam.
  const trialIds = await db.trialTests.where('examId').equals(examId).filter(active).primaryKeys();
  await deleteTrialTestsCascade(db, trialIds, now);
  await db.exams.where('id').equals(examId).filter(active).modify(tombstone(now));
}
