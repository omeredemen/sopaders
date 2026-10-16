import { describe, expect, it } from 'vitest';
import {
  countActiveRecords,
  createBackupFile,
  mergeByUpdatedAt,
  parseBackupFile,
  previewMerge,
  previewRestore,
  restoreToBackup,
  type BackupData,
} from './backup';

const base = (id: string, updatedAt = '2026-10-01T00:00:00.000Z', deletedAt: string | null = null) => ({
  id,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt,
  deletedAt,
});

const sampleData = (): BackupData => ({
  exams: [{ ...base('e1'), name: 'KPSS', examDate: '2026-12-06', studyDeadline: null, wrongPenalty: 4 }],
  lessons: [{ ...base('l1'), examId: 'e1', name: 'Türkçe', order: 0 }],
  topics: [
    { ...base('t1'), lessonId: 'l1', name: 'Paragraf', status: 'finished', order: 0 },
    { ...base('t2', '2026-10-02T00:00:00.000Z', '2026-10-02T00:00:00.000Z'), lessonId: 'l1', name: 'Eski', status: 'started', order: 1 },
  ],
  trialTests: [{ ...base('tt1'), examId: 'e1', lessonId: 'l1', date: '2026-10-05', correct: 30, wrong: 8, empty: 2, notes: '' }],
  trialTestWrongTopics: [{ ...base('w1'), trialTestId: 'tt1', topicId: 't1' }],
});

describe('parseBackupFile', () => {
  it('round-trips a created backup', () => {
    const file = createBackupFile(sampleData(), '2026-10-15T12:00:00.000Z');
    const result = parseBackupFile(JSON.stringify(file));
    expect(result).toEqual({ ok: true, backup: file });
  });

  it('rejects invalid JSON and foreign files', () => {
    expect(parseBackupFile('{oops')).toEqual({ ok: false, error: { code: 'invalid_json' } });
    expect(parseBackupFile('[]')).toEqual({ ok: false, error: { code: 'not_a_backup' } });
    expect(parseBackupFile('{"app":"other","schemaVersion":1,"data":{}}')).toEqual({ ok: false, error: { code: 'not_a_backup' } });
  });

  it('rejects backups from a newer app version', () => {
    const text = JSON.stringify({ app: 'study-tracker', schemaVersion: 99, data: {} });
    expect(parseBackupFile(text)).toEqual({ ok: false, error: { code: 'newer_version', version: 99 } });
  });

  it('reports the first invalid record', () => {
    const data = sampleData();
    (data.topics[1] as unknown as Record<string, unknown>).order = 'x';
    const result = parseBackupFile(JSON.stringify(createBackupFile(data, '')));
    expect(result).toEqual({ ok: false, error: { code: 'invalid_record', table: 'topics', index: 1, field: 'order' } });
  });

  it('treats missing tables as empty', () => {
    const result = parseBackupFile(JSON.stringify({ app: 'study-tracker', schemaVersion: 1, exportedAt: 'x', data: { exams: [] } }));
    expect(result.ok && result.backup.data.trialTests).toEqual([]);
  });
});

describe('mergeByUpdatedAt', () => {
  it('adds new records, updates newer ones and keeps local on older or equal', () => {
    const local = [base('a', '2026-10-05T00:00:00.000Z'), base('b', '2026-10-05T00:00:00.000Z'), base('c', '2026-10-05T00:00:00.000Z')];
    const incoming = [
      base('a', '2026-10-06T00:00:00.000Z'), // newer → update
      base('b', '2026-10-04T00:00:00.000Z'), // older → keep local
      base('c', '2026-10-05T00:00:00.000Z'), // equal → keep local
      base('d'), // new → add
    ];
    const result = mergeByUpdatedAt(local, incoming);
    expect(result.toWrite.map((r) => r.id)).toEqual(['a', 'd']);
    expect([result.added, result.updated, result.unchanged]).toEqual([1, 1, 2]);
  });

  it('propagates a newer deletion', () => {
    const result = mergeByUpdatedAt([base('a')], [base('a', '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z')]);
    expect(result.toWrite[0]?.deletedAt).toBe('2026-10-09T00:00:00.000Z');
  });
});

describe('countActiveRecords', () => {
  it('ignores soft-deleted records', () => {
    expect(countActiveRecords(sampleData())).toEqual({ exams: 1, lessons: 1, topics: 1, trialTests: 1, trialTestWrongTopics: 1 });
  });
});

describe('previewMerge', () => {
  it('reports nothing to do when restoring a backup of the same, unchanged device', () => {
    expect(previewMerge(sampleData(), sampleData())).toEqual({ added: 0, updated: 0, identical: 6, newerHere: 0, deletedHere: 0 });
  });

  it('explains why records are skipped: changed or deleted here after the backup', () => {
    const backup = sampleData();
    const local = sampleData();
    local.lessons[0] = { ...local.lessons[0]!, name: 'Türkçe (yeni)', updatedAt: '2026-10-09T00:00:00.000Z' };
    local.exams[0] = { ...local.exams[0]!, deletedAt: '2026-10-09T00:00:00.000Z', updatedAt: '2026-10-09T00:00:00.000Z' };
    expect(previewMerge(local, backup)).toEqual({ added: 0, updated: 0, identical: 4, newerHere: 1, deletedHere: 1 });
  });

  it('counts new and newer records from another device', () => {
    const local = sampleData();
    const backup = sampleData();
    backup.topics[0] = { ...backup.topics[0]!, status: 'needs_review', updatedAt: '2026-10-09T00:00:00.000Z' };
    backup.lessons.push({ ...backup.lessons[0]!, id: 'l2', name: 'Tarih' });
    expect(previewMerge(local, backup)).toEqual({ added: 1, updated: 1, identical: 5, newerHere: 0, deletedHere: 0 });
  });
});

describe('restoreToBackup', () => {
  const NOW = '2026-10-20T00:00:00.000Z';

  it('brings back deleted records, undoes edits, adds missing ones and stamps them as the newest change', () => {
    const local = [
      base('deleted-here', '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z'),
      base('edited-here', '2026-10-09T00:00:00.000Z'),
      base('same'),
      base('added-here', '2026-10-09T00:00:00.000Z'),
    ];
    const backup = [base('deleted-here'), base('edited-here'), base('same'), base('only-in-backup')];
    const result = restoreToBackup(local, backup, NOW);

    expect(result.toWrite.map((r) => [r.id, r.updatedAt, r.deletedAt])).toEqual([
      ['deleted-here', NOW, null],
      ['edited-here', NOW, null],
      ['only-in-backup', '2026-10-01T00:00:00.000Z', null],
    ]);
    expect([result.added, result.reverted, result.identical]).toEqual([1, 2, 1]);
  });
});

describe('previewRestore', () => {
  it('explains what going back to the backup will do', () => {
    const backup = sampleData();
    const local = sampleData();
    // Deleted here after the backup (exam), edited here (lesson), and a new topic added here.
    local.exams[0] = { ...local.exams[0]!, deletedAt: '2026-10-09T00:00:00.000Z', updatedAt: '2026-10-09T00:00:00.000Z' };
    local.lessons[0] = { ...local.lessons[0]!, name: 'Edited', updatedAt: '2026-10-09T00:00:00.000Z' };
    local.topics.push({ ...local.topics[0]!, id: 't-new', name: 'New here' });
    expect(previewRestore(local, backup)).toEqual({ added: 0, revived: 1, reverted: 1, identical: 4, keptHere: 1 });
  });
});
