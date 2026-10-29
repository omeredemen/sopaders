import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useRepositories } from '@/data/RepositoryProvider';
import { daysLeft, todayLocalDate } from '@/domain/dates';
import { summarizeStatuses } from '@/domain/statusSummary';
import type { Id, Lesson } from '@/domain/types';
import { LessonSection } from '@/features/lessons/components/LessonSection';
import { useLessonActions } from '@/features/lessons/hooks/useLessonActions';
import { useLessons } from '@/features/lessons/hooks/useLessons';
import { StatusBar } from '@/features/topics/components/StatusBar';
import { TopicList } from '@/features/topics/components/TopicList';
import { useExamTopics } from '@/features/topics/hooks/useTopics';
import { Button, IconButton } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { EmptyState, Loading } from '@/shared/components/EmptyState';
import { Icon } from '@/shared/components/Icon';
import { InlineAddForm } from '@/shared/components/InlineAddForm';
import { PageHeader } from '@/shared/components/PageHeader';
import { useAction } from '@/shared/hooks/useAction';
import { formatDate, formatDaysLeft, formatDecimal } from '@/shared/lib/format';
import { ExamFormDialog } from '../components/ExamFormDialog';
import { useRememberActiveExam } from '../hooks/useActiveExam';
import { useExam } from '../hooks/useExams';

export function ExamDetailPage() {
  const { examId = '' } = useParams();
  const navigate = useNavigate();
  const repos = useRepositories();
  const run = useAction();

  const { data: exam, loading } = useExam(examId);
  const { data: lessons = [] } = useLessons(examId);
  const { data: topics = [], byLesson } = useExamTopics(examId);
  const lessonActions = useLessonActions(examId);

  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<Set<Id>>(new Set());
  const [editingExam, setEditingExam] = useState(false);
  const [confirmExamDelete, setConfirmExamDelete] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  useRememberActiveExam(exam?.id);

  if (loading && !exam) return <Loading />;
  if (!exam) {
    return (
      <>
        <PageHeader title="Sınav" backTo="/exams" />
        <EmptyState title="Sınav bulunamadı" action={<Link to="/exams" className="text-brand-600 underline">Sınavlara dön</Link>} />
      </>
    );
  }

  const today = todayLocalDate();
  const overall = summarizeStatuses(topics);
  const toggle = (id: Id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <PageHeader
        title={exam.name}
        backTo="/exams"
        actions={
          <>
            {!editing && (
              <Link
                to={`/dashboard/${exam.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Icon name="chart" className="h-4 w-4" />
                Panel
              </Link>
            )}
            {lessons.length > 0 && (
              <Button variant={editing ? 'primary' : 'secondary'} size="sm" onClick={() => setEditing((v) => !v)}>
                <Icon name={editing ? 'check' : 'pencil'} className="h-4 w-4" />
                {editing ? 'Bitti' : 'Düzenle'}
              </Button>
            )}
          </>
        }
      />

      <section className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">Sınav</dt>
            <dd>
              {formatDate(exam.examDate)} · <strong>{formatDaysLeft(daysLeft(exam.examDate, today))}</strong>
            </dd>
            <dt className="text-slate-500 dark:text-slate-400">Başlangıç</dt>
            <dd>{formatDate(exam.studyStartDate)}</dd>
            {exam.studyDeadline && (
              <>
                <dt className="text-slate-500 dark:text-slate-400">Çalışma bitişi</dt>
                <dd>
                  {formatDate(exam.studyDeadline)} · {formatDaysLeft(daysLeft(exam.studyDeadline, today))}
                </dd>
              </>
            )}
            <dt className="text-slate-500 dark:text-slate-400">Yanlış cezası</dt>
            <dd>{exam.wrongPenalty > 0 ? `${formatDecimal(exam.wrongPenalty, exam.wrongPenalty % 1 ? 1 : 0)} yanlış = 1 doğru` : 'Yok'}</dd>
          </dl>
          <IconButton aria-label="Sınavı düzenle" onClick={() => setEditingExam(true)}>
            <Icon name="pencil" className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="Sınavı sil" onClick={() => setConfirmExamDelete(true)} className="hover:text-red-600">
            <Icon name="trash" className="h-4 w-4" />
          </IconButton>
        </div>
        {overall.total > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Biten konular</span>
              <span className="tabular-nums">
                {overall.done}/{overall.total}
              </span>
            </div>
            <StatusBar summary={overall} className="h-2" />
          </div>
        )}
      </section>

      {lessons.length === 0 ? (
        <EmptyState title="Henüz ders yok" description="Aşağıdan ilk dersini ekle (ör. Türkçe, Matematik, Tarih) ya da konu listeni bir dosyadan içe aktar." />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {lessons.map((lesson, index) => {
            const lessonTopics = byLesson.get(lesson.id) ?? [];
            const summary = summarizeStatuses(lessonTopics);
            return (
              <LessonSection
                key={lesson.id}
                lesson={lesson}
                summary={summary}
                expanded={expanded.has(lesson.id)}
                onToggle={() => toggle(lesson.id)}
                editing={editing}
                canMoveUp={index > 0}
                canMoveDown={index < lessons.length - 1}
                onMove={(delta) => lessonActions.move(lessons, index, delta)}
                onRename={(name) => lessonActions.rename(lesson, name)}
                onDelete={() => setLessonToDelete(lesson)}
                progress={<StatusBar summary={summary} />}
              >
                <TopicList lessonId={lesson.id} topics={lessonTopics} editing={editing} />
              </LessonSection>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <InlineAddForm
          label="Ders ekle"
          placeholder="Yeni ders adı"
          onAdd={async (name) => {
            const lesson = await lessonActions.add(name);
            if (lesson) setExpanded((prev) => new Set(prev).add(lesson.id));
          }}
        />
      </div>
      <p className="mt-3 text-center text-sm">
        <Link to={`/exams/${exam.id}/import`} className="font-medium text-brand-600 underline dark:text-blue-400">
          Dosyadan veya metinden içe aktar
        </Link>
      </p>

      {editingExam && <ExamFormDialog exam={exam} onClose={() => setEditingExam(false)} />}
      {confirmExamDelete && (
        <ConfirmDialog
          title="Sınavı sil"
          message={`"${exam.name}" ve tüm dersleri, konuları ve denemeleri silinsin mi?`}
          onCancel={() => setConfirmExamDelete(false)}
          onConfirm={async () => {
            setConfirmExamDelete(false);
            const ok = await run(() => repos.exams.delete(exam.id).then(() => true), 'Sınav silindi');
            if (ok) navigate('/exams', { replace: true });
          }}
        />
      )}
      {lessonToDelete && (
        <ConfirmDialog
          title="Dersi sil"
          message={`"${lessonToDelete.name}" ve içindeki ${byLesson.get(lessonToDelete.id)?.length ?? 0} konu silinsin mi? Bu derse ait denemeler de silinir.`}
          onCancel={() => setLessonToDelete(null)}
          onConfirm={() => {
            lessonActions.remove(lessonToDelete);
            setLessonToDelete(null);
          }}
        />
      )}
    </>
  );
}
