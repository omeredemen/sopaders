import { beforeEach, describe, expect, it } from 'vitest';
import { createDexieRepositories } from '@/data/dexie';
import type { Repositories } from '@/data/repositories';
import { newId } from '@/domain/records';
import { saveTrialTest } from './saveTrialTest';

describe('saveTrialTest', () => {
  let repos: Repositories;
  let ids: { examId: string; lessonId: string; t1: string; t2: string; t3: string };

  beforeEach(async () => {
    repos = createDexieRepositories(`test-${newId()}`);
    const exam = await repos.exams.create({ name: 'KPSS', examDate: '2026-12-01' });
    const lesson = await repos.lessons.create({ examId: exam.id, name: 'Türkçe' });
    const [t1, t2, t3] = await repos.topics.createMany([
      { lessonId: lesson.id, name: 'A', status: 'finished' },
      { lessonId: lesson.id, name: 'B' },
      { lessonId: lesson.id, name: 'C' },
    ]);
    ids = { examId: exam.id, lessonId: lesson.id, t1: t1!.id, t2: t2!.id, t3: t3!.id };
  });

  const statuses = async () =>
    Object.fromEntries((await repos.topics.listByLesson(ids.lessonId)).map((t) => [t.name, t.status]));

  it('creates the test and marks wrong topics for review (even finished ones)', async () => {
    const result = await saveTrialTest(repos, {
      examId: ids.examId, lessonId: ids.lessonId, date: '2026-10-15', correct: 30, wrong: 8, empty: 2,
      wrongTopicIds: [ids.t1, ids.t2],
    });
    expect(result.markedForReview).toBe(2);
    expect(result.test.wrongTopicIds.sort()).toEqual([ids.t1, ids.t2].sort());
    expect(await statuses()).toEqual({ A: 'needs_review', B: 'needs_review', C: 'not_started' });
  });

  it('on edit, only marks newly added wrong topics', async () => {
    const { test } = await saveTrialTest(repos, {
      examId: ids.examId, lessonId: ids.lessonId, date: '2026-10-15', correct: 30, wrong: 8, empty: 2,
      wrongTopicIds: [ids.t1],
    });
    // User reviews topic A and marks it finished again.
    await repos.topics.setStatus([ids.t1], 'finished');

    const result = await saveTrialTest(
      repos,
      { examId: ids.examId, lessonId: ids.lessonId, date: '2026-10-15', correct: 31, wrong: 7, empty: 2, wrongTopicIds: [ids.t1, ids.t3] },
      test.id,
    );
    expect(result.markedForReview).toBe(1);
    expect(result.test.correct).toBe(31);
    expect(await statuses()).toEqual({ A: 'finished', B: 'not_started', C: 'needs_review' });
  });

  it('fails for a missing test without touching topics', async () => {
    await expect(
      saveTrialTest(
        repos,
        { examId: ids.examId, lessonId: ids.lessonId, date: '2026-10-15', correct: 1, wrong: 0, empty: 0, wrongTopicIds: [ids.t2] },
        'missing',
      ),
    ).rejects.toThrow();
    expect((await statuses()).B).toBe('not_started');
  });
});
