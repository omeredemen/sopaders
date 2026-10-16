import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Small unit after the value, e.g. "konu/gün". */
  unit?: string;
  /** Secondary line under the value. */
  detail?: ReactNode;
}

/** Headline number card: label · value · detail. */
export function StatTile({ label, value, unit, detail }: StatTileProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">{unit}</span>}
      </p>
      {detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
}
