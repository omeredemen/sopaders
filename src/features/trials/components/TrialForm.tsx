import { useState, type FormEvent } from 'react';
import type { TrialTestInput } from '@/data/repositories';
import { todayLocalDate, isLocalDate } from '@/domain/dates';
import { calculateNet } from '@/domain/net';
import { emptyFromQuestionCount, totalCounts, totalNet } from '@/domain/trials';
import type { Exam, Id, Lesson, Topic, TrialLessonResult } from '@/domain/types';
import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/components/Icon';
import { formatNet } from '@/shared/lib/format';
import { WrongTopicPicker } from './WrongTopicPicker';

export interface LessonCountValues {
  correct: string;
  wrong: string;
  empty: string;
}

export interface TrialFormValues {
  name: string;
  date: string;
  /** lessonId → entered counts. Lessons without an entry start blank. */
  counts: Record<Id, LessonCountValues>;
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

const BLANK: LessonCountValues = { correct: '', wrong: '', empty: '' };

/** Empty input counts as 0 so the live net works while typing. */
const toCount = (value: string) => (value.trim() === '' ? 0 : Number(value));

interface LessonReading {
  /** null: the lesson is not part of the test (left blank) or its counts are over the fixed count. */
  result: TrialLessonResult | null;
  /** Correct + wrong is more than the lesson's fixed question count. */
  overCount: boolean;
}

/**
 * Reads one lesson's inputs. Without a fixed question count, the lesson is part of the test once
 * any count is above zero. With one, it is part of the test once correct or wrong is filled in
 * (even "0"), and empty = questionCount − correct − wrong.
 */
function readLesson(lessonId: Id, values: LessonCountValues, questionCount: number | undefined): LessonReading {
  const correct = toCount(values.correct);
  const wrong = toCount(values.wrong);
  if (questionCount) {
    if (values.correct === '' && values.wrong === '') return { result: null, overCount: false };
    const empty = emptyFromQuestionCount(questionCount, correct, wrong);
    return empty === null ? { result: null, overCount: true } : { result: { lessonId, correct, wrong, empty }, overCount: false };
  }
  const result = { lessonId, correct, wrong, empty: toCount(values.empty) };
  return { result: correct + wrong + result.empty > 0 ? result : null, overCount: false };
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:border-slate-700 dark:bg-slate-950';

/** Read-only box in the place of the Boş input when the lesson has a fixed question count. */
function ComputedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <output className="flex h-12 items-center justify-center rounded-lg bg-slate-100 text-xl font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {value}
      </output>
    </div>
  );
}

function CountField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="0"
        className={`h-12 text-center text-xl font-semibold tabular-nums ${inputClass}`}
      />
    </label>
  );
}

interface LessonResultCardProps {
  lesson: Lesson;
  topics: Topic[];
  values: LessonCountValues;
  /** Fixed number of questions (exam setting), or undefined to enter Boş by hand. */
  questionCount: number | undefined;
  wrongPenalty: number;
  selected: ReadonlySet<Id>;
  error: string | null;
  onChange: (values: LessonCountValues) => void;
  onToggleTopic: (topicId: Id) => void;
}

