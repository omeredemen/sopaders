import { BACKUP_TABLES, mergeByUpdatedAt, restoreToBackup, type BackupData } from '@/domain/backup';
import { nowIso } from '@/domain/records';
import type { BaseRecord } from '@/domain/types';
import type { Table } from 'dexie';
import type { ChangeEmitter } from '../changeEmitter';
import type { BackupRepository, RestoreMode, RestoreSummary } from '../repositories';
import type { StudyDatabase } from './db';

export class DexieBackupRepository implements BackupRepository {
  constructor(
    private readonly db: StudyDatabase,
    private readonly changes: ChangeEmitter,
  ) {}

  private tables(): Record<keyof BackupData, Table<BaseRecord, string>> {
    const { exams, lessons, topics, trialTests, trialTestWrongTopics } = this.db;
    return { exams, lessons, topics, trialTests, trialTestWrongTopics } as unknown as Record<
      keyof BackupData,
      Table<BaseRecord, string>
    >;
  }

  async exportAll(): Promise<BackupData> {
    const tables = this.tables();
    return this.db.transaction('r', Object.values(tables), async () => {
      const entries = [];
      for (const name of BACKUP_TABLES) entries.push([name, await tables[name].toArray()] as const);
      return Object.fromEntries(entries) as unknown as BackupData;
    });
  }

  async restore(data: BackupData, mode: RestoreMode): Promise<RestoreSummary> {
    const tables = this.tables();
    const summary: RestoreSummary = { added: 0, updated: 0, unchanged: 0 };
    const now = nowIso();

    await this.db.transaction('rw', Object.values(tables), async () => {
      for (const name of BACKUP_TABLES) {
        const table = tables[name];
        const incoming = data[name] as BaseRecord[];
        if (mode === 'replace') {
          await table.clear();
          await table.bulkAdd(incoming);
          summary.added += incoming.length;
        } else if (mode === 'restore') {
          const restored = restoreToBackup(await table.toArray(), incoming, now);
          await table.bulkPut(restored.toWrite);
          summary.added += restored.added;
          summary.updated += restored.reverted;
          summary.unchanged += restored.identical;
        } else {
          const merged = mergeByUpdatedAt(await table.toArray(), incoming);
          await table.bulkPut(merged.toWrite);
          summary.added += merged.added;
          summary.updated += merged.updated;
          summary.unchanged += merged.unchanged;
        }
      }
    });

    this.changes.emit('exams', 'lessons', 'topics', 'trialTests');
    return summary;
  }
}
