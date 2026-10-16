import { useRepoQuery } from '@/data/useRepoQuery';
import type { Id } from '@/domain/types';

export function useLessons(examId: Id) {
  return useRepoQuery((r) => r.lessons.listByExam(examId), [examId], ['lessons']);
}
