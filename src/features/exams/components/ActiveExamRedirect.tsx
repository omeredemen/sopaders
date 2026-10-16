import { Link, Navigate } from 'react-router';
import { EmptyState, Loading } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { pickActiveExam } from '../hooks/useActiveExam';
import { useExams } from '../hooks/useExams';

/**
 * For exam-scoped sections (dashboard, trials): sends `/basePath` to
 * `/basePath/<active exam id>`, or asks the user to create an exam first.
 */
export function ActiveExamRedirect({ basePath, title }: { basePath: string; title: string }) {
  const { data: exams, loading } = useExams();
  if (loading && !exams) return <Loading />;

  const exam = pickActiveExam(exams ?? []);
  if (exam) return <Navigate to={`${basePath}/${exam.id}`} replace />;

  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        title="Önce bir sınav ekle"
        action={
          <Link to="/exams" className="font-medium text-brand-600 underline dark:text-blue-400">
            Sınavlara git
          </Link>
        }
      />
    </>
  );
}
