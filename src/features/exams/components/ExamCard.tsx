import { Link } from 'react-router';
import { daysLeft } from '@/domain/dates';
import type { Exam, LocalDate } from '@/domain/types';
import { Icon } from '@/shared/components/Icon';
import { formatDate, formatDaysLeft } from '@/shared/lib/format';

export function ExamCard({ exam, today }: { exam: Exam; today: LocalDate }) {
  const days = daysLeft(exam.examDate, today);
  return (
    <Link
      to={`/exams/${exam.id}`}
      className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{exam.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          <Icon name="calendar" className="h-4 w-4" />
          {formatDate(exam.examDate)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
          days < 0
            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            : 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-blue-300'
        }`}
      >
        {formatDaysLeft(days)}
      </span>
    </Link>
  );
}