function LessonResultCard(props: LessonResultCardProps) {
  const { lesson, topics, values, questionCount, wrongPenalty, selected, error, onChange, onToggleTopic } = props;
  const selectedHere = topics.filter((t) => selected.has(t.id)).length;
  const [showTopics, setShowTopics] = useState(selectedHere > 0);
  const { result, overCount } = readLesson(lesson.id, values, questionCount);

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="min-w-0 truncate font-medium">
          {lesson.name}
          {questionCount ? (
            <span className="ml-2 text-xs font-normal text-slate-500 tabular-nums dark:text-slate-400">{questionCount} soru</span>
          ) : null}
        </h3>
        <p className="shrink-0 text-sm tabular-nums text-slate-500 dark:text-slate-400">
          {result ? (
            <>
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {formatNet(calculateNet(result.correct, result.wrong, wrongPenalty))}
              </span>{' '}
              net
            </>
          ) : (
            'Girilmedi'
          )}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <CountField label="Doğru" value={values.correct} onChange={(correct) => onChange({ ...values, correct })} />
        <CountField label="Yanlış" value={values.wrong} onChange={(wrong) => onChange({ ...values, wrong })} />
        {questionCount ? (
          <ComputedField label="Boş" value={result ? String(result.empty) : '—'} />
        ) : (
          <CountField label="Boş" value={values.empty} onChange={(empty) => onChange({ ...values, empty })} />
        )}
      </div>
      {overCount && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          Doğru + yanlış en fazla {questionCount} olabilir.
        </p>
      )}
      {topics.length > 0 && (
        <button
          type="button"
          aria-expanded={showTopics}
          onClick={() => setShowTopics((v) => !v)}
          className="mt-3 flex min-h-10 w-full items-center justify-between gap-2 text-left text-sm font-medium text-brand-600 dark:text-blue-400"
        >
          <span>
            Yanlış yaptığın konular{selectedHere > 0 && ` (${selectedHere} seçili)`}
          </span>
          <Icon name="chevronDown" className={`h-4 w-4 shrink-0 transition-transform ${showTopics ? 'rotate-180' : ''}`} />
        </button>
      )}
      {showTopics && (
        <div className="mt-1">
          <WrongTopicPicker topics={topics} selected={selected} onToggle={onToggleTopic} />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}

/** One trial test of the whole exam: a result card per lesson, total net, wrong topics per lesson. */
export function TrialForm({ exam, lessons, topicsByLesson, initial, saving, onSubmit, onCancel }: TrialFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [date, setDate] = useState(initial?.date ?? todayLocalDate());
  const [counts, setCounts] = useState<Record<Id, LessonCountValues>>(initial?.counts ?? {});
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [wrongTopicIds, setWrongTopicIds] = useState<Set<Id>>(new Set(initial?.wrongTopicIds));
  const [submitted, setSubmitted] = useState(false);

  const readings = lessons.map((l) => readLesson(l.id, counts[l.id] ?? BLANK, exam.trialQuestionCounts[l.id]));
  const results = readings.flatMap((r) => r.result ?? []);
  const hasOverCount = readings.some((r) => r.overCount);
  const included = new Set(results.map((r) => r.lessonId));
  const total = totalCounts(results);
  const dateError = !isLocalDate(date);
  const noResults = results.length === 0;
  // Wrong topics ticked in a lesson without a result: probably forgot to enter the counts.
  const topicsWithoutResult = (lessonId: Id) =>
    !included.has(lessonId) && (topicsByLesson.get(lessonId) ?? []).some((t) => wrongTopicIds.has(t.id));
  const hasTopicError = lessons.some((l) => topicsWithoutResult(l.id));

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
    if (noResults || dateError || hasTopicError || hasOverCount) return;
    onSubmit({
      examId: exam.id,
      name,
      date,
      results,
      notes: notes.trim(),
      // Only topics that still belong to a lesson in the test.
      wrongTopicIds: results.flatMap((r) => (topicsByLesson.get(r.lessonId) ?? []).filter((t) => wrongTopicIds.has(t.id)).map((t) => t.id)),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3">
      <section className="grid grid-cols-2 gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium">Deneme adı (isteğe bağlı)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ör. Yayın adı, 5. deneme"
            className={`h-11 px-3 text-sm ${inputClass}`}
          />
        </label>
        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium">Tarih</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={submitted && dateError ? true : undefined}
            className={`h-11 px-3 text-sm ${inputClass}`}
          />
        </label>
        <p className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
          Denemedeki her dersin sonucunu gir. Boş bıraktığın dersler denemeye katılmaz; tek ders girersen branş denemesi olur.
          Seçtiğin yanlış konular kaydedince “Tekrar edilecek” olarak işaretlenir.
          {Object.keys(exam.trialQuestionCounts).length === 0 &&
            ' Denemeler sayfasında “Soru sayıları”nı ayarlarsan sadece doğru ve yanlışı girersin, boş kendiliğinden hesaplanır.'}
        </p>
      </section>

      {lessons.map((lesson) => (
        <LessonResultCard
          key={lesson.id}
          lesson={lesson}
          topics={topicsByLesson.get(lesson.id) ?? []}
          values={counts[lesson.id] ?? BLANK}
          questionCount={exam.trialQuestionCounts[lesson.id]}
          wrongPenalty={exam.wrongPenalty}
          selected={wrongTopicIds}
          error={submitted && topicsWithoutResult(lesson.id) ? 'Konu seçtin ama bu dersin sonucunu girmedin.' : null}
          onChange={(values) => setCounts((prev) => ({ ...prev, [lesson.id]: values }))}
          onToggleTopic={toggleTopic}
        />
      ))}

      <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900" aria-live="polite">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Toplam net</p>
            <p className="text-4xl font-bold tabular-nums">{formatNet(totalNet(results, exam.wrongPenalty))}</p>
          </div>
          <p className="text-right text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {results.length}/{lessons.length} ders · {total.correct + total.wrong + total.empty} soru
            <br />
            {total.correct}D {total.wrong}Y {total.empty}B
            <br />
            {exam.wrongPenalty > 0 ? `${formatNet(exam.wrongPenalty)} yanlış 1 doğruyu götürür` : 'Yanlış cezası yok'}
          </p>
        </div>
        {submitted && noResults && (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            En az bir dersin sonucunu gir.
          </p>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Notlar (isteğe bağlı)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="ör. Süre, dikkat edilecekler…"
            className={`p-3 text-sm ${inputClass}`}
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
