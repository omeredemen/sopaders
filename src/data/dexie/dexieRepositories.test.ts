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
