import type { BaseRecord, Exam, IsoDateTime, Lesson, Topic, TrialTest, TrialTestWrongTopic } from './types';

/** Internal identifier from the original name "study-tracker". Do NOT rename it: existing backup files would no longer be recognized. */
export const BACKUP_APP_ID = 'study-tracker';
/** Bump when the stored data shape changes; add a migration in parseBackupFile. */
export const BACKUP_SCHEMA_VERSION = 1;

export const BACKUP_TABLES = ['exams', 'lessons', 'topics', 'trialTests', 'trialTestWrongTopics'] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

/** All records, including soft-deleted ones (so deletions carry over when merging). */
export interface BackupData {
  exams: Exam[];
  lessons: Lesson[];
  topics: Topic[];
  trialTests: TrialTest[];
  trialTestWrongTopics: TrialTestWrongTopic[];
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: IsoDateTime;
  data: BackupData;
}

export function createBackupFile(data: BackupData, exportedAt: IsoDateTime): BackupFile {
  return { app: BACKUP_APP_ID, schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt, data };
}

// ---- Validation ------------------------------------------------------------

type FieldType = 'string' | 'number' | 'string|null';

const RECORD_FIELDS: Record<BackupTable, Record<string, FieldType>> = {
  exams: { name: 'string', examDate: 'string', studyDeadline: 'string|null', wrongPenalty: 'number' },
  lessons: { examId: 'string', name: 'string', order: 'number' },
  topics: { lessonId: 'string', name: 'string', status: 'string', order: 'number' },
  trialTests: {
    examId: 'string', lessonId: 'string', date: 'string', correct: 'number', wrong: 'number', empty: 'number', notes: 'string',
  },
  trialTestWrongTopics: { trialTestId: 'string', topicId: 'string' },
};

const BASE_FIELDS: Record<string, FieldType> = {
  id: 'string', createdAt: 'string', updatedAt: 'string', deletedAt: 'string|null',
};

function hasType(value: unknown, type: FieldType): boolean {
  if (type === 'string|null') return value === null || typeof value === 'string';
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

export type BackupError =
  | { code: 'invalid_json' }
  | { code: 'not_a_backup' }
  | { code: 'newer_version'; version: number }
  | { code: 'invalid_record'; table: BackupTable; index: number; field: string };

export type BackupParseResult = { ok: true; backup: BackupFile } | { ok: false; error: BackupError };

/** Parses and validates a backup file's text. Never throws. */
export function parseBackupFile(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: { code: 'invalid_json' } };
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: { code: 'not_a_backup' } };
  const file = raw as Record<string, unknown>;
  if (file.app !== BACKUP_APP_ID || typeof file.schemaVersion !== 'number' || typeof file.data !== 'object' || file.data === null) {
    return { ok: false, error: { code: 'not_a_backup' } };
  }
  if (file.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: { code: 'newer_version', version: file.schemaVersion } };
  }

  const data = file.data as Record<string, unknown>;
  for (const table of BACKUP_TABLES) {
    const records = data[table] ?? [];
    if (!Array.isArray(records)) return { ok: false, error: { code: 'invalid_record', table, index: -1, field: table } };
    const fields = { ...BASE_FIELDS, ...RECORD_FIELDS[table] };
    for (const [index, record] of records.entries()) {
      if (typeof record !== 'object' || record === null) {
        return { ok: false, error: { code: 'invalid_record', table, index, field: '*' } };
      }
      for (const [field, type] of Object.entries(fields)) {
        if (!hasType((record as Record<string, unknown>)[field], type)) {
          return { ok: false, error: { code: 'invalid_record', table, index, field } };
        }
      }
    }
  }

  const backupData = Object.fromEntries(BACKUP_TABLES.map((t) => [t, data[t] ?? []])) as unknown as BackupData;
  return {
    ok: true,
    backup: {
      app: BACKUP_APP_ID,
      schemaVersion: file.schemaVersion,
      exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
      data: backupData,
    },
  };
}

// ---- Merging ---------------------------------------------------------------

export interface MergeResult<T> {
  /** Incoming records that should be written (new, or newer than the local copy). */
  toWrite: T[];
  added: number;
  updated: number;
  unchanged: number;
}

/**
 * Last-write-wins merge by `updatedAt`. Soft deletes are just records with a
 * newer updatedAt, so deletions propagate too. Ties keep the local copy.
 */
export function mergeByUpdatedAt<T extends BaseRecord>(local: readonly T[], incoming: readonly T[]): MergeResult<T> {
  const localById = new Map(local.map((r) => [r.id, r]));
  const result: MergeResult<T> = { toWrite: [], added: 0, updated: 0, unchanged: 0 };
  for (const record of incoming) {
    const existing = localById.get(record.id);
    if (!existing) {
      result.toWrite.push(record);
      result.added++;
    } else if (record.updatedAt > existing.updatedAt) {
      result.toWrite.push(record);
      result.updated++;
    } else {
      result.unchanged++;
    }
  }
  return result;
}

/** Number of active (not deleted) records per table, for previews. */
export function countActiveRecords(data: BackupData): Record<BackupTable, number> {
  return Object.fromEntries(
    BACKUP_TABLES.map((t) => [t, (data[t] as BaseRecord[]).filter((r) => r.deletedAt === null).length]),
  ) as Record<BackupTable, number>;
}

export interface MergePreview {
  /** Records only in the backup: will be added. */
  added: number;
  /** Backup copy is newer: will overwrite the local one. */
  updated: number;
  /** Same version on both sides: nothing to do. */
  identical: number;
  /** Local copy was changed after the backup: the local version is kept. */
  newerHere: number;
  /** Deleted on this device after the backup (but present in it): stays deleted. */
  deletedHere: number;
}

/**
 * Dry run of a merge restore (same rule as mergeByUpdatedAt), with the reasons
 * records will be skipped, so the UI can explain the outcome before anything is written.
 */
export function previewMerge(local: BackupData, incoming: BackupData): MergePreview {
  const preview: MergePreview = { added: 0, updated: 0, identical: 0, newerHere: 0, deletedHere: 0 };
  for (const table of BACKUP_TABLES) {
    const localById = new Map((local[table] as BaseRecord[]).map((r) => [r.id, r]));
    for (const record of incoming[table] as BaseRecord[]) {
      const existing = localById.get(record.id);
      if (!existing) preview.added++;
      else if (record.updatedAt > existing.updatedAt) preview.updated++;
      else if (record.updatedAt === existing.updatedAt) preview.identical++;
      else if (existing.deletedAt !== null && record.deletedAt === null) preview.deletedHere++;
      else preview.newerHere++;
    }
  }
  return preview;
}
