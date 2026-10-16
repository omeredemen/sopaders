import type { NewLessonCandidate } from '@/domain/importPlan';
import type { Id, Lesson } from '@/domain/types';

/** Select value: "create", "skip", or an existing lesson id. */
export type LessonChoice = 'create' | 'skip' | Id;

interface LessonDecisionsProps {
  candidates: NewLessonCandidate[];
  lessons: Lesson[];
  choices: Record<string, LessonChoice>;
  onChange: (key: string, choice: LessonChoice) => void;
}

/** Asks what to do with each lesson in the file that this exam doesn't have yet. */
export function LessonDecisions({ candidates, lessons, choices, onChange }: LessonDecisionsProps) {
  if (candidates.length === 0) return null;
  const lessonName = new Map(lessons.map((l) => [l.id, l.name]));

  return (
    <div className="mb-4 rounded-lg border border-brand-600/30 bg-brand-50/60 p-3 dark:border-blue-400/30 dark:bg-slate-800/60">
      <p className="text-sm font-semibold">Bu sınavda olmayan dersler</p>
      <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
        Dosyadaki bu dersler henüz yok. Her biri için ne yapılacağını seç.
      </p>
      <ul className="grid grid-cols-1 gap-3">
        {candidates.map((c) => {
          const choice = choices[c.key] ?? 'create';
          const similar = c.similarLessonId ? lessonName.get(c.similarLessonId) : undefined;
          return (
            <li key={c.key} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {c.topicCount} konu
                  {similar && <> · “{similar}” dersine benziyor</>}
                </p>
              </div>
              <select
                aria-label={`${c.name} için ne yapılsın?`}
                value={choice}
                onChange={(e) => onChange(c.key, e.target.value)}
                className="h-10 max-w-full rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="create">Yeni ders olarak oluştur</option>
                {lessons.length > 0 && (
                  <optgroup label="Mevcut derse ekle">
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        → {l.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="skip">Atla (bu konuları alma)</option>
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
