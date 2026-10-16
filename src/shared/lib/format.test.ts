import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDaysLeft,
  formatDecimal,
  formatNet,
  formatPercent,
  formatShortDate,
  formatSignedNet,
  parseDecimal,
} from './format';

describe('format', () => {
  it('formats dates in Turkish', () => {
    expect(formatDate('2026-12-01')).toBe('1 Aralık 2026');
  });

  it('describes days left', () => {
    expect(formatDaysLeft(17)).toBe('17 gün kaldı');
    expect(formatDaysLeft(1)).toBe('Yarın');
    expect(formatDaysLeft(0)).toBe('Bugün');
    expect(formatDaysLeft(-3)).toBe('3 gün geçti');
  });

  it('uses a decimal comma and leading percent sign', () => {
    expect(formatDecimal(3.4)).toBe('3,4');
    expect(formatDecimal(3)).toBe('3,0');
    expect(formatPercent(42.6)).toBe('%43');
  });

  it('parses decimal commas', () => {
    expect(parseDecimal('2,5')).toBe(2.5);
    expect(parseDecimal(' 4 ')).toBe(4);
    expect(parseDecimal('')).toBeNaN();
    expect(parseDecimal('abc')).toBeNaN();
  });
});

describe('net formatting', () => {
  it('formats nets with up to two decimals', () => {
    expect(formatNet(28.75)).toBe('28,75');
    expect(formatNet(27.5)).toBe('27,5');
    expect(formatNet(28)).toBe('28');
    expect(formatNet(-2)).toBe('-2');
  });

  it('formats signed changes', () => {
    expect(formatSignedNet(2.5)).toBe('+2,5');
    expect(formatSignedNet(-1.25)).toBe('−1,25');
    expect(formatSignedNet(0)).toBe('0');
  });

  it('formats short dates', () => {
    expect(formatShortDate('2026-10-12')).toBe('12 Eki');
  });
});
