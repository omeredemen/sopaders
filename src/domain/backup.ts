import type { BaseRecord, Exam, IsoDateTime, Lesson, Topic, TrialTest, TrialTestWrongTopic } from './types';

/** Internal identifier from the original name "study-tracker". Do NOT rename it: existing backup files would no longer be recognized. */
export const BACKUP_APP_ID = 'study-tracker';
/** Bump when the stored data shape changes; add a migration in parseBackupFile. */
export const BACKUP_SCHEMA_VERSION = 3;
// History: 1 → 2: a trial test covers the whole exam (`results` per lesson, `name`)
// instead of one lesson (`lessonId`, `correct`, `wrong`, `empty`). See migrateTrialTestV1.
// 2 → 3: exams have `trialQuestionCounts` (defaults to {}). See migrateExamV2.

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

// ---- Migrations ------------------------------------------------------------

/**
 * Schema 1 trial test (one lesson per test) → schema 2 (one result per lesson).
 * Keeps updatedAt: the content is the same, so merging must not see it as a newer edit.
 * Used for old backup files and by the IndexedDB upgrade.
 */
export function migrateTrialTestV1(old: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(old.results)) return old;
  const { lessonId, correct, wrong, empty, ...rest } = old;
  return { ...rest, name: typeof old.name === 'string' ? old.name : '', results: [{ lessonId, correct, wrong, empty }] };
}

/** Schema 2 exam → schema 3: adds empty `trialQuestionCounts`. Keeps updatedAt (same reason as above). */
export function migrateExamV2(old: Record<string, unknown>): Record<string, unknown> {
  return isCountMap(old.trialQuestionCounts) ? old : { ...old, trialQuestionCounts: {} };
}

// ---- Validation ------------------------------------------------------------

type FieldType = 'string' | 'number' | 'string|null' | 'results' | 'countMap';

const RECORD_FIELDS: Record<BackupTable, Record<string, FieldType>> = {
  exams: { name: 'string', examDate: 'string', studyDeadline: 'string|null', wrongPenalty: 'number', trialQuestionCounts: 'countMap' },
  lessons: { examId: 'string', name: 'string', order: 'number' },
  topics: { lessonId: 'string', name: 'string', status: 'string', order: 'number' },
  trialTests: { examId: 'string', name: 'string', date: 'string', results: 'results', notes: 'string' },
  trialTestWrongTopics: { trialTestId: 'string', topicId: 'string' },
};

const BASE_FIELDS: Record<string, FieldType> = {
  id: 'string', createdAt: 'string', updatedAt: 'string', deletedAt: 'string|null',
};

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

/** An exam's `trialQuestionCounts`: { lessonId: number }. */
function isCountMap(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(isFiniteNumber);
}

/** A trial test's `results`: [{ lessonId, correct, wrong, empty }, …]. */
function isResultList(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((r: unknown) => {
      if (typeof r !== 'object' || r === null) return false;
      const { lessonId, correct, wrong, empty } = r as Record<string, unknown>;
      return typeof lessonId === 'string' && [correct, wrong, empty].every(isFiniteNumber);
    })
  );
}

function hasType(value: unknown, type: FieldType): boolean {
  if (type === 'string|null') return value === null || typeof value === 'string';
  if (type === 'number') return isFiniteNumber(value);
  if (type === 'results') return isResultList(value);
  if (type === 'countMap') return isCountMap(value);
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

  const data = { ...(file.data as Record<string, unknown>) };
  if (file.schemaVersion < 2 && Array.isArray(data.trialTests)) {
    data.trialTests = data.trialTests.map((t: unknown) =>
      typeof t === 'object' && t !== null ? migrateTrialTestV1(t as Record<string, unknown>) : t,
    );
  }
  if (file.schemaVersion < 3 && Array.isArray(data.exams)) {
    data.exams = data.exams.map((e: unknown) => (typeof e === 'object' && e !== null ? migrateExamV2(e as Record<string, unknown>) : e));
  }
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

export interface RestoreResult<T> {
  toWrite: T[];
  /** Only in the backup: added. */
  added: number;
  /** Present here in a different version (edited or deleted since): set back to the backup's version. */
  reverted: number;
  /** Same version on both sides. */
  identical: number;
}

/**
 * "Back to the backup" restore: every record in the backup gets the backup's version
 * (deleted ones come back, edits are undone); records created here after the backup are
 * not touched. Reverted records get updatedAt = `now`, so the restore counts as the newest
 * change and a later merge or sync won't undo it.
 */
export function restoreToBackup<T extends BaseRecord>(local: readonly T[], incoming: readonly T[], now: IsoDateTime): RestoreResult<T> {
  const localById = new Map(local.map((r) => [r.id, r]));
  const result: RestoreResult<T> = { toWrite: [], added: 0, reverted: 0, identical: 0 };
  for (const record of incoming) {
    const existing = localById.get(record.id);
    if (!existing) {
      result.toWrite.push(record);
      result.added++;
    } else if (existing.updatedAt === record.updatedAt) {
      result.identical++;
    } else {
      result.toWrite.push({ ...record, updatedAt: now });
      result.reverted++;
    }
  }
  return result;
}

export interface RestorePreview {
  added: number;
  /** Deleted here since the backup: will come back. */
  revived: number;
  /** Edited here since the backup (or deleted in the backup): will be set back. */
  reverted: number;
  identical: number;
  /** Active records that exist only here (added after the backup): kept as they are. */
  keptHere: number;
}

/** Dry run of restoreToBackup across all tables, for the restore UI. */
export function previewRestore(local: BackupData, incoming: BackupData): RestorePreview {
  const preview: RestorePreview = { added: 0, revived: 0, reverted: 0, identical: 0, keptHere: 0 };
  for (const table of BACKUP_TABLES) {
    const incomingRecords = incoming[table] as BaseRecord[];
    const incomingIds = new Set(incomingRecords.map((r) => r.id));
    const localById = new Map((local[table] as BaseRecord[]).map((r) => [r.id, r]));
    for (const record of incomingRecords) {
      const existing = localById.get(record.id);
      if (!existing) preview.added++;
      else if (existing.updatedAt === record.updatedAt) preview.identical++;
      else if (existing.deletedAt !== null && record.deletedAt === null) preview.revived++;
      else preview.reverted++;
    }
    for (const record of localById.values()) {
      if (!incomingIds.has(record.id) && record.deletedAt === null) preview.keptHere++;
    }
  }
  return preview;
}
