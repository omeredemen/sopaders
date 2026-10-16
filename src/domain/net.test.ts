import { describe, expect, it } from 'vitest';
import { calculateNet, isValidWrongPenalty, validateTrialCounts } from './net';

describe('calculateNet', () => {
  it('cancels one correct per four wrong by default', () => {
    expect(calculateNet(30, 8)).toBe(28);
    expect(calculateNet(30, 5)).toBe(28.75);
  });

  it('uses the given penalty', () => {
    expect(calculateNet(30, 9, 3)).toBe(27);
  });

  it('ignores wrong answers when penalty is 0', () => {
    expect(calculateNet(30, 9, 0)).toBe(30);
  });

  it('can be negative', () => {
    expect(calculateNet(0, 8)).toBe(-2);
  });
});

describe('validateTrialCounts', () => {
  it('accepts non-negative integers', () => {
    expect(validateTrialCounts({ correct: 10, wrong: 2, empty: 0 })).toBeNull();
  });

  it('rejects negatives, fractions and all-zero', () => {
    expect(validateTrialCounts({ correct: -1, wrong: 0, empty: 0 })).toBe('negative');
    expect(validateTrialCounts({ correct: 1.5, wrong: 0, empty: 0 })).toBe('not_integer');
    expect(validateTrialCounts({ correct: Number.NaN, wrong: 0, empty: 0 })).toBe('not_integer');
    expect(validateTrialCounts({ correct: 0, wrong: 0, empty: 0 })).toBe('all_zero');
  });
});

describe('isValidWrongPenalty', () => {
  it('allows zero and positive numbers only', () => {
    expect(isValidWrongPenalty(4)).toBe(true);
    expect(isValidWrongPenalty(0)).toBe(true);
    expect(isValidWrongPenalty(-1)).toBe(false);
    expect(isValidWrongPenalty(Number.NaN)).toBe(false);
  });
});
