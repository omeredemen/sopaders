import { describe, expect, it } from 'vitest';
import { dailyPace, roundToOneDecimal, studyTempo } from './pace';

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

describe('studyTempo', () => {
  const base = { startDate: '2026-10-01', deadline: '2026-11-30', today: '2026-10-10' };

  it('divides finished topics by days since the start (both ends included)', () => {
    const t = studyTempo({ ...base, done: 20, unfinished: 40 });
    // 20 topics in 10 days → 2/day; 40 left → 20 more days → 30 Oct
    expect(t).toEqual({
      kind: 'tempo', done: 20, daysStudied: 10, perDay: 2,
      projection: { kind: 'finish', date: '2026-10-30', onTrack: true },
    });
  });

  it('counts the start day itself as one day', () => {
    const t = studyTempo({ ...base, today: '2026-10-01', done: 3, unfinished: 1 });
    expect(t).toMatchObject({ kind: 'tempo', daysStudied: 1, perDay: 3 });
  });

  it('is behind when the projected finish is after the deadline (finishing on it is fine)', () => {
    expect(studyTempo({ ...base, done: 10, unfinished: 52 })).toMatchObject({
      projection: { kind: 'finish', date: '2026-12-01', onTrack: false },
    });
    expect(studyTempo({ ...base, done: 10, unfinished: 51 })).toMatchObject({
      projection: { onTrack: true },
    });
  });

  it('rounds the remaining days up', () => {
    // 2/day, 5 left → 2.5 → 3 days
    expect(studyTempo({ ...base, done: 20, unfinished: 5 })).toMatchObject({ projection: { date: '2026-10-13' } });
  });

  it('has no projection before the first finished topic, and is done when nothing is left', () => {
    expect(studyTempo({ ...base, done: 0, unfinished: 5 })).toMatchObject({ perDay: 0, projection: { kind: 'none' } });
    expect(studyTempo({ ...base, done: 5, unfinished: 0 })).toMatchObject({ projection: { kind: 'done' } });
  });

  it('reports not started when the start date is in the future', () => {
    expect(studyTempo({ ...base, startDate: '2026-10-13', done: 0, unfinished: 5 })).toEqual({ kind: 'notStarted', daysToStart: 3 });
  });
});
