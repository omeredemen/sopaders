export const DEFAULT_WRONG_PENALTY = 4;

/**
 * Net score: correct - wrong / wrongPenalty.
 * With the default penalty of 4, four wrong answers cancel one correct answer.
 * A penalty of 0 (or less) means wrong answers are not penalized.
 */
export function calculateNet(correct: number, wrong: number, wrongPenalty: number = DEFAULT_WRONG_PENALTY): number {
  if (!(wrongPenalty > 0)) return correct;
  return correct - wrong / wrongPenalty;
}

export interface TrialCounts {
  correct: number;
  wrong: number;
  empty: number;
}

export type TrialCountsError = 'not_integer' | 'negative' | 'all_zero';

/** Validates the counts entered for a trial test. Returns null when valid. */
export function validateTrialCounts({ correct, wrong, empty }: TrialCounts): TrialCountsError | null {
  const values = [correct, wrong, empty];
  if (values.some((v) => !Number.isInteger(v))) return 'not_integer';
  if (values.some((v) => v < 0)) return 'negative';
  if (correct + wrong + empty === 0) return 'all_zero';
  return null;
}

export function isValidWrongPenalty(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}
