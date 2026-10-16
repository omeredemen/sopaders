import type { TopicImportPlan } from '@/domain/importPlan';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

/** Shows what an import will do before anything is saved. */
export function ImportPreview({ plan }: { plan: TopicImportPlan }) {
  const groups = new Map<string, { isNew: boolean; topics: string[] }>();
  for (const t of plan.topics) {
    const group = groups.get(t.lessonName) ?? { isNew: t.lessonId === null, topics: [] };
    group.topics.push(t.topicName);
    groups.set(t.lessonName, group);
  }
  const skipped = [
    ...plan.duplicates.map((r) => ({ ...r, reason: 'Zaten var' })),
    ...plan.skipped.map((r) => ({ ...r, reason: 'Ders atlandı' })),
    ...plan.invalid.map((r) => ({ ...r, reason: 'Eksik' })),
  ];

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat value={plan.topics.length} label="eklenecek konu" />
        <Stat value={plan.newLessons.length} label="yeni ders" />
        <Stat value={skipped.length} label="atlanacak satır" />
      </div>

      {groups.size > 0 && (
        <ul className="grid grid-cols-1 gap-3">
          {[...groups].map(([lessonName, group]) => (
            <li key={lessonName}>
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                {lessonName}
                {group.isNew && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-slate-800 dark:text-blue-300">
                    Yeni ders
                  </span>
                )}
                <span className="font-normal text-slate-500 dark:text-slate-400">· {group.topics.length} konu</span>
              </p>
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 text-sm dark:border-slate-700">
                {group.topics.map((topic, i) => (
                  <li key={i} className="border-b border-slate-100 px-3 py-1.5 last:border-0 dark:border-slate-800">
                    {topic}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {skipped.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-slate-600 dark:text-slate-300">Atlanan satırları göster ({skipped.length})</summary>
          <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
            {skipped.map((row, i) => (
              <li key={i} className="flex justify-between gap-3 border-b border-slate-100 px-3 py-1.5 last:border-0 dark:border-slate-800">
                <span className="min-w-0 truncate">
                  {row.lesson || '—'} / {row.topic || '—'}
                </span>
                <span className="shrink-0 text-slate-500 dark:text-slate-400">{row.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
