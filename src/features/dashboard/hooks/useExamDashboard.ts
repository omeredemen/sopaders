import { useMemo } from 'react';
import { buildExamDashboard } from '@/domain/dashboard';
import { todayLocalDate } from '@/domain/dates';
import type { Id } from '@/domain/types';
import { useExam } from '@/features/exams/hooks/useExams';
import { useLessons } from '@/features/lessons/hooks/useLessons';
import { useExamTopics } from '@/features/topics/hooks/useTopics';

/** Loads an exam with its lessons and topics and computes the dashboard numbers. */
export function useExamDashboard(examId: Id) {
  const exam = useExam(examId);
  const lessons = useLessons(examId);
  const topics = useExamTopics(examId);
  const today = todayLocalDate();

  const dashboard = useMemo(
    () => (exam.data && lessons.data && topics.data ? buildExamDashboard(exam.data, lessons.data, topics.data, today) : undefined),
    [exam.data, lessons.data, topics.data, today],
  );

  return {
    exam: exam.data,
    lessons: lessons.data ?? [],
    dashboard,
    loading: exam.loading || lessons.loading || topics.loading,
  };
}
