import { useState, type ChangeEvent } from 'react';
import { useRepositories } from '@/data/RepositoryProvider';
import type { RestoreMode } from '@/data/repositories';
import {
  countActiveRecords,
  createBackupFile,
  parseBackupFile,
  previewMerge,
  type BackupData,
  type BackupError,
  type BackupFile,
  type MergePreview,
} from '@/domain/backup';
import { todayLocalDate } from '@/domain/dates';
import { nowIso } from '@/domain/records';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useToast } from '@/shared/components/Toast';
import { useAction } from '@/shared/hooks/useAction';
import { downloadFile } from '@/shared/lib/download';
import { formatDateTime } from '@/shared/lib/format';

const TABLE_LABELS = { exams: 'sınav', lessons: 'ders', topics: 'konu', trialTests: 'deneme' } as const;

function describeCounts(data: BackupData): string {
  const counts = countActiveRecords(data);
  return (Object.keys(TABLE_LABELS) as (keyof typeof TABLE_LABELS)[]).map((t) => `${counts[t]} ${TABLE_LABELS[t]}`).join(' · ');
}

/** Explains, before anything is written, what a merge restore will do. */
function MergeOutcome({ preview }: { preview: MergePreview }) {
  const changes = preview.added + preview.updated;
  const keptHere = preview.newerHere + preview.deletedHere;
  if (changes > 0) {
    return (
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
        Birleştirince <strong>{preview.added}</strong> yeni kayıt eklenir, <strong>{preview.updated}</strong> kayıt güncellenir.
        {keptHere > 0 && ` ${keptHere} kayıt bu cihazda daha yeni olduğu için olduğu gibi kalır.`}
      </p>
    );
  }
  return (
    <div role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <p className="font-medium">Birleştirme hiçbir şeyi değiştirmez.</p>
      <ul className="mt-1 list-disc pl-5">
        {keptHere === 0 && <li>Yedekteki her şey bu cihazda zaten aynen var (yedek büyük ihtimalle bu cihazdan alındı).</li>}
        {preview.deletedHere > 0 && (
          <li>{preview.deletedHere} kayıt yedekten sonra bu cihazda silinmiş. Birleştirme silinenleri geri getirmez.</li>
        )}
        {preview.newerHere > 0 && (
          <li>{preview.newerHere} kayıt yedekten sonra bu cihazda değiştirilmiş. Buradaki son hali korunur.</li>
        )}
      </ul>
      <p className="mt-1">
        Yedekteki hali geri istiyorsan <strong>“Tümünü değiştir”</strong>i seç.
      </p>
    </div>
  );
}

function errorMessage(error: BackupError): string {
  switch (error.code) {
    case 'invalid_json':
      return 'Dosya okunamadı: geçerli bir JSON dosyası değil.';
    case 'not_a_backup':
      return 'Bu dosya bir sopaders yedeği değil.';
    case 'newer_version':
      return 'Bu yedek uygulamanın daha yeni bir sürümüyle alınmış. Önce uygulamayı güncelleyin.';
    case 'invalid_record':
      return `Yedek dosyası bozuk (${error.table}, kayıt ${error.index + 1}, alan "${error.field}").`;
  }
}

/** Export all data to a JSON file, and restore from one (merge or replace). */
export function BackupSection() {
  const repos = useRepositories();
  const run = useAction();
  const toast = useToast();
  const [pending, setPending] = useState<{ backup: BackupFile; fileName: string; local: BackupData; preview: MergePreview } | null>(null);
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [error, setError] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);

  const exportBackup = () =>
    run(async () => {
      const data = await repos.backup.exportAll();
      const json = JSON.stringify(createBackupFile(data, nowIso()), null, 2);
      downloadFile(json, `sopaders-yedek-${todayLocalDate()}.json`, 'application/json');
    }, 'Yedek indirildi');

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setPending(null);
    const result = parseBackupFile(await file.text());
    if (!result.ok) {
      setError(errorMessage(result.error));
      return;
    }
    // Dry run against the current data so the outcome is shown before restoring.
    const local = await run(() => repos.backup.exportAll());
    if (!local) return;
    setPending({ backup: result.backup, fileName: file.name, local, preview: previewMerge(local, result.backup.data) });
    setMode('merge');
  };

  const restore = async () => {
    if (!pending) return;
    setConfirmReplace(false);
    setBusy(true);
    const summary = await run(() => repos.backup.restore(pending.backup.data, mode));
    setBusy(false);
    if (!summary) return;
    setPending(null);
    toast(
      mode === 'replace'
        ? 'Veriler yedekle değiştirildi'
        : `Birleştirildi: ${summary.added} yeni, ${summary.updated} güncellenen kayıt`,
    );
  };

  const nothingToMerge = pending !== null && pending.preview.added + pending.preview.updated === 0;

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="mb-1 font-semibold">Yedekleme</h2>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
        Verilerini bir JSON dosyasına indir ve diğer cihazda geri yükle (ör. telefondan bilgisayara).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportBackup}>Yedeği indir</Button>
        <label className="inline-flex h-11 cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50 focus-within:ring-2 focus-within:ring-brand-600/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
          Yedekten geri yükle…
          <input type="file" accept=".json,application/json" onChange={onFile} className="sr-only" />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {pending && (
        <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-sm font-medium">{pending.fileName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pending.backup.exportedAt ? `Oluşturulma: ${formatDateTime(pending.backup.exportedAt)}` : 'Tarih bilgisi yok'}
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">Yedekte</dt>
            <dd>{describeCounts(pending.backup.data)}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Bu cihazda</dt>
            <dd>{describeCounts(pending.local)}</dd>
          </dl>

          <fieldset className="mt-3 grid gap-2">
            <legend className="mb-1 text-sm font-medium">Nasıl geri yüklensin?</legend>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="restore-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} className="mt-1" />
              <span>
                <strong>Birleştir</strong> (önerilen). Her kaydın en son değiştirilen hali kalır, bu cihazdaki yeni veriler silinmez.
                Yedekten sonra burada sildiğin kayıtlar silinmiş kalır.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="restore-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-1" />
              <span>
                <strong>Tümünü değiştir.</strong> Bu cihazdaki tüm veriler silinir, yerine yedek yüklenir.
              </span>
            </label>
          </fieldset>

          {mode === 'merge' ? (
            <MergeOutcome preview={pending.preview} />
          ) : (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              Bu cihazdaki veriler ({describeCounts(pending.local)}) silinir, yerine yedektekiler yüklenir.
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPending(null)}>
              Vazgeç
            </Button>
            <Button
              variant={mode === 'replace' ? 'danger' : 'primary'}
              disabled={busy || (mode === 'merge' && nothingToMerge)}
              onClick={() => (mode === 'replace' ? setConfirmReplace(true) : restore())}
            >
              {mode === 'merge' && nothingToMerge ? 'Değişecek bir şey yok' : 'Geri yükle'}
            </Button>
          </div>
        </div>
      )}

      {confirmReplace && (
        <ConfirmDialog
          title="Tüm veriler değiştirilsin mi?"
          message="Bu cihazdaki tüm sınavlar, dersler, konular ve denemeler silinip yedektekilerle değiştirilecek. Bu işlem geri alınamaz."
          confirmLabel="Değiştir"
          onCancel={() => setConfirmReplace(false)}
          onConfirm={restore}
        />
      )}
    </section>
  );
}
