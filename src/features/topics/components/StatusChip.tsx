import { getTopicStatus } from '@/domain/statuses';

/** Status label with its color dot. The label is always shown, so color is never the only cue. */
export function StatusChip({ status }: { status: string }) {
  const config = getTopicStatus(status);
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.color }} aria-hidden />
      {config.label}
    </span>
  );
}
