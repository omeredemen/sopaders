import { useMemo, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useRepositories } from '@/data/RepositoryProvider';
import { planTopicImport, type ParsedTopicRow } from '@/domain/importPlan';
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
import { applyTopicImport } from '../logic/applyTopicImport';
import { readSourceText } from '../parsers/tableRows';
import { ACCEPTED_FILE_EXTENSIONS, findParserForFile, getParser } from '../parsers/registry';

type Mode = 'file' | 'text';
const NEW_LESSON = '__new__';
const SAMPLE_CSV = 'ders,konu\nTürkçe,Sözcükte Anlam\nTürkçe,Cümlede Anlam\nTarih,İslamiyet Öncesi Türk Tarihi\n';

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
  const [rows, setRows] = useState<ParsedTopicRow[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Recomputed if lessons/topics change underneath, so the preview is never stale.
  const plan = useMemo(() => (rows ? planTopicImport(rows, lessons, topics) : null), [rows, lessons, topics]);

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
        // Plain text file: continue in the paste box, where the lesson is chosen.
        setText(await readSourceText({ kind: 'file', file }));
        setMode('text');
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

  const previewText = async () => {
    setError('');
    if (!targetLessonName) {
      setError('Konuların ekleneceği dersi seçin.');
      return;
    }
    setRows(await getParser('text').parse({ kind: 'text', text }, { targetLessonName }));
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
              İki sütunlu bir CSV veya Excel dosyası seçin: <strong>ders</strong> ve <strong>konu</strong>. İlk satır başlık
              olabilir (ders,konu veya lesson,topic). Olmayan dersler otomatik oluşturulur, aynı konular atlanır.
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
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">Ders</span>
              <select value={targetLesson} onChange={(e) => setTargetLesson(e.target.value)} className={`h-11 ${inputClass}`}>
                <option value="">Ders seçin…</option>
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
                placeholder={'Sözcükte Anlam\nCümlede Anlam\nParagraf'}
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
            <ImportPreview plan={plan} />
            <div className="mt-4 flex justify-end gap-2">
              <Link to={examPath} className="inline-flex h-11 items-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Vazgeç
              </Link>
              <Button onClick={confirmImport} disabled={busy || plan.topics.length === 0}>
                {plan.topics.length > 0 ? `${plan.topics.length} konuyu içe aktar` : 'Eklenecek konu yok'}
              </Button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
