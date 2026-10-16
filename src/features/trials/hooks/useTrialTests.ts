import { useRepoQuery } from '@/data/useRepoQuery';
import type { Id } from '@/domain/types';

/** Trial tests of an exam, oldest first. */
export function useTrialTests(examId: Id) {
  return useRepoQuery((r) => r.trialTests.listByExam(examId), [examId], ['trialTests']);
}

export function useTrialTest(trialTestId: Id) {
  return useRepoQuery((r) => r.trialTests.get(trialTestId), [trialTestId], ['trialTests']);
}
