import { useState } from 'react';
import { useRepositories } from '@/data/RepositoryProvider';
import { isValidQuestionCount, MAX_QUESTION_COUNT } from '@/domain/trials';
import type { Exam, Id, Lesson } from '@/domain/types';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { useAction } from '@/shared/hooks/useAction';

interface QuestionCountsDialogProps {
  exam: Exam;
  lessons: Lesson[];
  onClose: () => void;
}

/**
 * Sets the fixed number of questions per lesson for this exam's trial tests.
 * A blank lesson has no fixed count (D/Y/B are entered by hand).
 */
export function QuestionCountsDialog({ exam, lessons, onClose }: QuestionCountsDialogProps) {
  const repos = useRepositories();
  const run = useAction();
  const [values, setValues] = useState<Record<Id, string>>(() =>
    Object.fromEntries(lessons.map((l) => [l.id, exam.trialQuestionCounts[l.id] ? String(exam.trialQuestionCounts[l.id]) : ''])),
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const invalid = (lessonId: Id) => {
    const value = values[lessonId] ?? '';
    return value !== '' && !isValidQuestionCount(Number(value));
  };
  const hasError = lessons.some((l) => invalid(l.id));
  const total = lessons.reduce((sum, l) => sum + (invalid(l.id) ? 0 : Number(values[l.id] || 0)), 0);

  const save = async () => {
    setSubmitted(true);
    if (hasError) return;
    // Only current lessons: counts of deleted lessons are dropped here.
    const trialQuestionCounts = Object.fromEntries(
      lessons.filter((l) => values[l.id]).map((l) => [l.id, Number(values[l.id])]),
    );
    setSaving(true);
    const ok = await run(() => repos.exams.update(exam.id, { trialQuestionCounts }).then(() => true), 'Soru sayıları kaydedildi');
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      title="Soru sayıları"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button onClick={save} disabled={saving}>
            Kaydet
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        {exam.name} denemelerinde her dersin kaç sorusu var? Girdiğin derslerde denemede sadece doğru ve yanlışı yazarsın, boş
        kendiliğinden hesaplanır. Boş bıraktığın derslerde doğru, yanlış ve boş elle girilir.
      </p>
      <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {lessons.map((lesson) => (
          <li key={lesson.id} className="py-2">
            <label className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm">{lesson.name}</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={values[lesson.id] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [lesson.id]: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder="—"
                aria-invalid={submitted && invalid(lesson.id) ? true : undefined}
                className="h-10 w-20 shrink-0 rounded-lg border border-slate-300 bg-white text-center text-sm tabular-nums outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 aria-invalid:border-red-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <span className="w-8 shrink-0 text-xs text-slate-500 dark:text-slate-400">soru</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex justify-between text-sm font-medium tabular-nums">
        <span>Toplam</span>
        <span>{total} soru</span>
      </p>
      {submitted && hasError && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          Soru sayısı 1 ile {MAX_QUESTION_COUNT} arasında bir tam sayı olmalı.
        </p>
      )}
    </Modal>
  );
}
