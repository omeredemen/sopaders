import type { Exam, LocalDate } from './types';

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** True if the string is a real calendar date in "YYYY-MM-DD" form. */
export function isLocalDate(value: string): value is LocalDate {
  const match = LOCAL_DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toUtcDay(value: LocalDate): number {
  if (!isLocalDate(value)) throw new Error(`Invalid date: "${value}"`);
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** The calendar date of a Date object in the device's local timezone. */
export function toLocalDate(date: Date): LocalDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayLocalDate(): LocalDate {
  return toLocalDate(new Date());
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / MS_PER_DAY);
}

/** Days left until `target`: 1 = tomorrow, 0 = today, negative = past. */
export function daysLeft(target: LocalDate, today: LocalDate): number {
  return daysBetween(today, target);
}

/** The date daily pace is measured against: the study deadline if set, otherwise the exam date. */
export function effectiveDeadline(exam: Pick<Exam, 'examDate' | 'studyDeadline'>): LocalDate {
  return exam.studyDeadline ?? exam.examDate;
}
