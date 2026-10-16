import { useMemo } from 'react';
import { useRepositories } from '@/data/RepositoryProvider';
import { moveItem } from '@/domain/ordering';
import { nextTopicStatus } from '@/domain/statuses';
import type { Id, Topic } from '@/domain/types';
import { useAction } from '@/shared/hooks/useAction';

export function useTopicActions() {
  const repos = useRepositories();
  const run = useAction();

  return useMemo(
    () => ({
      add: (lessonId: Id, name: string) => run(() => repos.topics.create({ lessonId, name })),
      /** Advances to the next status in config order (the quick "tap" action). */
      cycleStatus: (topic: Topic) => run(() => repos.topics.setStatus([topic.id], nextTopicStatus(topic.status).id)),
      setStatus: (topic: Topic, status: string) => run(() => repos.topics.setStatus([topic.id], status)),
      rename: (topic: Topic, name: string) => run(() => repos.topics.rename(topic.id, name)),
      /** Moves the topic at `index` by `delta` positions within its lesson. */
      move: (topics: Topic[], index: number, delta: number) => {
        const topic = topics[index];
        if (!topic) return Promise.resolve(undefined);
        const ids = moveItem(topics.map((t) => t.id), index, index + delta);
        return run(() => repos.topics.reorder(topic.lessonId, ids));
      },
      remove: (topic: Topic) => run(() => repos.topics.delete(topic.id), `"${topic.name}" silindi`),
    }),
    [repos, run],
  );
}
