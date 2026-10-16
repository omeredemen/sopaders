import { useNavigate } from 'react-router';
import type { Id } from '@/domain/types';
import { useExams } from '../hooks/useExams';

/** Exam picker for exam-scoped pages. Hidden when there is only one exam. */
export function ExamSwitcher({ examId, basePath }: { examId: Id; basePath: string }) {
  const { data: exams = [] } = useExams();
  const navigate = useNavigate();
  if (exams.length < 2) return null;

  return (
    <select
      aria-label="Sınav seç"
      value={examId}
      onChange={(e) => navigate(`${basePath}/${e.target.value}`)}
      className="h-9 max-w-44 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {exams.map((exam) => (
        <option key={exam.id} value={exam.id}>
          {exam.name}
        </option>
      ))}
    </select>
  );
}
