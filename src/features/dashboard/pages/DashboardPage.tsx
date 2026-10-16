import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { ExamSwitcher } from '@/features/exams/components/ExamSwitcher';
import { useRememberActiveExam } from '@/features/exams/hooks/useActiveExam';
import { StatusBar, StatusLegend } from '@/features/topics/components/StatusBar';
import { EmptyState, Loading } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { CountdownHero } from '../components/CountdownHero';
import { KpiRow } from '../components/KpiRow';
import { LessonBreakdown } from '../components/LessonBreakdown';
import { useExamDashboard } from '../hooks/useExamDashboard';

// Recharts is large; load the charts only when the dashboard is shown.
const NetTrendCharts = lazy(() =>
  import('@/features/trials/components/NetTrendCharts').then((m) => ({ default: m.NetTrendCharts })),
);

const linkClass = 'font-medium text-brand-600 underline dark:text-blue-400';

export function DashboardPage() {
  const { examId = '' } = useParams();
  const { exam, lessons, dashboard, loading } = useExamDashboard(examId);
  useRememberActiveExam(exam?.id);

  if (loading && !dashboard) return <Loading />;
  if (!exam || !dashboard) {
    return (
      <>
        <PageHeader title="Panel" />
        <EmptyState title="Sınav bulunamadı" action={<Link to="/exams" className={linkClass}>Sınavlara git</Link>} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={exam.name} actions={<ExamSwitcher examId={exam.id} basePath="/dashboard" />} />

      <div className="grid grid-cols-1 gap-3">
        <CountdownHero daysToExam={dashboard.daysToExam} examDate={exam.examDate} />
        <KpiRow dashboard={dashboard} />

        {dashboard.overall.total === 0 ? (
          <EmptyState
            title="Henüz konu yok"
            description="Konu durumlarını görmek için derslerine konu ekle."
            action={<Link to={`/exams/${exam.id}`} className={linkClass}>Konuları ekle</Link>}
          />
        ) : (
          <>
            <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">Konu durumu</h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">{dashboard.overall.total} konu</span>
              </div>
              <StatusBar summary={dashboard.overall} className="mb-4 h-3" />
              <StatusLegend summary={dashboard.overall} />
            </section>
            <LessonBreakdown lessons={dashboard.lessons} />
          </>
        )}

        {lessons.length > 0 && (
          <Suspense fallback={<Loading />}>
            <NetTrendCharts exam={exam} lessons={lessons} />
          </Suspense>
        )}

        <p className="text-center text-sm">
          <Link to={`/exams/${exam.id}`} className={linkClass}>
            Dersleri ve konuları düzenle
          </Link>
        </p>
      </div>
    </>
  );
}
