import { describe, expect, it } from 'vitest';
import { TOPIC_STATUSES } from '@/config/topicStatuses';
import { getTopicStatus, isDoneStatus, isKnownTopicStatus, nextTopicStatus } from './statuses';

describe('topic statuses', () => {
  it('config ids are unique', () => {
    const ids = TOPIC_STATUSES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('looks up a known status', () => {
    expect(getTopicStatus('finished').label).toBe('Bitti');
  });

  it('falls back to the default status for unknown ids', () => {
    expect(getTopicStatus('removed_status').id).toBe('not_started');
    expect(isKnownTopicStatus('removed_status')).toBe(false);
  });

  it('cycles in config order and wraps around', () => {
    expect(nextTopicStatus('not_started').id).toBe('started');
    expect(nextTopicStatus('started').id).toBe('finished');
    expect(nextTopicStatus('needs_review').id).toBe('not_started');
  });

  it('only finished counts as done', () => {
    expect(isDoneStatus('finished')).toBe(true);
    expect(isDoneStatus('needs_review')).toBe(false);
  });

  it('works with a custom status list', () => {
    const custom = [
      { id: 'a', label: 'A', color: '#000', countsAsDone: false },
      { id: 'b', label: 'B', color: '#111', countsAsDone: true },
    ];
    expect(nextTopicStatus('b', custom).id).toBe('a');
    expect(isDoneStatus('b', custom)).toBe(true);
  });
});
