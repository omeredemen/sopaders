import { describe, expect, it } from 'vitest';
import { summarizeByLesson, summarizeStatuses } from './statusSummary';

describe('summarizeStatuses', () => {
  it('counts and percentages per status, in config order', () => {
    const s = summarizeStatuses([
      { status: 'finished' },
      { status: 'finished' },
      { status: 'started' },
      { status: 'needs_review' },
    ]);
    expect(s.total).toBe(4);
    expect(s.done).toBe(2);
    expect(s.unfinished).toBe(2);
    expect(s.donePercent).toBe(50);
    expect(s.byStatus).toEqual([
      { statusId: 'not_started', count: 0, percent: 0 },
      { statusId: 'started', count: 1, percent: 25 },
      { statusId: 'finished', count: 2, percent: 50 },
      { statusId: 'needs_review', count: 1, percent: 25 },
    ]);
  });

  it('handles no topics without dividing by zero', () => {
    const s = summarizeStatuses([]);
    expect(s.total).toBe(0);
    expect(s.donePercent).toBe(0);
    expect(s.byStatus.every((b) => b.count === 0 && b.percent === 0)).toBe(true);
  });

  it('counts unknown statuses as the default status', () => {
    const s = summarizeStatuses([{ status: 'mystery' }]);
    expect(s.byStatus.find((b) => b.statusId === 'not_started')?.count).toBe(1);
    expect(s.unfinished).toBe(1);
  });
});

describe('summarizeByLesson', () => {
  it('groups topics by lesson and keeps lesson order, including empty lessons', () => {
    const lessons = [
      { id: 'l1', name: 'Türkçe' },
      { id: 'l2', name: 'Tarih' },
      { id: 'l3', name: 'Coğrafya' },
    ];
    const topics = [
      { lessonId: 'l2', status: 'finished' },
      { lessonId: 'l1', status: 'started' },
      { lessonId: 'l2', status: 'not_started' },
      { lessonId: 'other', status: 'finished' },
    ];
    const result = summarizeByLesson(lessons, topics);
    expect(result.map((r) => [r.lessonName, r.summary.total, r.summary.done])).toEqual([
      ['Türkçe', 1, 0],
      ['Tarih', 2, 1],
      ['Coğrafya', 0, 0],
    ]);
  });
});
