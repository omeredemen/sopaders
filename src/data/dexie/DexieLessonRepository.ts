import { cleanName } from '@/domain/importPlan';
import { byOrder, createRecord, isActive, nowIso, updateRecord } from '@/domain/records';
import type { Id, Lesson } from '@/domain/types';
import type { ChangeEmitter } from '../changeEmitter';
import { NotFoundError, ValidationError, type LessonInput, type LessonRepository } from '../repositories';
import { CASCADE_TABLES, deleteLessonsCascade } from './cascade';
import type { StudyDatabase } from './db';
import { applyOrder, nextOrder } from './ordering';

function requireName(name: string): string {
  const cleaned = cleanName(name);
  if (!cleaned) throw new ValidationError('Lesson name is required');
  return cleaned;
}

export class DexieLessonRepository implements LessonRepository {
  constructor(
    private readonly db: StudyDatabase,
    private readonly changes: ChangeEmitter,
  ) {}

  async listByExam(examId: Id): Promise<Lesson[]> {
    const lessons = await this.db.lessons.where('examId').equals(examId).filter(isActive).toArray();
    return lessons.sort(byOrder);
  }

  async get(id: Id): Promise<Lesson | undefined> {
    const lesson = await this.db.lessons.get(id);
    return lesson && isActive(lesson) ? lesson : undefined;
  }

  async create(input: LessonInput): Promise<Lesson> {
    const name = requireName(input.name);
    const lesson = await this.db.transaction('rw', this.db.lessons, this.db.exams, async () => {
      const exam = await this.db.exams.get(input.examId);
      if (!exam || !isActive(exam)) throw new NotFoundError('Exam', input.examId);
      const siblings = await this.listByExam(input.examId);
      const record = createRecord<Lesson>({ examId: input.examId, name, order: nextOrder(siblings) });
      await this.db.lessons.add(record);
      return record;
    });
    this.changes.emit('lessons');
    return lesson;
  }

  async rename(id: Id, name: string): Promise<Lesson> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError('Lesson', id);
    const updated = updateRecord(existing, { name: requireName(name) });
    await this.db.lessons.put(updated);
    this.changes.emit('lessons');
    return updated;
  }

  async reorder(examId: Id, orderedIds: Id[]): Promise<void> {
    await this.db.transaction('rw', this.db.lessons, () => applyOrder(this.db.lessons, 'examId', examId, orderedIds));
    this.changes.emit('lessons');
  }

  async delete(id: Id): Promise<void> {
    await this.db.transaction('rw', CASCADE_TABLES(this.db), () => deleteLessonsCascade(this.db, [id], nowIso()));
    this.changes.emit('lessons', 'topics', 'trialTests');
  }
}
