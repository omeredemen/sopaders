import { TOPIC_STATUSES } from '@/config/topicStatuses';
import { getTopicStatus, type StatusList } from './statuses';
import type { Id, Lesson, Topic } from './types';

export interface StatusCount {
  statusId: string;
  count: number;
  /** 0-100, unrounded. 0 when there are no topics. */
  percent: number;
}

export interface StatusSummary {
  total: number;
  done: number;
  unfinished: number;
  /** 0-100, unrounded. */
  donePercent: number;
  /** One entry per configured status, in config order (zero counts included). */
  byStatus: StatusCount[];
}

const percentOf = (part: number, total: number) => (total === 0 ? 0 : (part / total) * 100);

/** Counts topics per status. Unknown status ids are counted as the default status. */
export function summarizeStatuses(
  topics: readonly Pick<Topic, 'status'>[],
  statuses: StatusList = TOPIC_STATUSES,
): StatusSummary {
  const counts = new Map<string, number>(statuses.map((s) => [s.id, 0]));
  let done = 0;
  for (const topic of topics) {
    const status = getTopicStatus(topic.status, statuses);
    counts.set(status.id, (counts.get(status.id) ?? 0) + 1);
    if (status.countsAsDone) done++;
  }
  const total = topics.length;
  return {
    total,
    done,
    unfinished: total - done,
    donePercent: percentOf(done, total),
    byStatus: statuses.map((s) => {
      const count = counts.get(s.id) ?? 0;
      return { statusId: s.id, count, percent: percentOf(count, total) };
    }),
  };
}

export interface LessonStatusSummary {
  lessonId: Id;
  lessonName: string;
  summary: StatusSummary;
}

/** Status summary per lesson, in the order the lessons are given. */
export function summarizeByLesson(
  lessons: readonly Pick<Lesson, 'id' | 'name'>[],
  topics: readonly Pick<Topic, 'lessonId' | 'status'>[],
  statuses: StatusList = TOPIC_STATUSES,
): LessonStatusSummary[] {
  const byLesson = new Map<Id, Pick<Topic, 'status'>[]>();
  for (const topic of topics) {
    const list = byLesson.get(topic.lessonId) ?? [];
    list.push(topic);
    byLesson.set(topic.lessonId, list);
  }
  return lessons.map((lesson) => ({
    lessonId: lesson.id,
    lessonName: lesson.name,
    summary: summarizeStatuses(byLesson.get(lesson.id) ?? [], statuses),
  }));
}
