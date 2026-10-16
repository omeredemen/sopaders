import { useEffect, useState, type DependencyList } from 'react';
import { useRepositories } from './RepositoryProvider';
import type { EntityName, Repositories } from './repositories';

export interface RepoQueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
}

/**
 * Runs a repository query and re-runs it whenever one of `entities` changes
 * (or `deps` change). Feature hooks build on this; components never call it with Dexie.
 *
 * @example
 * const { data: lessons } = useRepoQuery((r) => r.lessons.listByExam(examId), [examId], ['lessons']);
 */
export function useRepoQuery<T>(
  query: (repos: Repositories) => Promise<T>,
  deps: DependencyList,
  entities: EntityName[],
): RepoQueryState<T> {
  const repos = useRepositories();
  const [state, setState] = useState<RepoQueryState<T>>({ data: undefined, loading: true, error: undefined });

  useEffect(() => {
    let cancelled = false;
    let runId = 0;

    const run = () => {
      const current = ++runId;
      query(repos).then(
        (data) => {
          if (!cancelled && current === runId) setState({ data, loading: false, error: undefined });
        },
        (error: unknown) => {
          if (!cancelled && current === runId) {
            setState((prev) => ({
              ...prev,
              loading: false,
              error: error instanceof Error ? error : new Error(String(error)),
            }));
          }
        },
      );
    };

    setState((prev) => ({ ...prev, loading: true }));
    run();
    const unsubscribe = repos.changes.subscribe((event) => {
      if (event.entities.some((e) => entities.includes(e))) run();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, ...deps]);

  return state;
}
