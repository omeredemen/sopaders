import { describe, expect, it } from 'vitest';
import { netSeriesByLesson, netStats, topicsToMarkForReview } from './trials';

const test = (id: string, lessonId: string, date: string, correct: number, wrong: number, createdAt = '2026-01-01T00:00:00Z') => ({
  id,
  lessonId,
  date,
  createdAt,
  correct,
  wrong,
});

describe('netSeriesByLesson', () => {
  it('groups by lesson in chronological order and computes net with the penalty', () => {
    const series = netSeriesByLesson(
      [
        test('b', 'tr', '2026-10-10', 30, 8),
        test('a', 'tr', '2026-10-01', 25, 4),
        test('c', 'th', '2026-10-05', 20, 0),
        test('d', 'tr', '2026-10-10', 32, 4, '2026-01-02T00:00:00Z'),
      ],
      4,
    );
    expect(series.get('tr')).toEqual([
      { trialTestId: 'a', date: '2026-10-01', net: 24 },
      { trialTestId: 'b', date: '2026-10-10', net: 28 },
      { trialTestId: 'd', date: '2026-10-10', net: 31 },
    ]);
    expect(series.get('th')).toEqual([{ trialTestId: 'c', date: '2026-10-05', net: 20 }]);
  });

  it('respects a zero penalty', () => {
    expect(netSeriesByLesson([test('a', 'tr', '2026-10-01', 25, 4)], 0).get('tr')?.[0]?.net).toBe(25);
  });
});

describe('netStats', () => {
  it('returns last, average, best and change', () => {
    const points = [
      { trialTestId: 'a', date: '2026-10-01', net: 24 },
      { trialTestId: 'b', date: '2026-10-05', net: 30 },
      { trialTestId: 'c', date: '2026-10-10', net: 27 },
    ];
    expect(netStats(points)).toEqual({ count: 3, last: 27, average: 27, best: 30, change: -3 });
  });

  it('has no change with a single test and null for none', () => {
    expect(netStats([{ trialTestId: 'a', date: '2026-10-01', net: 10 }])?.change).toBeNull();
    expect(netStats([])).toBeNull();
  });
});

describe('topicsToMarkForReview', () => {
  it('marks all wrong topics of a new test (deduplicated)', () => {
    expect(topicsToMarkForReview([], ['t1', 't2', 't1'])).toEqual(['t1', 't2']);
  });

  it('only marks newly added topics when editing', () => {
    expect(topicsToMarkForReview(['t1', 't2'], ['t2', 't3'])).toEqual(['t3']);
  });
});
