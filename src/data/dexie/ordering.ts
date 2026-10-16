import { nowIso } from '@/domain/records';
import type { Id } from '@/domain/types';
import type { Table } from 'dexie';

/** Next `order` value for a new child appended after existing siblings. */
export function nextOrder(siblings: { order: number }[]): number {
  return siblings.reduce((max, s) => Math.max(max, s.order), -1) + 1;
}

/**
 * Sets `order` = index in `orderedIds` for the given parent's active children.
 * Only records whose order actually changes get a new updatedAt.
 * Children missing from `orderedIds` keep their relative order, placed after the listed ones.
 */
export async function applyOrder<T extends { id: Id; order: number; deletedAt: string | null; updatedAt: string }>(
  table: Table<T, string>,
  parentField: string,
  parentId: Id,
  orderedIds: Id[],
): Promise<void> {
  const siblings = (await table.where(parentField).equals(parentId).toArray())
    .filter((s) => s.deletedAt === null)
    .sort((a, b) => a.order - b.order);
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  const sorted = [...siblings].sort(
    (a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity),
  );
  const now = nowIso();
  const changed = sorted
    .map((s, index) => (s.order === index ? null : { ...s, order: index, updatedAt: now }))
    .filter((s): s is T => s !== null);
  if (changed.length > 0) await table.bulkPut(changed);
}
