import { useMemo, useState, type FormEvent } from 'react';
import type { TrialTestInput } from '@/data/repositories';
import { todayLocalDate, isLocalDate } from '@/domain/dates';
import { calculateNet, validateTrialCounts, type TrialCountsError } from '@/domain/net';
import type { Exam, Id, Lesson, Topic } from '@/domain/types';
import { Button } from '@/shared/components/Button';
import { formatNet } from '@/shared/lib/format';
import { WrongTopicPicker } from './WrongTopicPicker';

export interface TrialFormValues {
  lessonId: Id;
  date: string;
  correct: string;
  wrong: string;
  empty: string;
  notes: string;
  wrongTopicIds: Id[];
}

interface TrialFormProps {
  exam: Exam;
  lessons: Lesson[];
  /** Topics of the whole exam, grouped by lesson. */
  topicsByLesson: Map<Id, Topic[]>;
  initial?: TrialFormValues;
  saving: boolean;
  onSubmit: (input: TrialTestInput) => void;
  onCancel: () => void;
}

const COUNT_ERRORS: Record<TrialCountsError, string> = {
  not_integer: 'Sayılar tam sayı olmalı.',
  negative: 'Sayılar negatif olamaz.',
  all_zero: 'En az bir soru girin.',
};

/** Empty input counts as 0 so the live net works while typing. */
const toCount = (value: string) => (value.trim() === '' ? 0 : Number(value));

function CountField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="0"
        className="h-14 w-full rounded-lg border border-slate-300 bg-white text-center text-2xl font-semibold tabular-nums outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}

export function TrialForm({ exam, lessons, topicsByLesson, initial, saving, onSubmit, onCancel }: TrialFormProps) {
  const [lessonId, setLessonId] = useState(initial?.lessonId ?? lessons[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? todayLocalDate());
  const [correct, setCorrect] = useState(initial?.correct ?? '');
  const [wrong, setWrong] = useState(initial?.wrong ?? '');
  const [empty, setEmpty] = useState(initial?.empty ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [wrongTopicIds, setWrongTopicIds] = useState<Set<Id>>(new Set(initial?.wrongTopicIds));
  const [submitted, setSubmitted] = useState(false);

  const counts = { correct: toCount(correct), wrong: toCount(wrong), empty: toCount(empty) };
  const net = calculateNet(counts.correct, counts.wrong, exam.wrongPenalty);
  const countError = validateTrialCounts(counts);
  const dateError = !isLocalDate(date);
  const lessonTopics = useMemo(() => topicsByLesson.get(lessonId) ?? [], [topicsByLesson, lessonId]);

  const changeLesson = (id: Id) => {
    setLessonId(id);
    setWrongTopicIds(new Set()); // wrong topics belong to the previous lesson
  };

  const toggleTopic = (id: Id) =>
    setWrongTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (countError || dateError || !lessonId) return;
    onSubmit({
      examId: exam.id,
      lessonId,
      date,
      ...counts,
      notes: notes.trim(),
      // Only topics that still belong to the selected lesson.
      wrongTopicIds: lessonTopics.filter((t) => wrongTopicIds.has(t.id)).map((t) => t.id),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3">
      <section className="grid grid-cols-2 gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium">Ders</span>
          <select
            value={lessonId}
            onChange={(e) => changeLesson(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium">Tarih</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={submitted && dateError ? true : undefined}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <div className="grid grid-cols-3 gap-3">
          <CountField label="Doğru" value={correct} onChange={setCorrect} />
          <CountField label="Yanlış" value={wrong} onChange={setWrong} />
          <CountField label="Boş" value={empty} onChange={setEmpty} />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3" aria-live="polite">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Net</p>
            <p className="text-4xl font-bold tabular-nums">{formatNet(net)}</p>
          </div>
          <p className="text-right text-xs text-slate-500 dark:text-slate-400">
            {counts.correct + counts.wrong + counts.empty} soru
            <br />
            {exam.wrongPenalty > 0 ? `${formatNet(exam.wrongPenalty)} yanlış 1 doğruyu götürür` : 'Yanlış cezası yok'}
          </p>
        </div>
        {submitted && countError && (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {COUNT_ERRORS[countError]}
          </p>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Yanlış yaptığın konular</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">{wrongTopicIds.size} seçili</span>
        </div>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Seçtiğin konular kaydedince “Tekrar edilecek” olarak işaretlenir.
        </p>
        <WrongTopicPicker topics={lessonTopics} selected={wrongTopicIds} onToggle={toggleTopic} />
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Notlar (isteğe bağlı)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="ör. Yayın adı, süre, dikkat edilecekler…"
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-brand-600 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={saving}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
