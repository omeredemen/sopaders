import type { Repositories } from '@/data/repositories';
import type { TopicImportPlan } from '@/domain/importPlan';
import type { Id } from '@/domain/types';

export interface ApplyImportResult {
  lessonsCreated: number;
  topicsCreated: number;
}

/** Writes a previewed import plan: creates the new lessons, then all topics in one batch. */
export async function applyTopicImport(
  repos: Pick<Repositories, 'lessons' | 'topics'>,
  examId: Id,
  plan: TopicImportPlan,
): Promise<ApplyImportResult> {
  const newLessonIds = new Map<string, Id>();
  for (const name of plan.newLessons) {
    const lesson = await repos.lessons.create({ examId, name });
    newLessonIds.set(name, lesson.id);
  }

  const inputs = plan.topics.map((t) => {
    const lessonId = t.lessonId ?? newLessonIds.get(t.lessonName);
    if (!lessonId) throw new Error(`No lesson for imported topic "${t.topicName}"`);
    return { lessonId, name: t.topicName };
  });
  const topics = await repos.topics.createMany(inputs);

  return { lessonsCreated: plan.newLessons.length, topicsCreated: topics.length };
}
