/**
 * The single source of truth for topic statuses.
 *
 * To add a status, append an entry here. Everything else (status chips, the
 * tap-to-cycle order, dashboard breakdowns, daily pace) reads from this list.
 *
 * - `id` is stored in the database. Never rename an existing id; add a new one instead.
 * - `countsAsDone` decides whether a topic is excluded from "unfinished" (daily pace, progress %).
 * - Array order is the tap-to-cycle order and the order in charts/legends.
 * - Colors are validated as a categorical set (light + dark). They are never shown
 *   without the label, so status is never conveyed by color alone.
 */
export interface TopicStatusConfig {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly countsAsDone: boolean;
}

export const TOPIC_STATUSES = [
  { id: 'not_started', label: 'Başlanmadı', color: '#7c8796', countsAsDone: false },
  { id: 'started', label: 'Başlandı', color: '#2563eb', countsAsDone: false },
  { id: 'finished', label: 'Bitti', color: '#16a34a', countsAsDone: true },
  { id: 'needs_review', label: 'Tekrar edilecek', color: '#c2410c', countsAsDone: false },
] as const satisfies readonly TopicStatusConfig[];

export type TopicStatusId = (typeof TOPIC_STATUSES)[number]['id'];

/** Status given to newly created or imported topics. */
export const DEFAULT_TOPIC_STATUS_ID: TopicStatusId = 'not_started';

/** Status applied to topics marked wrong in a trial test. */
export const REVIEW_TOPIC_STATUS_ID: TopicStatusId = 'needs_review';
