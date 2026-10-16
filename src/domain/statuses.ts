import {
  DEFAULT_TOPIC_STATUS_ID,
  TOPIC_STATUSES,
  type TopicStatusConfig,
  type TopicStatusId,
} from '@/config/topicStatuses';

export type StatusList = readonly TopicStatusConfig[];

/**
 * Looks up a status by id. Unknown ids (e.g. a status removed from config, or
 * data from a newer app version) fall back to the default status so the UI never breaks.
 */
export function getTopicStatus(id: string, statuses: StatusList = TOPIC_STATUSES): TopicStatusConfig {
  const found = statuses.find((s) => s.id === id);
  if (found) return found;
  const fallback = statuses.find((s) => s.id === DEFAULT_TOPIC_STATUS_ID) ?? statuses[0];
  if (!fallback) throw new Error('No topic statuses configured');
  return fallback;
}

export function isKnownTopicStatus(id: string, statuses: StatusList = TOPIC_STATUSES): id is TopicStatusId {
  return statuses.some((s) => s.id === id);
}

/** The next status in the tap-to-cycle order (wraps around). */
export function nextTopicStatus(id: string, statuses: StatusList = TOPIC_STATUSES): TopicStatusConfig {
  const index = statuses.findIndex((s) => s.id === id);
  const next = statuses[(index + 1) % statuses.length];
  if (!next) throw new Error('No topic statuses configured');
  return next;
}

export function isDoneStatus(id: string, statuses: StatusList = TOPIC_STATUSES): boolean {
  return getTopicStatus(id, statuses).countsAsDone;
}
