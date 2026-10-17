import { calculateNet, validateTrialCounts, type TrialCountsError } from './net';
import type { Id, LocalDate, TrialLessonResult, TrialTest } from './types';

export interface NetPoint {
  trialTestId: Id;
  date: LocalDate;
  net: number;
}

export interface NetStats {
  count: number;
  last: number;
  average: number;
  best: number;
  /** last − previous; null with fewer than two tests. */
  change: number | null;
}

type TrialForNet = Pick<TrialTest, 'id' | 'date' | 'createdAt' | 'results'>;

const chronological = (a: TrialForNet, b: TrialForNet) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

/** Sum of the answer counts over all lessons of a test. */
export function totalCounts(results: readonly TrialLessonResult[]): { correct: number; wrong: number; empty: number } {
  return results.reduce(
    (sum, r) => ({ correct: sum.correct + r.correct, wrong: sum.wrong + r.wrong, empty: sum.empty + r.empty }),
    { correct: 0, wrong: 0, empty: 0 },
  );
}

/** Total net of a test: the sum of its lesson nets. */
export function totalNet(results: readonly TrialLessonResult[], wrongPenalty: number): number {
  return results.reduce((sum, r) => sum + calculateNet(r.correct, r.wrong, wrongPenalty), 0);
}

/** Net trend per lesson: lessonId → points in chronological order (one point per test that has the lesson). */
export function netSeriesByLesson(tests: readonly TrialForNet[], wrongPenalty: number): Map<Id, NetPoint[]> {
  const series = new Map<Id, NetPoint[]>();
  for (const test of [...tests].sort(chronological)) {
    for (const r of test.results) {
      const points = series.get(r.lessonId) ?? [];
      points.push({ trialTestId: test.id, date: test.date, net: calculateNet(r.correct, r.wrong, wrongPenalty) });
      series.set(r.lessonId, points);
    }
  }
  return series;
}

/**
 * Total net trend over full trial tests, i.e. tests with results for more than one lesson.
 * Single-lesson tests (branş denemesi) are left out: their total would look like a drop.
 */
export function totalNetSeries(tests: readonly TrialForNet[], wrongPenalty: number): NetPoint[] {
  return [...tests]
    .filter((t) => t.results.length > 1)
    .sort(chronological)
    .map((t) => ({ trialTestId: t.id, date: t.date, net: totalNet(t.results, wrongPenalty) }));
}

/** Headline numbers for a net series. Returns null for an empty series. */
export function netStats(points: readonly NetPoint[]): NetStats | null {
  const last = points.at(-1);
  if (!last) return null;
  const nets = points.map((p) => p.net);
  const previous = points.at(-2);
  return {
    count: points.length,
    last: last.net,
    average: nets.reduce((sum, n) => sum + n, 0) / nets.length,
    best: Math.max(...nets),
    change: previous ? last.net - previous.net : null,
  };
}

/** Upper bound for a lesson's question count, to catch typos like 300 instead of 30. */
export const MAX_QUESTION_COUNT = 200;

export function isValidQuestionCount(count: number): boolean {
  return Number.isInteger(count) && count > 0 && count <= MAX_QUESTION_COUNT;
}

/** Returns the first lesson id with an invalid count, or null when all are valid. */
export function findInvalidQuestionCount(counts: Readonly<Record<Id, number>>): Id | null {
  return Object.entries(counts).find(([, count]) => !isValidQuestionCount(count))?.[0] ?? null;
}

/**
 * Empty answers of a lesson with a fixed question count: count − correct − wrong.
 * Null when correct + wrong is more than the count.
 */
export function emptyFromQuestionCount(questionCount: number, correct: number, wrong: number): number | null {
  const empty = questionCount - correct - wrong;
  return empty >= 0 ? empty : null;
}

export type TrialResultsError =
  | { code: 'no_results' }
  | { code: 'duplicate_lesson'; lessonId: Id }
  | { code: 'counts'; lessonId: Id; error: TrialCountsError };

/** Validates a test's lesson results. Returns null when valid. */
export function validateTrialResults(results: readonly TrialLessonResult[]): TrialResultsError | null {
  if (results.length === 0) return { code: 'no_results' };
  const seen = new Set<Id>();
  for (const r of results) {
    if (seen.has(r.lessonId)) return { code: 'duplicate_lesson', lessonId: r.lessonId };
    seen.add(r.lessonId);
    const error = validateTrialCounts(r);
    if (error) return { code: 'counts', lessonId: r.lessonId, error };
  }
  return null;
}

/**
 * Topics that should be set to "needs review" after saving a trial test:
 * the wrong topics that were not already marked on this test before.
 * (Re-saving an edited test must not undo review work done since.)
 */
export function topicsToMarkForReview(previousWrongTopicIds: readonly Id[], nextWrongTopicIds: readonly Id[]): Id[] {
  const before = new Set(previousWrongTopicIds);
  return [...new Set(nextWrongTopicIds)].filter((id) => !before.has(id));
}
