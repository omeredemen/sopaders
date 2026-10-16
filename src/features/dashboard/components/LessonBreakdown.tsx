import { useState } from 'react';
import { TOPIC_STATUSES } from '@/config/topicStatuses';
import type { LessonStatusSummary } from '@/domain/statusSummary';
import { StatusBar } from '@/features/topics/components/StatusBar';
import { Button } from '@/shared/components/Button';
import { formatPercent } from '@/shared/lib/format';

/** Per-lesson status bars, with a table view that shows every number. */
export function LessonBreakdown({ lessons }: { lessons: LessonStatusSummary[] }) {
  const [asTable, setAsTable] = useState(false);

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Derslere göre</h2>
        <Button variant="ghost" size="sm" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? 'Grafik' : 'Tablo'}
        </Button>
      </div>

      {asTable ? (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 pr-3 font-medium">Ders</th>
                {TOPIC_STATUSES.map((s) => (
                  <th key={s.id} className="px-2 py-2 text-right font-medium whitespace-nowrap">
                    {s.label}
                  </th>
                ))}
                <th className="py-2 pl-2 text-right font-medium">Toplam</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {lessons.map((l) => (
                <tr key={l.lessonId} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <th scope="row" className="py-2 pr-3 text-left font-medium">
                    {l.lessonName}
                  </th>
                  {l.summary.byStatus.map((s) => (
                    <td key={s.statusId} className="px-2 py-2 text-right">
                      {s.count}
                    </td>
                  ))}
                  <td className="py-2 pl-2 text-right font-medium">{l.summary.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid gap-4">
          {lessons.map((l) => (
            <li key={l.lessonId}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{l.lessonName}</span>
                <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                  {l.summary.done}/{l.summary.total}
                  {l.summary.total > 0 && ` · ${formatPercent(l.summary.donePercent)}`}
                </span>
              </div>
              <StatusBar summary={l.summary} className="h-2.5" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
