import { isLocalDate } from '@/domain/dates';
import { cleanName } from '@/domain/importPlan';
import { createRecord, isActive, nowIso, softDelete, updateRecord } from '@/domain/records';
import { validateTrialResults } from '@/domain/trials';
import type { Id, TrialTest, TrialTestWrongTopic } from '@/domain/types';
import type { ChangeEmitter } from '../changeEmitter';
import {
  NotFoundError,
  ValidationError,
  type TrialTestInput,
  type TrialTestPatch,
  type TrialTestRepository,
  type TrialTestWithTopics,
} from '../repositories';
import { CASCADE_TABLES, deleteTrialTestsCascade } from './cascade';
import type { StudyDatabase } from './db';

function assertValid(test: Pick<TrialTest, 'date' | 'results'>) {
  if (!isLocalDate(test.date)) throw new ValidationError(`Invalid trial test date: ${test.date}`);
  const error = validateTrialResults(test.results);
  if (error) throw new ValidationError(`Invalid trial test results: ${JSON.stringify(error)}`);
}

export class DexieTrialTestRepository implements TrialTestRepository {
  constructor(
    private readonly db: StudyDatabase,
    private readonly changes: ChangeEmitter,
  ) {}

  private async withTopics(tests: TrialTest[]): Promise<TrialTestWithTopics[]> {
    const links = await this.db.trialTestWrongTopics
      .where('trialTestId')
      .anyOf(tests.map((t) => t.id))
      .filter(isActive)
      .toArray();
    const byTest = new Map<Id, Id[]>();
    for (const link of links) {
      byTest.set(link.trialTestId, [...(byTest.get(link.trialTestId) ?? []), link.topicId]);
    }
    return tests.map((t) => ({ ...t, wrongTopicIds: byTest.get(t.id) ?? [] }));
  }

  /** Makes the active wrong-topic links for a test exactly `topicIds`. */
  private async syncWrongTopics(trialTestId: Id, topicIds: Id[]) {
    const wanted = new Set(topicIds);
    const existing = await this.db.trialTestWrongTopics.where('trialTestId').equals(trialTestId).filter(isActive).toArray();
    const now = nowIso();
    const removed = existing.filter((l) => !wanted.has(l.topicId)).map((l) => softDelete(l, now));
    const kept = new Set(existing.map((l) => l.topicId));
    const added = [...wanted]
      .filter((topicId) => !kept.has(topicId))
      .map((topicId) => createRecord<TrialTestWrongTopic>({ trialTestId, topicId }, now));
    await this.db.trialTestWrongTopics.bulkPut([...removed, ...added]);
  }

  async listByExam(examId: Id): Promise<TrialTestWithTopics[]> {
    const tests = await this.db.trialTests.where('examId').equals(examId).filter(isActive).toArray();
    tests.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    return this.withTopics(tests);
  }

  async get(id: Id): Promise<TrialTestWithTopics | undefined> {
    const test = await this.db.trialTests.get(id);
    if (!test || !isActive(test)) return undefined;
    const [result] = await this.withTopics([test]);
    return result;
  }

  async create(input: TrialTestInput): Promise<TrialTestWithTopics> {
    const { wrongTopicIds = [], notes = '', name = '', ...fields } = input;
    const test = createRecord<TrialTest>({ ...fields, name: cleanName(name), notes });
    assertValid(test);
    await this.db.transaction('rw', this.db.trialTests, this.db.trialTestWrongTopics, async () => {
      await this.db.trialTests.add(test);
      await this.syncWrongTopics(test.id, wrongTopicIds);
    });
    this.changes.emit('trialTests');
    return { ...test, wrongTopicIds: [...new Set(wrongTopicIds)] };
  }

  async update(id: Id, patch: TrialTestPatch): Promise<TrialTestWithTopics> {
    const { wrongTopicIds, ...fields } = patch;
    if (fields.name !== undefined) fields.name = cleanName(fields.name);
    await this.db.transaction('rw', this.db.trialTests, this.db.trialTestWrongTopics, async () => {
      const existing = await this.db.trialTests.get(id);
      if (!existing || !isActive(existing)) throw new NotFoundError('TrialTest', id);
      const updated = updateRecord(existing, fields);
      assertValid(updated);
      await this.db.trialTests.put(updated);
      if (wrongTopicIds) await this.syncWrongTopics(id, wrongTopicIds);
    });
    this.changes.emit('trialTests');
    return (await this.get(id))!;
  }

  async delete(id: Id): Promise<void> {
    await this.db.transaction('rw', CASCADE_TABLES(this.db), () => deleteTrialTestsCascade(this.db, [id], nowIso()));
    this.changes.emit('trialTests');
  }
}
