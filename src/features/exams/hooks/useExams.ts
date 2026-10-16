import { useRepoQuery } from '@/data/useRepoQuery';
import type { Id } from '@/domain/types';

export function useExams() {
  return useRepoQuery((r) => r.exams.list(), [], ['exams']);
}

export function useExam(examId: Id) {
  return useRepoQuery((r) => r.exams.get(examId), [examId], ['exams']);
}
