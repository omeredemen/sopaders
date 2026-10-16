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
