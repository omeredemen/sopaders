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

/**
 * Soft-deletes lessons with their topics, and removes their results from trial tests.
 * A test left without any result is deleted (with its wrong-topic links); the others keep
 * their remaining lessons. Kept flat on purpose: one more nested async helper here makes
 * Dexie lose track of the transaction (PrematureCommitError).
 */
export async function deleteLessonsCascade(db: StudyDatabase, lessonIds: Id[], now: IsoDateTime) {
  const topicIds = await db.topics.where('lessonId').anyOf(lessonIds).filter(active).primaryKeys();
  await deleteTopicsCascade(db, topicIds, now);
  const gone = new Set(lessonIds);
  const emptied: Id[] = [];
  await db.trialTests
    .filter((t) => active(t) && t.results.some((r) => gone.has(r.lessonId)))
    .modify((t) => {
      t.results = t.results.filter((r) => !gone.has(r.lessonId));
      t.updatedAt = now;
      if (t.results.length === 0) emptied.push(t.id);
    });
  await db.trialTests.where('id').anyOf(emptied).modify(tombstone(now));
  await db.trialTestWrongTopics.where('trialTestId').anyOf(emptied).filter(active).modify(tombstone(now));
  await db.lessons.where('id').anyOf(lessonIds).filter(active).modify(tombstone(now));
}

export async function deleteExamCascade(db: StudyDatabase, examId: Id, now: IsoDateTime) {
  const lessonIds = await db.lessons.where('examId').equals(examId).filter(active).primaryKeys();
  await deleteLessonsCascade(db, lessonIds, now);
  const trialIds = await db.trialTests.where('examId').equals(examId).filter(active).primaryKeys();
  await deleteTrialTestsCascade(db, trialIds, now);
  await db.exams.where('id').equals(examId).filter(active).modify(tombstone(now));
}
