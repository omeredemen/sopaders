import type { BaseRecord, IsoDateTime, NewRecord } from './types';

/**
 * RFC 4122 v4 UUID. Uses crypto.getRandomValues rather than crypto.randomUUID,
 * because randomUUID is unavailable on plain-http origins (e.g. testing on a
 * phone via the dev server's LAN address).
 */
export function newId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function nowIso(): IsoDateTime {
  return new Date().toISOString();
}

/** Creates a full record with a new id and fresh timestamps. */
export function createRecord<T extends BaseRecord>(fields: NewRecord<T>, now: IsoDateTime = nowIso()): T {
  return { ...fields, id: newId(), createdAt: now, updatedAt: now, deletedAt: null } as T;
}

/** Returns a copy with the patch applied and updatedAt bumped. */
export function updateRecord<T extends BaseRecord>(
  record: T,
  patch: Partial<NewRecord<T>>,
  now: IsoDateTime = nowIso(),
): T {
  return { ...record, ...patch, updatedAt: now };
}

/** Returns a soft-deleted copy (tombstone). */
export function softDelete<T extends BaseRecord>(record: T, now: IsoDateTime = nowIso()): T {
  return { ...record, deletedAt: now, updatedAt: now };
}

export function isActive(record: BaseRecord): boolean {
  return record.deletedAt === null;
}

/** Sorts records by their `order` field, then by creation time for stability. */
export function byOrder<T extends { order: number; createdAt: IsoDateTime }>(a: T, b: T): number {
  return a.order - b.order || a.createdAt.localeCompare(b.createdAt);
}
