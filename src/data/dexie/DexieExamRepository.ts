import { todayLocalDate } from '@/domain/dates';
import { validateExam, type ExamFields } from '@/domain/exam';
import { cleanName } from '@/domain/importPlan';
import { DEFAULT_WRONG_PENALTY } from '@/domain/net';
import { createRecord, isActive, nowIso, updateRecord } from '@/domain/records';
import { findInvalidQuestionCount } from '@/domain/trials';
import type { Exam, Id } from '@/domain/types';
import type { ChangeEmitter } from '../changeEmitter';
import {
  NotFoundError,
  ValidationError,
  type ExamInput,
  type ExamPatch,
  type ExamRepository,
} from '../repositories';
import { CASCADE_TABLES, deleteExamCascade } from './cascade';
import type { StudyDatabase } from './db';

function assertValid(fields: ExamFields & Pick<Exam, 'trialQuestionCounts'>) {
  const errors = validateExam(fields);
  const entries = Object.entries(errors);
  if (entries.length > 0) {
    throw new ValidationError(`Invalid exam: ${entries.map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
  const badLesson = findInvalidQuestionCount(fields.trialQuestionCounts);
  if (badLesson) throw new ValidationError(`Invalid question count for lesson ${badLesson}`);
}

export class DexieExamRepository implements ExamRepository {
  constructor(
    private readonly db: StudyDatabase,
    private readonly changes: ChangeEmitter,
  ) {}

  async list(): Promise<Exam[]> {
    const exams = await this.db.exams.filter(isActive).toArray();
    return exams.sort((a, b) => a.examDate.localeCompare(b.examDate) || a.createdAt.localeCompare(b.createdAt));
  }

  async get(id: Id): Promise<Exam | undefined> {
    const exam = await this.db.exams.get(id);
    return exam && isActive(exam) ? exam : undefined;
  }

  async create(input: ExamInput): Promise<Exam> {
    const fields = {
      name: cleanName(input.name),
      examDate: input.examDate,
      studyStartDate: input.studyStartDate ?? todayLocalDate(),
      studyDeadline: input.studyDeadline ?? null,
      wrongPenalty: input.wrongPenalty ?? DEFAULT_WRONG_PENALTY,
      trialQuestionCounts: input.trialQuestionCounts ?? {},
    };
    assertValid(fields);
    const exam = createRecord<Exam>(fields);
    await this.db.exams.add(exam);
    this.changes.emit('exams');
    return exam;
  }

  async update(id: Id, patch: ExamPatch): Promise<Exam> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError('Exam', id);
    const cleanPatch = { ...patch, ...(patch.name !== undefined && { name: cleanName(patch.name) }) };
    const updated = updateRecord(existing, cleanPatch);
    assertValid(updated);
    await this.db.exams.put(updated);
    this.changes.emit('exams');
    return updated;
  }

  async delete(id: Id): Promise<void> {
    await this.db.transaction('rw', CASCADE_TABLES(this.db), () => deleteExamCascade(this.db, id, nowIso()));
    this.changes.emit('exams', 'lessons', 'topics', 'trialTests');
  }
}
