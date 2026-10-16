import type { LocalDate } from '@/domain/types';

/** Turkish display formatting. Keep all user-facing number/date formatting here. */

const longDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "2026-12-01" → "1 Aralık 2026" */
export function formatDate(value: LocalDate): string {
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return longDate.format(new Date(Date.UTC(y, m - 1, d)));
}

/** Relative wording for a day count from daysLeft(). */
export function formatDaysLeft(days: number): string {
  if (days > 1) return `${days} gün kaldı`;
  if (days === 1) return 'Yarın';
  if (days === 0) return 'Bugün';
  return `${-days} gün geçti`;
}

/** Decimal with a fixed number of fraction digits, Turkish style: 3.4 → "3,4". */
export function formatDecimal(value: number, digits = 1): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Whole percentage, Turkish style: 42.6 → "%43". */
export function formatPercent(value: number): string {
  return `%${Math.round(value)}`;
}

/** Parses user-typed numbers that may use a decimal comma ("2,5"). Returns NaN if invalid. */
export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(',', '.');
  return normalized === '' ? Number.NaN : Number(normalized);
}

/** Net score with up to two decimals: 28.75 → "28,75", 27.5 → "27,5", 28 → "28". */
export function formatNet(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Signed change with up to two decimals: 2.5 → "+2,5", -1 → "−1", 0 → "0". */
export function formatSignedNet(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${formatNet(Math.abs(value))}`;
}

const shortDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "2026-10-12" → "12 Eki" */
export function formatShortDate(value: LocalDate): string {
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return shortDate.format(new Date(Date.UTC(y, m - 1, d)));
}

const dateTime = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** ISO timestamp → local "15 Ekim 2026 22:30". Returns "" for invalid input. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : dateTime.format(date);
}
