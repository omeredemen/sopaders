import { useMemo } from 'react';
import { useRepoQuery } from '@/data/useRepoQuery';
import type { Id, Topic } from '@/domain/types';

/** All topics of an exam (one query), plus a lessonId → topics map in display order. */
export function useExamTopics(examId: Id) {
  const query = useRepoQuery((r) => r.topics.listByExam(examId), [examId], ['topics', 'lessons']);
  const byLesson = useMemo(() => {
    const map = new Map<Id, Topic[]>();
    for (const topic of query.data ?? []) {
      const list = map.get(topic.lessonId) ?? [];
      list.push(topic);
      map.set(topic.lessonId, list);
    }
    return map;
  }, [query.data]);
  return { ...query, byLesson };
}
