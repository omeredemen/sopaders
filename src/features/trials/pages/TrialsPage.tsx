import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { calculateNet } from '@/domain/net';
import { ExamSwitcher } from '@/features/exams/components/ExamSwitcher';
import { useRememberActiveExam } from '@/features/exams/hooks/useActiveExam';
import { useExam } from '@/features/exams/hooks/useExams';
import { useLessons } from '@/features/lessons/hooks/useLessons';
import { EmptyState, Loading } from '@/shared/components/EmptyState';
import { Icon } from '@/shared/components/Icon';
import { PageHeader } from '@/shared/components/PageHeader';
import { formatNet, formatShortDate } from '@/shared/lib/format';
import { useTrialTests } from '../hooks/useTrialTests';

const linkClass = 'font-medium text-brand-600 underline dark:text-blue-400';

export function TrialsPage() {
  const { examId = '' } = useParams();
  const { data: exam, loading } = useExam(examId);
  const { data: lessons = [] } = useLessons(examId);
  const { data: tests = [] } = useTrialTests(examId);
  const [lessonFilter, setLessonFilter] = useState('');
  useRememberActiveExam(exam?.id);

  const lessonNames = useMemo(() => new Map(lessons.map((l) => [l.id, l.name])), [lessons]);
  const visible = useMemo(
    () => [...tests].reverse().filter((t) => !lessonFilter || t.lessonId === lessonFilter),
    [tests, lessonFilter],
  );

  if (loading && !exam) return <Loading />;
  if (!exam) {
    return (
      <>
        <PageHeader title="Denemeler" />
        <EmptyState title="Sınav bulunamadı" action={<Link to="/exams" className={linkClass}>Sınavlara git</Link>} />
      </>
    );
  }

  const newLink = (
    <Link
      to={`/trials/${exam.id}/new`}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700"
    >
      <Icon name="plus" className="h-4 w-4" />
      Deneme ekle
    </Link>
  );

  return (
    <>
      <PageHeader title="Denemeler" actions={<ExamSwitcher examId={exam.id} basePath="/trials" />} />

      <div className="mb-3 flex items-center justify-between gap-2">
        {lessons.length > 1 && tests.length > 0 ? (
          <select
            aria-label="Derse göre filtrele"
            value={lessonFilter}
            onChange={(e) => setLessonFilter(e.target.value)}
            className="h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Tüm dersler</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        ) : (
          <span />
        )}
        {newLink}
      </div>

      {tests.length === 0 ? (
        <EmptyState
          title="Henüz deneme yok"
          description="Deneme sonuçlarını girerek net gelişimini takip et."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2">
          {visible.map((t) => (
            <li key={t.id}>
              <Link
                to={`/trials/${exam.id}/${t.id}`}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm hover:shadow-md dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{lessonNames.get(t.lessonId) ?? '—'}</p>
                  <p className="text-sm text-slate-500 tabular-nums dark:text-slate-400">
                    {formatShortDate(t.date)} · {t.correct}D {t.wrong}Y {t.empty}B
                    {t.wrongTopicIds.length > 0 && ` · ${t.wrongTopicIds.length} yanlış konu`}
                  </p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="text-xl font-semibold tabular-nums">{formatNet(calculateNet(t.correct, t.wrong, exam.wrongPenalty))}</span>
                  <span className="ml-1 text-sm text-slate-500 dark:text-slate-400">net</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
