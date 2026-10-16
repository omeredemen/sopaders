/** Temporary content for pages that are built in a later phase. */
export function Placeholder({ phase, children }: { phase: number; children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <p>{children}</p>
      <p className="mt-1 text-xs">(Aşama {phase})</p>
    </div>
  );
}
