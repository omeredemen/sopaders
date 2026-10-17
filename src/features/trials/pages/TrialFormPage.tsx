import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useRepositories } from '@/data/RepositoryProvider';
import type { TrialTestInput } from '@/data/repositories';
import { useExam } from '@/features/exams/hooks/useExams';
import { useLessons } from '@/features/lessons/hooks/useLessons';
import { useExamTopics } from '@/features/topics/hooks/useTopics';
import { IconButton } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { EmptyState, Loading } from '@/shared/components/EmptyState';
import { Icon } from '@/shared/components/Icon';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/Toast';
import { useAction } from '@/shared/hooks/useAction';
import { TrialForm, type TrialFormValues } from '../components/TrialForm';
import { useTrialTest } from '../hooks/useTrialTests';
import { saveTrialTest } from '../logic/saveTrialTest';

const linkClass = 'font-medium text-brand-600 underline dark:text-blue-400';

/** Create (`/trials/:examId/new`) or edit (`/trials/:examId/:trialId`) a trial test. */
export function TrialFormPage() {
  const { examId = '', trialId } = useParams();
  const navigate = useNavigate();
  const repos = useRepositories();
  const run = useAction();
  const toast = useToast();

  const { data: exam, loading: examLoading } = useExam(examId);
  const { data: lessons } = useLessons(examId);
  const { data: topics, byLesson } = useExamTopics(examId);
  const { data: existing, loading: trialLoading } = useTrialTest(trialId ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEdit = trialId !== undefined;
  const listPath = `/trials/${examId}`;
  const title = isEdit ? 'Denemeyi düzenle' : 'Yeni deneme';

  const stillLoading = (examLoading && !exam) || !lessons || !topics || (isEdit && trialLoading && !existing);
  if (stillLoading) return <Loading />;
  if (!exam || (isEdit && !existing)) {
    return (
      <>
        <PageHeader title={title} backTo={listPath} />
        <EmptyState title="Kayıt bulunamadı" action={<Link to={listPath} className={linkClass}>Denemelere dön</Link>} />
      </>
    );
  }
  if (!lessons || lessons.length === 0) {
    return (
      <>
        <PageHeader title={title} backTo={listPath} />
        <EmptyState
          title="Önce ders ekle"
          description="Deneme sonuçları ders ders kaydedilir."
          action={<Link to={`/exams/${exam.id}`} className={linkClass}>Derslere git</Link>}
        />
      </>
    );
  }

  const initial: TrialFormValues | undefined = existing && {
    name: existing.name,
    date: existing.date,
    counts: Object.fromEntries(
      existing.results.map((r) => [r.lessonId, { correct: String(r.correct), wrong: String(r.wrong), empty: String(r.empty) }]),
    ),
    notes: existing.notes,
    wrongTopicIds: existing.wrongTopicIds,
  };

  const submit = async (input: TrialTestInput) => {
    setSaving(true);
    const result = await run(() => saveTrialTest(repos, input, existing?.id));
    setSaving(false);
    if (!result) return;
    toast(
      result.markedForReview > 0
        ? `Deneme kaydedildi · ${result.markedForReview} konu “Tekrar edilecek” yapıldı`
        : 'Deneme kaydedildi',
    );
    navigate(listPath);
  };

  return (
    <>
      <PageHeader
        title={title}
        backTo={listPath}
        actions={
          existing && (
            <IconButton aria-label="Denemeyi sil" onClick={() => setConfirmDelete(true)} className="hover:text-red-600">
              <Icon name="trash" className="h-5 w-5" />
            </IconButton>
          )
        }
      />
      <TrialForm
        key={existing?.id ?? 'new'}
        exam={exam}
        lessons={lessons}
        topicsByLesson={byLesson}
        initial={initial}
        saving={saving}
        onSubmit={submit}
        onCancel={() => navigate(listPath)}
      />
      {confirmDelete && existing && (
        <ConfirmDialog
          title="Denemeyi sil"
          message="Bu deneme kaydı silinsin mi? Konu durumları değişmez."
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setConfirmDelete(false);
            const ok = await run(() => repos.trialTests.delete(existing.id).then(() => true), 'Deneme silindi');
            if (ok) navigate(listPath, { replace: true });
          }}
        />
      )}
    </>
  );
}
