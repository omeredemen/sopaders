import { useMemo, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useRepositories } from '@/data/RepositoryProvider';
import { findNewLessonCandidates, planTopicImport, type LessonDecision, type ParsedTopicRow } from '@/domain/importPlan';
import { useExam } from '@/features/exams/hooks/useExams';
import { useLessons } from '@/features/lessons/hooks/useLessons';
import { useExamTopics } from '@/features/topics/hooks/useTopics';
import { Button } from '@/shared/components/Button';
import { EmptyState, Loading } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useToast } from '@/shared/components/Toast';
import { useAction } from '@/shared/hooks/useAction';
import { downloadFile } from '@/shared/lib/download';
import { ImportPreview } from '../components/ImportPreview';
import { LessonDecisions, type LessonChoice } from '../components/LessonDecisions';
import { applyTopicImport } from '../logic/applyTopicImport';
import { readSourceText } from '../parsers/tableRows';
import { ACCEPTED_FILE_EXTENSIONS, findParserForFile } from '../parsers/registry';
import { parsePastedTopics } from '../parsers/textParser';

type Mode = 'file' | 'text';
const NEW_LESSON = '__new__';
const SAMPLE_CSV = 'ders,konu\nTürkçe,Sözcükte Anlam\nTürkçe,Cümlede Anlam\nTarih,İslamiyet Öncesi Türk Tarihi\n';
const SAMPLE_TEXT = 'Türkçe:\n- Sözcükte Anlam\n- Cümlede Anlam\n\nTarih:\n- İslamiyet Öncesi Türk Tarihi\n';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:border-slate-700 dark:bg-slate-950';
const card = 'rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900';

