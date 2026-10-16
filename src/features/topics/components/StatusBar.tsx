import { getTopicStatus } from '@/domain/statuses';
import type { StatusSummary } from '@/domain/statusSummary';
import { formatPercent } from '@/shared/lib/format';

/**
 * Thin stacked bar of topic statuses (config order), with 2px gaps between segments.
 * The aria-label carries the numbers for screen readers; each segment has a hover title.
 * Pair it with StatusLegend (or a table) so values never depend on color or hover alone.
 */
export function StatusBar({ summary, className = 'h-1.5' }: { summary: StatusSummary; className?: string }) {
  const segments = summary.byStatus.filter((s) => s.count > 0);
  const describe = (s: (typeof segments)[number]) =>
    `${getTopicStatus(s.statusId).label}: ${s.count} (${formatPercent(s.percent)})`;
  const label = summary.total === 0 ? 'Konu yok' : segments.map(describe).join(', ');

  return (
    <div role="img" aria-label={label} className={`flex gap-0.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}>
      {segments.map((s) => (
        <div
          key={s.statusId}
          title={describe(s)}
          className="transition-opacity hover:opacity-80"
          style={{ flexGrow: s.count, backgroundColor: getTopicStatus(s.statusId).color }}
        />
      ))}
    </div>
  );
}

/** Legend for StatusBar: color dot, label, count and percentage for every status. */
export function StatusLegend({ summary }: { summary: StatusSummary }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
      {summary.byStatus.map((s) => {
        const status = getTopicStatus(s.statusId);
        return (
          <li key={s.statusId} className="flex items-start gap-2">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: status.color }} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm text-slate-600 dark:text-slate-300">{status.label}</p>
              <p className="text-base font-semibold">
                {s.count}{' '}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{formatPercent(s.percent)}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
