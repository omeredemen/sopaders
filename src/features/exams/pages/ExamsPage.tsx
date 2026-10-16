import { useState } from 'react';
import { useNavigate } from 'react-router';
import { todayLocalDate } from '@/domain/dates';
import { Button } from '@/shared/components/Button';
import { EmptyState, Loading } from '@/shared/components/EmptyState';
import { Icon } from '@/shared/components/Icon';
import { PageHeader } from '@/shared/components/PageHeader';
import { ExamCard } from '../components/ExamCard';
import { ExamFormDialog } from '../components/ExamFormDialog';
import { useExams } from '../hooks/useExams';

export function ExamsPage() {
  const { data: exams, loading } = useExams();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const today = todayLocalDate();

  const newExamButton = (
    <Button onClick={() => setCreating(true)}>
      <Icon name="plus" className="h-4 w-4" />
      Yeni sınav
    </Button>
  );

  return (
    <>
      <PageHeader title="Sınavlar" actions={exams && exams.length > 0 ? newExamButton : undefined} />
      {loading && !exams ? (
        <Loading />
      ) : !exams || exams.length === 0 ? (
        <EmptyState
          title="Henüz sınav yok"
          description="Hazırlandığın sınavı (KPSS, AGS…) ekleyerek başla."
          action={newExamButton}
        />
      ) : (
        <ul className="grid gap-3">
          {exams.map((exam) => (
            <li key={exam.id}>
              <ExamCard exam={exam} today={today} />
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <ExamFormDialog onClose={() => setCreating(false)} onSaved={(exam) => navigate(`/exams/${exam.id}`)} />
      )}
    </>
  );
}
