import { TOPIC_STATUSES } from '@/config/topicStatuses';
import { daysLeft, effectiveDeadline } from './dates';
import { dailyPace, studyTempo, type DailyPace, type StudyTempo } from './pace';
import type { StatusList } from './statuses';
import { summarizeByLesson, summarizeStatuses, type LessonStatusSummary, type StatusSummary } from './statusSummary';
import type { Exam, Lesson, LocalDate, Topic } from './types';

export interface ExamDashboard {
  /** Days until the exam date (0 = today, negative = past). */
  daysToExam: number;
  /** Date daily pace is measured against (study deadline, else exam date). */
  deadline: LocalDate;
  /** True when no study deadline is set and the exam date is used. */
  deadlineIsExamDate: boolean;
  daysToDeadline: number;
  pace: DailyPace;
  /** Actual tempo since the study start date, with a projected finish date. */
  tempo: StudyTempo;
  overall: StatusSummary;
  /** In lesson order. */
  lessons: LessonStatusSummary[];
}

/**
 * Everything the dashboard shows for one exam, computed from plain data.
 * `lessons` and `topics` must be the exam's active records.
 */
export function buildExamDashboard(
  exam: Pick<Exam, 'examDate' | 'studyStartDate' | 'studyDeadline'>,
  lessons: readonly Pick<Lesson, 'id' | 'name'>[],
  topics: readonly Pick<Topic, 'lessonId' | 'status'>[],
  today: LocalDate,
  statuses: StatusList = TOPIC_STATUSES,
): ExamDashboard {
  const deadline = effectiveDeadline(exam);
  const daysToDeadline = daysLeft(deadline, today);
  const overall = summarizeStatuses(topics, statuses);
  return {
    daysToExam: daysLeft(exam.examDate, today),
    deadline,
    deadlineIsExamDate: exam.studyDeadline === null,
    daysToDeadline,
    pace: dailyPace(overall.unfinished, daysToDeadline),
    tempo: studyTempo({ done: overall.done, unfinished: overall.unfinished, startDate: exam.studyStartDate, deadline, today }),
    overall,
    lessons: summarizeByLesson(lessons, topics, statuses),
  };
}
