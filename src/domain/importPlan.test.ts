import { describe, expect, it } from 'vitest';
import { cleanName, normalizeName, planTopicImport } from './importPlan';

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
