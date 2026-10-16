import { describe, expect, it } from 'vitest';
import { dailyPace, roundToOneDecimal } from './pace';

describe('dailyPace', () => {
  it('divides unfinished topics by days left', () => {
    expect(dailyPace(34, 10)).toEqual({ kind: 'pace', unfinished: 34, daysLeft: 10, perDay: 3.4 });
  });

  it('treats a deadline of today as one remaining day', () => {
    expect(dailyPace(5, 0)).toEqual({ kind: 'pace', unfinished: 5, daysLeft: 0, perDay: 5 });
  });

  it('reports overdue when the deadline has passed', () => {
    expect(dailyPace(5, -3)).toEqual({ kind: 'overdue', unfinished: 5, daysOverdue: 3 });
  });

  it('reports done when nothing is unfinished, even past the deadline', () => {
    expect(dailyPace(0, 10)).toEqual({ kind: 'done' });
    expect(dailyPace(0, -2)).toEqual({ kind: 'done' });
  });
});

describe('roundToOneDecimal', () => {
  it('rounds half up to one decimal', () => {
    expect(roundToOneDecimal(3.44)).toBe(3.4);
    expect(roundToOneDecimal(3.45)).toBe(3.5);
    expect(roundToOneDecimal(10 / 3)).toBe(3.3);
  });
});
