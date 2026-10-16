import { calculateNet } from './net';
import type { Id, LocalDate, TrialTest } from './types';

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

type TrialForNet = Pick<TrialTest, 'id' | 'lessonId' | 'date' | 'createdAt' | 'correct' | 'wrong'>;

const chronological = (a: TrialForNet, b: TrialForNet) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

/** Net trend per lesson: lessonId → points in chronological order (one point per test). */
export function netSeriesByLesson(tests: readonly TrialForNet[], wrongPenalty: number): Map<Id, NetPoint[]> {
  const series = new Map<Id, NetPoint[]>();
  for (const test of [...tests].sort(chronological)) {
    const points = series.get(test.lessonId) ?? [];
    points.push({ trialTestId: test.id, date: test.date, net: calculateNet(test.correct, test.wrong, wrongPenalty) });
    series.set(test.lessonId, points);
  }
  return series;
}

/** Headline numbers for one lesson's net series. Returns null for an empty series. */
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

/**
 * Topics that should be set to "needs review" after saving a trial test:
 * the wrong topics that were not already marked on this test before.
 * (Re-saving an edited test must not undo review work done since.)
 */
export function topicsToMarkForReview(previousWrongTopicIds: readonly Id[], nextWrongTopicIds: readonly Id[]): Id[] {
  const before = new Set(previousWrongTopicIds);
  return [...new Set(nextWrongTopicIds)].filter((id) => !before.has(id));
}
