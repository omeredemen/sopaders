import { DEFAULT_TOPIC_STATUS_ID } from '@/config/topicStatuses';
import { cleanName } from '@/domain/importPlan';
import { byOrder, createRecord, isActive, nowIso, updateRecord } from '@/domain/records';
import type { Id, Topic } from '@/domain/types';
import type { ChangeEmitter } from '../changeEmitter';
import { NotFoundError, ValidationError, type TopicInput, type TopicRepository } from '../repositories';
import { CASCADE_TABLES, deleteTopicsCascade } from './cascade';
import type { StudyDatabase } from './db';
import { applyOrder, nextOrder } from './ordering';

function requireName(name: string): string {
  const cleaned = cleanName(name);
  if (!cleaned) throw new ValidationError('Topic name is required');
  return cleaned;
}

export class DexieTopicRepository implements TopicRepository {
  constructor(
    private readonly db: StudyDatabase,
    private readonly changes: ChangeEmitter,
  ) {}

  async listByLesson(lessonId: Id): Promise<Topic[]> {
    const topics = await this.db.topics.where('lessonId').equals(lessonId).filter(isActive).toArray();
    return topics.sort(byOrder);
  }

  async listByExam(examId: Id): Promise<Topic[]> {
    const lessonIds = await this.db.lessons.where('examId').equals(examId).filter(isActive).primaryKeys();
    const topics = await this.db.topics.where('lessonId').anyOf(lessonIds).filter(isActive).toArray();
    return topics.sort(byOrder);
  }

  async get(id: Id): Promise<Topic | undefined> {
    const topic = await this.db.topics.get(id);
    return topic && isActive(topic) ? topic : undefined;
  }

  async create(input: TopicInput): Promise<Topic> {
    const [topic] = await this.createMany([input]);
    return topic!;
  }

  async createMany(inputs: TopicInput[]): Promise<Topic[]> {
    if (inputs.length === 0) return [];
    const prepared = inputs.map((input) => ({ ...input, name: requireName(input.name) }));
    const created = await this.db.transaction('rw', this.db.topics, this.db.lessons, async () => {
      const nextOrderByLesson = new Map<Id, number>();
      const records: Topic[] = [];
      for (const input of prepared) {
        let order = nextOrderByLesson.get(input.lessonId);
        if (order === undefined) {
          const lesson = await this.db.lessons.get(input.lessonId);
          if (!lesson || !isActive(lesson)) throw new NotFoundError('Lesson', input.lessonId);
          order = nextOrder(await this.listByLesson(input.lessonId));
        }
        nextOrderByLesson.set(input.lessonId, order + 1);
        records.push(
          createRecord<Topic>({
            lessonId: input.lessonId,
            name: input.name,
            status: input.status ?? DEFAULT_TOPIC_STATUS_ID,
            order,
          }),
        );
      }
      await this.db.topics.bulkAdd(records);
      return records;
    });
    this.changes.emit('topics');
    return created;
  }

  async rename(id: Id, name: string): Promise<Topic> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError('Topic', id);
    const updated = updateRecord(existing, { name: requireName(name) });
    await this.db.topics.put(updated);
    this.changes.emit('topics');
    return updated;
  }

  async setStatus(ids: Id[], status: string): Promise<void> {
    if (ids.length === 0) return;
    const now = nowIso();
    await this.db.topics
      .where('id')
      .anyOf(ids)
      .filter((t) => isActive(t) && t.status !== status)
      .modify({ status, updatedAt: now });
    this.changes.emit('topics');
  }

  async reorder(lessonId: Id, orderedIds: Id[]): Promise<void> {
    await this.db.transaction('rw', this.db.topics, () => applyOrder(this.db.topics, 'lessonId', lessonId, orderedIds));
    this.changes.emit('topics');
  }

  async delete(id: Id): Promise<void> {
    await this.db.transaction('rw', CASCADE_TABLES(this.db), () => deleteTopicsCascade(this.db, [id], nowIso()));
    this.changes.emit('topics', 'trialTests');
  }
}
