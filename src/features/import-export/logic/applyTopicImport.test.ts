import { describe, expect, it } from 'vitest';
import { createDexieRepositories } from '@/data/dexie';
import { planTopicImport } from '@/domain/importPlan';
import { newId } from '@/domain/records';
import { applyTopicImport } from './applyTopicImport';

describe('applyTopicImport', () => {
  it('creates missing lessons, appends topics and skips duplicates', async () => {
    const repos = createDexieRepositories(`test-${newId()}`);
    const exam = await repos.exams.create({ name: 'KPSS', examDate: '2026-12-01' });
    const turkce = await repos.lessons.create({ examId: exam.id, name: 'Türkçe' });
    await repos.topics.create({ lessonId: turkce.id, name: 'Paragraf' });

    const plan = planTopicImport(
      [
        { lesson: 'türkçe', topic: 'paragraf' }, // duplicate
        { lesson: 'Türkçe', topic: 'Sözcükte Anlam' },
        { lesson: 'Tarih', topic: 'Osmanlı Kuruluş' },
        { lesson: 'Tarih', topic: 'Kurtuluş Savaşı' },
      ],
      await repos.lessons.listByExam(exam.id),
      await repos.topics.listByExam(exam.id),
    );
    const result = await applyTopicImport(repos, exam.id, plan);

    expect(result).toEqual({ lessonsCreated: 1, topicsCreated: 3 });
    const lessons = await repos.lessons.listByExam(exam.id);
    expect(lessons.map((l) => l.name)).toEqual(['Türkçe', 'Tarih']);
    expect((await repos.topics.listByLesson(turkce.id)).map((t) => [t.name, t.order])).toEqual([
      ['Paragraf', 0],
      ['Sözcükte Anlam', 1],
    ]);
    expect((await repos.topics.listByLesson(lessons[1]!.id)).map((t) => t.name)).toEqual(['Osmanlı Kuruluş', 'Kurtuluş Savaşı']);
  });
});
