import { addDays, daysBetween } from './dates';
import type { LocalDate } from './types';

export type DailyPace =
  /** Nothing left to study. */
  | { kind: 'done' }
  /** Deadline has passed with topics still unfinished. */
  | { kind: 'overdue'; unfinished: number; daysOverdue: number }
  /** On schedule: `perDay` topics must be finished per day. */
  | { kind: 'pace'; unfinished: number; daysLeft: number; perDay: number };

/**
 * Daily pace = unfinished topics / days left until the deadline.
 * When the deadline is today (daysLeft = 0) today still counts as one study day,
 * so the divisor is never zero.
 */
export function dailyPace(unfinished: number, daysLeft: number): DailyPace {
  if (unfinished <= 0) return { kind: 'done' };
  if (daysLeft < 0) return { kind: 'overdue', unfinished, daysOverdue: -daysLeft };
  const divisor = Math.max(daysLeft, 1);
  return { kind: 'pace', unfinished, daysLeft, perDay: unfinished / divisor };
}

/** Rounds to one decimal place (3.44 -> 3.4, 3.45 -> 3.5). */
export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export type TempoProjection =
  /** Nothing left to study. */
  | { kind: 'done' }
  /** No topic finished yet, so there is no tempo to project from. */
  | { kind: 'none' }
  /** At the current tempo the last topic is finished on `date`. */
  | { kind: 'finish'; date: LocalDate; onTrack: boolean };

export type StudyTempo =
  /** The start date is in the future. */
  | { kind: 'notStarted'; daysToStart: number }
  /** `perDay` topics finished per day since the start date. */
  | { kind: 'tempo'; done: number; daysStudied: number; perDay: number; projection: TempoProjection };

/**
 * Actual tempo = finished topics / days since the study start date. The start day
 * and today both count as study days, so the divisor is at least 1.
 * The projection assumes the same tempo from tomorrow on and compares the finish
 * date with the deadline.
 */
export function studyTempo(input: {
  done: number;
  unfinished: number;
  startDate: LocalDate;
  deadline: LocalDate;
  today: LocalDate;
}): StudyTempo {
  const { done, unfinished, startDate, deadline, today } = input;
  const elapsed = daysBetween(startDate, today);
  if (elapsed < 0) return { kind: 'notStarted', daysToStart: -elapsed };

  const daysStudied = elapsed + 1;
  const perDay = done / daysStudied;
  let projection: TempoProjection;
  if (unfinished <= 0) projection = { kind: 'done' };
  else if (perDay === 0) projection = { kind: 'none' };
  else {
    const date = addDays(today, Math.ceil(unfinished / perDay));
    projection = { kind: 'finish', date, onTrack: daysBetween(date, deadline) >= 0 };
  }
  return { kind: 'tempo', done, daysStudied, perDay, projection };
}
