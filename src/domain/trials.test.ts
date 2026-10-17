import { describe, expect, it } from 'vitest';
import {
  emptyFromQuestionCount,
  findInvalidQuestionCount,
  netSeriesByLesson,
  netStats,
  topicsToMarkForReview,
  totalCounts,
  totalNet,
  totalNetSeries,
  validateTrialResults,
} from './trials';

const r = (lessonId: string, correct: number, wrong: number, empty = 0) => ({ lessonId, correct, wrong, empty });

const test = (id: string, date: string, results: ReturnType<typeof r>[], createdAt = '2026-01-01T00:00:00Z') => ({
  id,
  date,
  createdAt,
  results,
});

describe('totalNet / totalCounts', () => {
  it('sums the lesson nets and counts', () => {
    const results = [r('tr', 30, 8, 2), r('th', 20, 4, 3)];
    expect(totalNet(results, 4)).toBe(28 + 19);
    expect(totalNet(results, 0)).toBe(50);
    expect(totalCounts(results)).toEqual({ correct: 50, wrong: 12, empty: 5 });
  });
});

describe('netSeriesByLesson', () => {
  it('groups by lesson in chronological order and computes net with the penalty', () => {
    const series = netSeriesByLesson(
      [
        test('b', '2026-10-10', [r('tr', 30, 8), r('th', 18, 0)]),
        test('a', '2026-10-01', [r('tr', 25, 4)]),
        test('c', '2026-10-05', [r('th', 20, 0)]),
        test('d', '2026-10-10', [r('tr', 32, 4)], '2026-01-02T00:00:00Z'),
      ],
      4,
    );
    expect(series.get('tr')).toEqual([
      { trialTestId: 'a', date: '2026-10-01', net: 24 },
      { trialTestId: 'b', date: '2026-10-10', net: 28 },
      { trialTestId: 'd', date: '2026-10-10', net: 31 },
    ]);
    expect(series.get('th')).toEqual([
      { trialTestId: 'c', date: '2026-10-05', net: 20 },
      { trialTestId: 'b', date: '2026-10-10', net: 18 },
    ]);
  });

  it('respects a zero penalty', () => {
    expect(netSeriesByLesson([test('a', '2026-10-01', [r('tr', 25, 4)])], 0).get('tr')?.[0]?.net).toBe(25);
  });
});

describe('totalNetSeries', () => {
  it('uses only tests with more than one lesson, in chronological order', () => {
    const series = totalNetSeries(
      [
        test('b', '2026-10-10', [r('tr', 30, 8), r('th', 18, 0)]),
        test('a', '2026-10-01', [r('tr', 25, 4), r('th', 10, 4)]),
        test('single', '2026-10-05', [r('tr', 20, 0)]),
      ],
      4,
    );
    expect(series).toEqual([
      { trialTestId: 'a', date: '2026-10-01', net: 33 },
      { trialTestId: 'b', date: '2026-10-10', net: 46 },
    ]);
  });
});

describe('validateTrialResults', () => {
  it('requires at least one lesson, no duplicates and valid counts', () => {
    expect(validateTrialResults([r('tr', 1, 0)])).toBeNull();
    expect(validateTrialResults([])).toEqual({ code: 'no_results' });
    expect(validateTrialResults([r('tr', 1, 0), r('tr', 2, 0)])).toEqual({ code: 'duplicate_lesson', lessonId: 'tr' });
    expect(validateTrialResults([r('tr', 1, 0), r('th', 0, 0)])).toEqual({ code: 'counts', lessonId: 'th', error: 'all_zero' });
    expect(validateTrialResults([r('tr', -1, 0)])).toEqual({ code: 'counts', lessonId: 'tr', error: 'negative' });
  });
});

describe('question counts', () => {
  it('computes empty answers from the fixed count, null when over it', () => {
    expect(emptyFromQuestionCount(30, 24, 4)).toBe(2);
    expect(emptyFromQuestionCount(30, 26, 4)).toBe(0);
    expect(emptyFromQuestionCount(30, 27, 4)).toBeNull();
  });

  it('finds the first invalid count (positive integers up to 200)', () => {
    expect(findInvalidQuestionCount({ a: 30, b: 200 })).toBeNull();
    expect(findInvalidQuestionCount({ a: 30, b: 0 })).toBe('b');
    expect(findInvalidQuestionCount({ a: 2.5 })).toBe('a');
    expect(findInvalidQuestionCount({ a: 201 })).toBe('a');
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
