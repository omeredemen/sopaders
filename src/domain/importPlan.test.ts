import { describe, expect, it } from 'vitest';
import {
  cleanName,
  findNewLessonCandidates,
  findSimilarLesson,
  foldName,
  normalizeName,
  planTopicImport,
  type LessonDecision,
} from './importPlan';

describe('name helpers', () => {
  it('cleanName trims and collapses whitespace', () => {
    expect(cleanName('  Sözcükte   Anlam ')).toBe('Sözcükte Anlam');
  });

  it('normalizeName lowercases with Turkish rules', () => {
    expect(normalizeName('İSLAMİYET')).toBe('islamiyet');
    expect(normalizeName('IRMAK')).toBe('ırmak');
  });
});

describe('planTopicImport', () => {
  const existingLessons = [{ id: 'l-tr', name: 'Türkçe' }];
  const existingTopics = [{ lessonId: 'l-tr', name: 'Sözcükte Anlam' }];

  it('matches existing lessons case-insensitively and creates missing ones', () => {
    const plan = planTopicImport(
      [
        { lesson: 'TÜRKÇE', topic: 'Cümlede Anlam' },
        { lesson: 'Tarih', topic: 'İlk Türk Devletleri' },
        { lesson: 'tarih', topic: 'Osmanlı Kuruluş' },
      ],
      existingLessons,
      existingTopics,
    );
    expect(plan.newLessons).toEqual(['Tarih']);
    expect(plan.topics).toEqual([
      { lessonName: 'Türkçe', lessonId: 'l-tr', topicName: 'Cümlede Anlam' },
      { lessonName: 'Tarih', lessonId: null, topicName: 'İlk Türk Devletleri' },
      { lessonName: 'Tarih', lessonId: null, topicName: 'Osmanlı Kuruluş' },
    ]);
  });

  it('skips topics that already exist or repeat within the file', () => {
    const plan = planTopicImport(
      [
        { lesson: 'Türkçe', topic: ' sözcükte  anlam ' },
        { lesson: 'Tarih', topic: 'Kurtuluş Savaşı' },
        { lesson: 'Tarih', topic: 'KURTULUŞ SAVAŞI' },
      ],
      existingLessons,
      existingTopics,
    );
    expect(plan.topics.map((t) => t.topicName)).toEqual(['Kurtuluş Savaşı']);
    expect(plan.duplicates).toHaveLength(2);
  });

  it('allows the same topic name in different lessons', () => {
    const plan = planTopicImport(
      [{ lesson: 'Matematik', topic: 'Sözcükte Anlam' }],
      existingLessons,
      existingTopics,
    );
    expect(plan.topics).toHaveLength(1);
  });

  it('reports rows with empty lesson or topic as invalid', () => {
    const plan = planTopicImport(
      [
        { lesson: '', topic: 'X' },
        { lesson: 'Tarih', topic: '   ' },
      ],
      [],
      [],
    );
    expect(plan.invalid).toHaveLength(2);
    expect(plan.topics).toHaveLength(0);
    expect(plan.newLessons).toHaveLength(0);
  });
});

describe('foldName / findSimilarLesson', () => {
  it('ignores Turkish letters, case and punctuation', () => {
    expect(foldName('TÜRKÇE')).toBe('turkce');
    expect(foldName('Turkce')).toBe('turkce');
    expect(foldName('TARIH')).toBe(foldName('Tarih'));
    expect(foldName('Eğitim  Bilimleri.')).toBe('egitim bilimleri');
  });

  it('suggests an existing lesson for spelling variants', () => {
    const lessons = [{ id: 'tr', name: 'Türkçe' }, { id: 'th', name: 'Tarih' }];
    expect(findSimilarLesson('Turkce', lessons)?.id).toBe('tr');
    expect(findSimilarLesson('TARIH', lessons)?.id).toBe('th');
    expect(findSimilarLesson('Coğrafya', lessons)).toBeUndefined();
  });
});

describe('planTopicImport with lesson decisions', () => {
  const existingLessons = [{ id: 'l-tr', name: 'Türkçe' }];
  const existingTopics = [{ lessonId: 'l-tr', name: 'Paragraf' }];
  const rows = [
    { lesson: 'Turkce', topic: 'Paragraf' }, // duplicate once mapped to Türkçe
    { lesson: 'Turkce', topic: 'Ses Bilgisi' },
    { lesson: 'Tarih', topic: 'Kurtuluş Savaşı' },
    { lesson: 'Coğrafya', topic: 'İklim' },
  ];

  it('lists unknown lessons with topic counts and similar-lesson suggestions', () => {
    expect(findNewLessonCandidates(rows, existingLessons, existingTopics)).toEqual([
      { name: 'Turkce', key: 'turkce', topicCount: 2, similarLessonId: 'l-tr' },
      { name: 'Tarih', key: 'tarih', topicCount: 1, similarLessonId: null },
      { name: 'Coğrafya', key: 'coğrafya', topicCount: 1, similarLessonId: null },
    ]);
  });

  it('creates by default, maps to an existing lesson, or skips', () => {
    const decisions = new Map<string, LessonDecision>([
      ['turkce', { kind: 'existing', lessonId: 'l-tr' }],
      ['coğrafya', { kind: 'skip' }],
    ]);
    const plan = planTopicImport(rows, existingLessons, existingTopics, { lessonDecisions: decisions });
    expect(plan.newLessons).toEqual(['Tarih']);
    expect(plan.topics).toEqual([
      { lessonName: 'Türkçe', lessonId: 'l-tr', topicName: 'Ses Bilgisi' },
      { lessonName: 'Tarih', lessonId: null, topicName: 'Kurtuluş Savaşı' },
    ]);
    expect(plan.duplicates).toEqual([{ lesson: 'Turkce', topic: 'Paragraf' }]);
    expect(plan.skipped).toEqual([{ lesson: 'Coğrafya', topic: 'İklim' }]);
  });

  it('falls back to creating when the chosen lesson no longer exists', () => {
    const plan = planTopicImport([{ lesson: 'X', topic: 'Y' }], [], [], {
      lessonDecisions: new Map([['x', { kind: 'existing', lessonId: 'gone' }]]),
    });
    expect(plan.newLessons).toEqual(['X']);
  });
});
