import { useMemo } from 'react';
import { useRepositories } from '@/data/RepositoryProvider';
import { moveItem } from '@/domain/ordering';
import type { Id, Lesson } from '@/domain/types';
import { useAction } from '@/shared/hooks/useAction';

export function useLessonActions(examId: Id) {
  const repos = useRepositories();
  const run = useAction();

  return useMemo(
    () => ({
      add: (name: string) => run(() => repos.lessons.create({ examId, name })),
      rename: (lesson: Lesson, name: string) => run(() => repos.lessons.rename(lesson.id, name)),
      /** Moves the lesson at `index` by `delta` positions (-1 = up, +1 = down). */
      move: (lessons: Lesson[], index: number, delta: number) => {
        const ids = moveItem(lessons.map((l) => l.id), index, index + delta);
        return run(() => repos.lessons.reorder(examId, ids));
      },
      remove: (lesson: Lesson) => run(() => repos.lessons.delete(lesson.id), `"${lesson.name}" silindi`),
    }),
    [repos, run, examId],
  );
}
