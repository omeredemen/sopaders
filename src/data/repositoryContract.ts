/**
 * Behavioural test suite every `Repositories` implementation must pass.
 * Dexie runs it in dexie/dexieRepositories.test.ts; a future Supabase
 * implementation should call it the same way.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { todayLocalDate } from '@/domain/dates';
import type { Repositories } from './repositories';

export function describeRepositoryContract(name: string, makeRepos: () => Promise<Repositories> | Repositories) {
  describe(`${name} repositories`, () => {
    let repos: Repositories;

    beforeEach(async () => {
      repos = await makeRepos();
    });

    const seed = async () => {
      const exam = await repos.exams.create({ name: 'KPSS', examDate: '2026-12-01' });
      const turkce = await repos.lessons.create({ examId: exam.id, name: 'Türkçe' });
      const tarih = await repos.lessons.create({ examId: exam.id, name: 'Tarih' });
      const [t1, t2, t3] = await repos.topics.createMany([
        { lessonId: turkce.id, name: 'Sözcükte Anlam' },
        { lessonId: turkce.id, name: 'Cümlede Anlam' },
        { lessonId: tarih.id, name: 'İslamiyet Öncesi' },
      ]);
      return { exam, turkce, tarih, t1: t1!, t2: t2!, t3: t3! };
    };

    describe('exams', () => {
      it('creates with defaults and lists by exam date', async () => {
        const later = await repos.exams.create({ name: 'AGS', examDate: '2027-06-01' });
        const sooner = await repos.exams.create({ name: '  KPSS  ', examDate: '2026-12-01', studyDeadline: '2026-11-01' });
        expect(sooner.name).toBe('KPSS');
        expect(sooner.wrongPenalty).toBe(4);
        expect(later.studyDeadline).toBeNull();
        expect((await repos.exams.list()).map((e) => e.name)).toEqual(['KPSS', 'AGS']);
      });

      it('stores the study start date, defaulting to today', async () => {
        const defaulted = await repos.exams.create({ name: 'KPSS', examDate: '2026-12-01' });
        expect(defaulted.studyStartDate).toBe(todayLocalDate());
        const given = await repos.exams.create({ name: 'AGS', examDate: '2027-06-01', studyStartDate: '2026-09-01' });
        expect((await repos.exams.get(given.id))?.studyStartDate).toBe('2026-09-01');
        await expect(repos.exams.update(given.id, { studyStartDate: '2026-02-30' })).rejects.toThrow();
      });

      it('updates and bumps updatedAt', async () => {
        const exam = await repos.exams.create({ name: 'KPSS', examDate: '2026-12-01' });
        await new Promise((r) => setTimeout(r, 5));
        const updated = await repos.exams.update(exam.id, { wrongPenalty: 3 });
        expect(updated.wrongPenalty).toBe(3);
        expect(updated.updatedAt > exam.updatedAt).toBe(true);
        expect((await repos.exams.get(exam.id))?.wrongPenalty).toBe(3);
      });

      it('stores trial question counts (default {}) and rejects invalid ones', async () => {
        const exam = await repos.exams.create({ name: 'KPSS', examDate: '2026-12-01' });
        expect(exam.trialQuestionCounts).toEqual({});
        const updated = await repos.exams.update(exam.id, { trialQuestionCounts: { l1: 30, l2: 27 } });
        expect((await repos.exams.get(exam.id))?.trialQuestionCounts).toEqual({ l1: 30, l2: 27 });
        expect(updated.updatedAt >= exam.updatedAt).toBe(true);
        await expect(repos.exams.update(exam.id, { trialQuestionCounts: { l1: 0 } })).rejects.toThrow();
        await expect(repos.exams.update(exam.id, { trialQuestionCounts: { l1: 2.5 } })).rejects.toThrow();
      });

      it('rejects invalid exams', async () => {
        await expect(repos.exams.create({ name: '', examDate: '2026-12-01' })).rejects.toThrow();
        await expect(
          repos.exams.create({ name: 'X', examDate: '2026-12-01', studyDeadline: '2026-12-05' }),
        ).rejects.toThrow();
      });

      it('delete cascades to lessons, topics and trial tests', async () => {
        const { exam, turkce, t1 } = await seed();
        await repos.trialTests.create({
          examId: exam.id, date: '2026-10-15', results: [{ lessonId: turkce.id, correct: 10, wrong: 2, empty: 0 }], wrongTopicIds: [t1.id],
        });
        await repos.exams.delete(exam.id);
        expect(await repos.exams.get(exam.id)).toBeUndefined();
        expect(await repos.lessons.listByExam(exam.id)).toEqual([]);
        expect(await repos.topics.listByExam(exam.id)).toEqual([]);
        expect(await repos.trialTests.listByExam(exam.id)).toEqual([]);
      });
    });

    describe('lessons', () => {
      it('delete removes its results from trial tests and deletes tests left empty', async () => {
        const { exam, turkce, tarih, t1, t3 } = await seed();
        const full = await repos.trialTests.create({
          examId: exam.id, date: '2026-10-10', wrongTopicIds: [t1.id, t3.id],
          results: [
            { lessonId: turkce.id, correct: 30, wrong: 8, empty: 2 },
            { lessonId: tarih.id, correct: 20, wrong: 4, empty: 3 },
          ],
        });
        const turkceOnly = await repos.trialTests.create({
          examId: exam.id, date: '2026-10-11', results: [{ lessonId: turkce.id, correct: 10, wrong: 0, empty: 0 }],
        });
        await repos.lessons.delete(turkce.id);
        const remaining = await repos.trialTests.get(full.id);
        expect(remaining?.results).toEqual([{ lessonId: tarih.id, correct: 20, wrong: 4, empty: 3 }]);
        expect(remaining?.wrongTopicIds).toEqual([t3.id]);
        expect(await repos.trialTests.get(turkceOnly.id)).toBeUndefined();
      });

      it('appends in order and reorders', async () => {
        const { exam, turkce, tarih } = await seed();
        const cog = await repos.lessons.create({ examId: exam.id, name: 'Coğrafya' });
        expect((await repos.lessons.listByExam(exam.id)).map((l) => l.name)).toEqual(['Türkçe', 'Tarih', 'Coğrafya']);
        await repos.lessons.reorder(exam.id, [cog.id, turkce.id, tarih.id]);
        const lessons = await repos.lessons.listByExam(exam.id);
        expect(lessons.map((l) => l.name)).toEqual(['Coğrafya', 'Türkçe', 'Tarih']);
        expect(lessons.map((l) => l.order)).toEqual([0, 1, 2]);
      });

      it('renames, rejecting empty names', async () => {
        const { turkce } = await seed();
        expect((await repos.lessons.rename(turkce.id, ' Türkçe  Dil Bilgisi ')).name).toBe('Türkçe Dil Bilgisi');
        await expect(repos.lessons.rename(turkce.id, '  ')).rejects.toThrow();
      });

      it('requires an existing exam', async () => {
        await expect(repos.lessons.create({ examId: 'missing', name: 'X' })).rejects.toThrow();
      });

      it('delete cascades to its topics only', async () => {
        const { exam, turkce } = await seed();
        await repos.lessons.delete(turkce.id);
        expect((await repos.lessons.listByExam(exam.id)).map((l) => l.name)).toEqual(['Tarih']);
        expect((await repos.topics.listByExam(exam.id)).map((t) => t.name)).toEqual(['İslamiyet Öncesi']);
      });
    });

    describe('topics', () => {
      it('creates with default status and per-lesson order', async () => {
        const { turkce, tarih, t1, t2, t3 } = await seed();
        expect(t1.status).toBe('not_started');
        expect([t1.order, t2.order, t3.order]).toEqual([0, 1, 0]);
        const t4 = await repos.topics.create({ lessonId: turkce.id, name: 'Paragraf' });
        expect(t4.order).toBe(2);
        expect((await repos.topics.listByLesson(tarih.id)).map((t) => t.name)).toEqual(['İslamiyet Öncesi']);
      });

      it('sets status for several topics', async () => {
        const { exam, t1, t2 } = await seed();
        await repos.topics.setStatus([t1.id, t2.id], 'finished');
        const statuses = (await repos.topics.listByExam(exam.id)).map((t) => t.status);
        expect(statuses.filter((s) => s === 'finished')).toHaveLength(2);
      });

      it('reorders within a lesson', async () => {
        const { turkce, t1, t2 } = await seed();
        await repos.topics.reorder(turkce.id, [t2.id, t1.id]);
        expect((await repos.topics.listByLesson(turkce.id)).map((t) => t.name)).toEqual(['Cümlede Anlam', 'Sözcükte Anlam']);
      });

      it('delete removes it from trial test wrong topics', async () => {
        const { exam, turkce, t1, t2 } = await seed();
        const test = await repos.trialTests.create({
          examId: exam.id, date: '2026-10-15', results: [{ lessonId: turkce.id, correct: 10, wrong: 2, empty: 0 }], wrongTopicIds: [t1.id, t2.id],
        });
        await repos.topics.delete(t1.id);
        expect((await repos.trialTests.get(test.id))?.wrongTopicIds).toEqual([t2.id]);
      });
    });

    describe('trial tests', () => {
      it('stores wrong topics and lists oldest first', async () => {
        const { exam, turkce, t1 } = await seed();
        await repos.trialTests.create({
          examId: exam.id, date: '2026-10-20', results: [{ lessonId: turkce.id, correct: 30, wrong: 8, empty: 2 }],
        });
        const first = await repos.trialTests.create({
          examId: exam.id, date: '2026-10-10', results: [{ lessonId: turkce.id, correct: 25, wrong: 10, empty: 5 }], wrongTopicIds: [t1.id, t1.id],
        });
        expect(first.wrongTopicIds).toEqual([t1.id]);
        expect(first.notes).toBe('');
        const list = await repos.trialTests.listByExam(exam.id);
        expect(list.map((t) => t.date)).toEqual(['2026-10-10', '2026-10-20']);
        expect(list[0]?.wrongTopicIds).toEqual([t1.id]);
        expect(list[1]?.wrongTopicIds).toEqual([]);
      });

      it('update replaces wrong topics', async () => {
        const { exam, turkce, t1, t2 } = await seed();
        const test = await repos.trialTests.create({
          examId: exam.id, date: '2026-10-10', results: [{ lessonId: turkce.id, correct: 25, wrong: 10, empty: 5 }], wrongTopicIds: [t1.id],
        });
        const results = [{ lessonId: turkce.id, correct: 26, wrong: 10, empty: 4 }];
        const updated = await repos.trialTests.update(test.id, { results, wrongTopicIds: [t2.id] });
        expect(updated.results).toEqual(results);
        expect(updated.wrongTopicIds).toEqual([t2.id]);
      });

      it('stores one result per lesson, a cleaned name, and wrong topics from several lessons', async () => {
        const { exam, turkce, tarih, t1, t3 } = await seed();
        const results = [
          { lessonId: turkce.id, correct: 30, wrong: 8, empty: 2 },
          { lessonId: tarih.id, correct: 20, wrong: 4, empty: 3 },
        ];
        const test = await repos.trialTests.create({
          examId: exam.id, name: '  Deneme   5 ', date: '2026-10-10', results, wrongTopicIds: [t1.id, t3.id],
        });
        const stored = await repos.trialTests.get(test.id);
        expect(stored?.name).toBe('Deneme 5');
        expect(stored?.results).toEqual(results);
        expect(stored?.wrongTopicIds.sort()).toEqual([t1.id, t3.id].sort());
      });

      it('rejects a test without results or with a lesson twice', async () => {
        const { exam, turkce } = await seed();
        await expect(repos.trialTests.create({ examId: exam.id, date: '2026-10-10', results: [] })).rejects.toThrow();
        const result = { lessonId: turkce.id, correct: 1, wrong: 0, empty: 0 };
        await expect(repos.trialTests.create({ examId: exam.id, date: '2026-10-10', results: [result, result] })).rejects.toThrow();
      });

      it('rejects invalid counts', async () => {
        const { exam, turkce } = await seed();
        await expect(
          repos.trialTests.create({ examId: exam.id, date: '2026-10-10', results: [{ lessonId: turkce.id, correct: -1, wrong: 0, empty: 0 }] }),
        ).rejects.toThrow();
      });

      it('delete hides the test', async () => {
        const { exam, turkce } = await seed();
        const test = await repos.trialTests.create({
          examId: exam.id, date: '2026-10-10', results: [{ lessonId: turkce.id, correct: 1, wrong: 0, empty: 0 }],
        });
        await repos.trialTests.delete(test.id);
        expect(await repos.trialTests.get(test.id)).toBeUndefined();
      });
    });

    describe('backup', () => {
      it('exports everything including soft-deleted records', async () => {
        const { exam, t1 } = await seed();
        await repos.topics.delete(t1.id);
        const data = await repos.backup.exportAll();
        expect(data.exams.map((e) => e.id)).toEqual([exam.id]);
        expect(data.lessons).toHaveLength(2);
        expect(data.topics).toHaveLength(3);
        expect(data.topics.find((t) => t.id === t1.id)?.deletedAt).not.toBeNull();
      });

      it('replace restores an exact copy', async () => {
        const { exam } = await seed();
        const data = await repos.backup.exportAll();
        await repos.exams.create({ name: 'Other', examDate: '2027-01-01' });
        const summary = await repos.backup.restore(data, 'replace');
        expect(summary.added).toBe(1 + 2 + 3);
        expect((await repos.exams.list()).map((e) => e.id)).toEqual([exam.id]);
        expect(await repos.backup.exportAll()).toEqual(data);
      });

      it('merge keeps newer local changes and applies newer incoming ones', async () => {
        const { exam, t1, t2 } = await seed();
        const snapshot = await repos.backup.exportAll();
        await new Promise((r) => setTimeout(r, 5));
        await repos.topics.setStatus([t1.id], 'finished'); // local change after the snapshot
        const extra = await repos.exams.create({ name: 'Local only', examDate: '2027-01-01' });

        // An "other device" backup: t2 renamed later than anything local, plus a brand-new exam.
        const later = new Date(Date.now() + 60_000).toISOString();
        const incoming = structuredClone(snapshot);
        incoming.topics = incoming.topics.map((t) => (t.id === t2.id ? { ...t, name: 'Renamed elsewhere', updatedAt: later } : t));
        incoming.exams.push({ ...incoming.exams[0]!, id: 'remote-exam', name: 'Remote', updatedAt: later });

        const summary = await repos.backup.restore(incoming, 'merge');
        expect(summary.added).toBe(1);
        expect(summary.updated).toBe(1);
        expect((await repos.topics.get(t1.id))?.status).toBe('finished');
        expect((await repos.topics.get(t2.id))?.name).toBe('Renamed elsewhere');
        expect((await repos.exams.list()).map((e) => e.id).sort()).toEqual([exam.id, extra.id, 'remote-exam'].sort());
      });

      it('restore goes back to the backup but keeps records added since', async () => {
        const { exam, turkce } = await seed();
        const snapshot = await repos.backup.exportAll();
        await new Promise((r) => setTimeout(r, 5));
        await repos.lessons.delete(turkce.id); // also deletes its topics
        const tarihTopics = await repos.topics.listByExam(exam.id);
        await repos.topics.rename(tarihTopics[0]!.id, 'Edited after backup');
        const added = await repos.exams.create({ name: 'Added after backup', examDate: '2027-01-01' });

        const summary = await repos.backup.restore(snapshot, 'restore');
        expect(summary.added).toBe(0);
        expect(summary.updated).toBe(4); // turkce, t1, t2 revived; one topic renamed back
        expect((await repos.lessons.listByExam(exam.id)).map((l) => l.name)).toEqual(['Türkçe', 'Tarih']);
        expect((await repos.topics.listByExam(exam.id)).map((t) => t.name).sort()).toEqual(
          ['Cümlede Anlam', 'Sözcükte Anlam', 'İslamiyet Öncesi'].sort(),
        );
        expect((await repos.exams.list()).map((e) => e.id).sort()).toEqual([exam.id, added.id].sort());
        // Reverted records are stamped as the newest change.
        expect((await repos.lessons.get(turkce.id))!.updatedAt > snapshot.lessons[0]!.updatedAt).toBe(true);
      });

      it('notifies subscribers after restore', async () => {
        const listener = vi.fn();
        repos.changes.subscribe(listener);
        await repos.backup.restore({ exams: [], lessons: [], topics: [], trialTests: [], trialTestWrongTopics: [] }, 'merge');
        expect(listener).toHaveBeenCalledWith({ entities: ['exams', 'lessons', 'topics', 'trialTests'] });
      });
    });

    describe('changes feed', () => {
      it('notifies subscribers after writes, and stops after unsubscribe', async () => {
        const listener = vi.fn();
        const unsubscribe = repos.changes.subscribe(listener);
        const exam = await repos.exams.create({ name: 'KPSS', examDate: '2026-12-01' });
        expect(listener).toHaveBeenLastCalledWith({ entities: ['exams'] });
        unsubscribe();
        await repos.lessons.create({ examId: exam.id, name: 'Türkçe' });
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });
  });
}
