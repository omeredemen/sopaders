import type { LocalDate } from '@/domain/types';
import { formatDate } from '@/shared/lib/format';

/** The one big number on the dashboard: days until the exam. */
export function CountdownHero({ daysToExam, examDate }: { daysToExam: number; examDate: LocalDate }) {
  let value: string;
  let caption: string;
  if (daysToExam > 0) {
    value = String(daysToExam);
    caption = 'gün kaldı';
  } else if (daysToExam === 0) {
    value = 'Bugün';
    caption = 'sınav günü, başarılar!';
  } else {
    value = String(-daysToExam);
    caption = 'gün önce sınav yapıldı';
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">Sınava kalan süre</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-5xl font-bold tracking-tight">{value}</span>
        <span className="text-lg text-slate-600 dark:text-slate-300">{caption}</span>
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(examDate)}</p>
    </section>
  );
}
