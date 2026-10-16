import { useEffect } from 'react';
import type { Exam, Id } from '@/domain/types';

/**
 * The "active exam" is the one the user last opened. It's a per-device UI
 * preference (not synced data), so it lives in localStorage.
 */
// Internal identifier from the original name "study-tracker". Do NOT rename it: users would lose their remembered exam.
const STORAGE_KEY = 'study-tracker:activeExamId';

export function readActiveExamId(): Id | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeActiveExamId(id: Id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage unavailable (private mode etc.): the app still works, it just won't remember.
  }
}

/** Remembers `examId` as the active exam while the calling page is shown. */
export function useRememberActiveExam(examId: Id | undefined) {
  useEffect(() => {
    if (examId) writeActiveExamId(examId);
  }, [examId]);
}

/** The remembered exam if it still exists, otherwise the first one. */
export function pickActiveExam(exams: readonly Exam[], rememberedId: Id | null = readActiveExamId()): Exam | undefined {
  return exams.find((e) => e.id === rememberedId) ?? exams[0];
}
