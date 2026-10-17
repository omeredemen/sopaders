import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { newId } from '@/domain/records';
import { describeRepositoryContract } from '../repositoryContract';
import { createDexieRepositories } from '.';
import { StudyDatabase } from './db';

// Each test gets its own fresh in-memory database (fake-indexeddb, see src/test/setup.ts).
describeRepositoryContract('Dexie', () => createDexieRepositories(`test-${newId()}`));

describe('Dexie soft deletes', () => {
  it('keeps tombstones in the database for future sync', async () => {
    const dbName = `test-${newId()}`;
    const repos = createDexieRepositories(dbName);
    const exam = await repos.exams.create({ name: 'KPSS', examDate: '2026-12-01' });
    await repos.exams.delete(exam.id);
    const raw = await new StudyDatabase(dbName).exams.get(exam.id);
    expect(raw?.deletedAt).not.toBeNull();
    expect(raw?.updatedAt).toBe(raw?.deletedAt);
  });
});

describe('Dexie schema upgrades', () => {
  it('v3: gives existing exams empty trial question counts, keeping updatedAt', async () => {
    const dbName = `test-${newId()}`;
    const v1 = new Dexie(dbName);
    v1.version(1).stores({ exams: 'id, updatedAt' });
    const exam = {
      id: 'e1', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z', deletedAt: null,
      name: 'KPSS', examDate: '2026-12-01', studyDeadline: null, wrongPenalty: 4,
    };
    await v1.table('exams').add(exam);
    v1.close();
    expect(await new StudyDatabase(dbName).exams.get('e1')).toEqual({ ...exam, trialQuestionCounts: {} });
  });

  it('v2: turns one-lesson trial tests into tests with one lesson result, keeping updatedAt', async () => {
    const dbName = `test-${newId()}`;
    const v1 = new Dexie(dbName);
    v1.version(1).stores({ trialTests: 'id, examId, lessonId, updatedAt' });
    const base = { createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z', deletedAt: null };
    await v1.table('trialTests').add({
      ...base, id: 'tt1', examId: 'e1', lessonId: 'l1', date: '2026-10-05', correct: 30, wrong: 8, empty: 2, notes: 'x',
    });
    v1.close();

    expect(await new StudyDatabase(dbName).trialTests.get('tt1')).toEqual({
      ...base, id: 'tt1', examId: 'e1', name: '', date: '2026-10-05', notes: 'x',
      results: [{ lessonId: 'l1', correct: 30, wrong: 8, empty: 2 }],
    });
  });
});
