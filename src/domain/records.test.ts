import { describe, expect, it } from 'vitest';
import { byOrder, createRecord, isActive, newId, softDelete, updateRecord } from './records';
import type { Lesson } from './types';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('records', () => {
  it('newId produces unique v4 UUIDs', () => {
    const ids = new Set(Array.from({ length: 1000 }, newId));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });

  it('createRecord fills id and timestamps', () => {
    const lesson = createRecord<Lesson>({ examId: 'e1', name: 'Tarih', order: 0 }, '2026-10-15T10:00:00.000Z');
    expect(lesson.id).toMatch(UUID_V4);
    expect(lesson.createdAt).toBe('2026-10-15T10:00:00.000Z');
    expect(lesson.updatedAt).toBe('2026-10-15T10:00:00.000Z');
    expect(lesson.deletedAt).toBeNull();
  });

  it('updateRecord bumps updatedAt only', () => {
    const lesson = createRecord<Lesson>({ examId: 'e1', name: 'Tarih', order: 0 }, '2026-10-15T10:00:00.000Z');
    const updated = updateRecord(lesson, { name: 'Tarih (Genel)' }, '2026-10-16T10:00:00.000Z');
    expect(updated.name).toBe('Tarih (Genel)');
    expect(updated.createdAt).toBe(lesson.createdAt);
    expect(updated.updatedAt).toBe('2026-10-16T10:00:00.000Z');
  });

  it('softDelete sets deletedAt and updatedAt', () => {
    const lesson = createRecord<Lesson>({ examId: 'e1', name: 'Tarih', order: 0 });
    const deleted = softDelete(lesson, '2026-10-16T10:00:00.000Z');
    expect(isActive(lesson)).toBe(true);
    expect(isActive(deleted)).toBe(false);
    expect(deleted.updatedAt).toBe('2026-10-16T10:00:00.000Z');
  });

  it('byOrder sorts by order, then createdAt', () => {
    const items = [
      { order: 1, createdAt: 'b' },
      { order: 0, createdAt: 'z' },
      { order: 1, createdAt: 'a' },
    ];
    expect([...items].sort(byOrder)).toEqual([
      { order: 0, createdAt: 'z' },
      { order: 1, createdAt: 'a' },
      { order: 1, createdAt: 'b' },
    ]);
  });
});
