import { describe, expect, it } from 'vitest';
import { daysBetween, daysLeft, effectiveDeadline, isLocalDate, toLocalDate } from './dates';

describe('isLocalDate', () => {
  it('accepts real dates only', () => {
    expect(isLocalDate('2026-10-15')).toBe(true);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('15.10.2026')).toBe(false);
    expect(isLocalDate('')).toBe(false);
  });
});

describe('daysBetween / daysLeft', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-10-15', '2026-10-16')).toBe(1);
    expect(daysBetween('2026-10-15', '2026-10-15')).toBe(0);
    expect(daysBetween('2026-10-15', '2026-10-10')).toBe(-5);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('is unaffected by daylight-saving transitions', () => {
    // Europe switched clocks on 2026-03-29 and 2026-10-25.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('daysLeft is 0 on the day itself and negative after', () => {
    expect(daysLeft('2026-11-01', '2026-10-15')).toBe(17);
    expect(daysLeft('2026-10-15', '2026-10-15')).toBe(0);
    expect(daysLeft('2026-10-14', '2026-10-15')).toBe(-1);
  });

  it('throws on invalid input', () => {
    expect(() => daysBetween('nope', '2026-10-15')).toThrow();
  });
});

describe('toLocalDate', () => {
  it('formats using local date parts', () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('effectiveDeadline', () => {
  it('prefers the study deadline', () => {
    expect(effectiveDeadline({ examDate: '2026-12-01', studyDeadline: '2026-11-15' })).toBe('2026-11-15');
  });

  it('falls back to the exam date', () => {
    expect(effectiveDeadline({ examDate: '2026-12-01', studyDeadline: null })).toBe('2026-12-01');
  });
});