export function TopicImportPage() {
  const { examId = '' } = useParams();
  const navigate = useNavigate();
  const repos = useRepositories();
  const run = useAction();
  const toast = useToast();

  const { data: exam, loading } = useExam(examId);
  const { data: lessons = [] } = useLessons(examId);
  const { data: topics = [] } = useExamTopics(examId);

  const [mode, setMode] = useState<Mode>('file');
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [targetLesson, setTargetLesson] = useState('');
  const [newLessonName, setNewLessonName] = useState('');
  const [rows, setRowsState] = useState<ParsedTopicRow[] | null>(null);
  const [choices, setChoices] = useState<Record<string, LessonChoice>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setRows = (next: ParsedTopicRow[] | null) => {
    setRowsState(next);
    setChoices({}); // new input: ask again
  };

  // Lessons in the input that this exam doesn't have, with similar-name suggestions.
  const candidates = useMemo(() => (rows ? findNewLessonCandidates(rows, lessons, topics) : []), [rows, lessons, topics]);

  // The user's choice per unknown lesson; default: add to a similar existing lesson, else create.
  const effectiveChoices = useMemo(() => {
    const result: Record<string, LessonChoice> = {};
    for (const c of candidates) result[c.key] = choices[c.key] ?? c.similarLessonId ?? 'create';
    return result;
  }, [candidates, choices]);

  // Recomputed if lessons/topics change underneath, so the preview is never stale.
  const plan = useMemo(() => {
    if (!rows) return null;
    const lessonDecisions = new Map<string, LessonDecision>(
      Object.entries(effectiveChoices).map(([key, choice]) => [
        key,
        choice === 'create' ? { kind: 'create' } : choice === 'skip' ? { kind: 'skip' } : { kind: 'existing', lessonId: choice },
      ]),
    );
    return planTopicImport(rows, lessons, topics, { lessonDecisions });
  }, [rows, lessons, topics, effectiveChoices]);

  const examPath = `/exams/${examId}`;
  if (loading && !exam) return <Loading />;
  if (!exam) {
    return (
      <>
        <PageHeader title="İçe aktar" backTo="/exams" />
        <EmptyState title="Sınav bulunamadı" />
      </>
    );
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setRows(null);
    setError('');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    setError('');
    setRows(null);
    setFileName(file.name);
    const parser = findParserForFile(file.name);
    if (!parser) {
      setError('Desteklenmeyen dosya türü. CSV, Excel (.xlsx) veya .txt seçin.');
      return;
    }
    try {
      if (parser.needsTargetLesson) {
        // Plain text file: show it in the paste box. If every line is under a "Ders:" heading,
        // preview right away; otherwise the user picks a lesson for the lines without one.
        const content = await readSourceText({ kind: 'file', file });
        setText(content);
        setMode('text');
        const parsed = parsePastedTopics(content);
        if (parsed.length > 0 && parsed.every((r) => r.lesson)) setRows(parsed);
        return;
      }
      setBusy(true);
      setRows(await parser.parse({ kind: 'file', file }));
    } catch (err) {
      console.error(err);
      setError('Dosya okunamadı. Biçimini kontrol edin.');
    } finally {
      setBusy(false);
    }
  };

  const targetLessonName =
    targetLesson === NEW_LESSON ? newLessonName.trim() : (lessons.find((l) => l.id === targetLesson)?.name ?? '');

  const previewText = () => {
    setError('');
    const parsed = parsePastedTopics(text, targetLessonName);
    if (parsed.some((r) => !r.lesson)) {
      setRows(null);
      setError('Başlığı olmayan satırlar var: yukarıdan bir ders seç ya da metne “Ders adı:” başlığı ekle.');
      return;
    }
    setRows(parsed);
  };

  const confirmImport = async () => {
    if (!plan) return;
    setBusy(true);
    const result = await run(() => applyTopicImport(repos, exam.id, plan));
    setBusy(false);
    if (!result) return;
    toast(
      `${result.topicsCreated} konu eklendi` + (result.lessonsCreated > 0 ? ` · ${result.lessonsCreated} yeni ders` : ''),
    );
    navigate(examPath);
  };

  return (
    <>
      <PageHeader title="Konuları içe aktar" backTo={examPath} />

      <div className="grid grid-cols-1 gap-3">
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/60 p-1 dark:bg-slate-800">
          {(['file', 'text'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`h-9 rounded-md text-sm font-medium ${
                mode === m ? 'bg-white shadow-sm dark:bg-slate-950' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {m === 'file' ? 'Dosyadan' : 'Metin yapıştır'}
            </button>
          ))}
        </div>

        {mode === 'file' ? (
          <section className={card}>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              Tek dosyada birden çok ders olabilir. İki sütunlu bir CSV veya Excel dosyası seçin: <strong>ders</strong> ve{' '}
              <strong>konu</strong> (ilk satır başlık olabilir). Var olan derslerin konuları o derse eklenir; sınavda olmayan
              dersler için ne yapılacağı sorulur; aynı konular atlanır. Düz metin (.txt) dosyası da seçebilirsin: içinde bu biçim ya da
              “Metin yapıştır” sekmesindeki başlıklı biçim olabilir.
            </p>
            <pre className="mb-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">{SAMPLE_CSV}</pre>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-11 cursor-pointer items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 focus-within:ring-2 focus-within:ring-brand-600/40">
                Dosya seç
                <input type="file" accept={ACCEPTED_FILE_EXTENSIONS} onChange={onFile} className="sr-only" />
              </label>
              <Button variant="ghost" onClick={() => downloadFile('﻿' + SAMPLE_CSV, 'ornek-konular.csv', 'text/csv')}>
                Örnek CSV indir
              </Button>
            </div>
            {fileName && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Seçilen: {fileName}</p>}
          </section>
        ) : (
          <section className={card}>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              Birden çok ders için her dersin adını <strong>“Ders adı:”</strong> şeklinde bir satıra yaz, konularını altına
              sırala. Dosyadaki <strong>ders,konu</strong> biçimini yapıştırmak ya da Excel'den iki sütunu kopyalamak da olur.
              Başlık kullanmıyorsan konuların ekleneceği dersi seç.
            </p>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <pre className="min-w-0 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">{SAMPLE_TEXT}</pre>
              <pre className="min-w-0 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">{SAMPLE_CSV}</pre>
            </div>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">Ders (başlıksız satırlar için)</span>
              <select value={targetLesson} onChange={(e) => setTargetLesson(e.target.value)} className={`h-11 ${inputClass}`}>
                <option value="">Başlıklardan al</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
                <option value={NEW_LESSON}>+ Yeni ders</option>
              </select>
            </label>
            {targetLesson === NEW_LESSON && (
              <label className="mb-3 block">
                <span className="mb-1 block text-sm font-medium">Yeni ders adı</span>
                <input value={newLessonName} onChange={(e) => setNewLessonName(e.target.value)} className={`h-11 ${inputClass}`} />
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Konular (her satıra bir konu)</span>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setRows(null);
                }}
                rows={8}
                placeholder={'Türkçe:\nSözcükte Anlam\nCümlede Anlam\n\nTarih:\nKurtuluş Savaşı'}
                className={`py-2 ${inputClass}`}
              />
            </label>
            <div className="mt-3 flex justify-end">
              <Button variant="secondary" onClick={previewText} disabled={!text.trim()}>
                Önizle
              </Button>
            </div>
          </section>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {busy && !plan && <Loading />}

        {plan && (
          <section className={card} aria-label="Önizleme">
            <h2 className="mb-3 font-semibold">Önizleme</h2>
            <LessonDecisions
              candidates={candidates}
              lessons={lessons}
              choices={effectiveChoices}
              onChange={(key, choice) => setChoices((prev) => ({ ...prev, [key]: choice }))}
            />
            <ImportPreview plan={plan} />
            <div className="mt-4 flex justify-end gap-2">
              <Link to={examPath} className="inline-flex h-11 items-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Vazgeç
              </Link>
              <Button onClick={confirmImport} disabled={busy || plan.topics.length === 0}>
                {plan.topics.length === 0
                  ? 'Eklenecek konu yok'
                  : `${plan.topics.length} konuyu içe aktar` + (plan.newLessons.length > 0 ? ` (${plan.newLessons.length} yeni ders)` : '')}
              </Button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
