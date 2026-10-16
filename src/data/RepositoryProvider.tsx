import { createContext, useContext, useState, type ReactNode } from 'react';
import { createRepositories } from './createRepositories';
import type { Repositories } from './repositories';

const RepositoryContext = createContext<Repositories | null>(null);

interface RepositoryProviderProps {
  children: ReactNode;
  /** Override for tests or previews; defaults to createRepositories(). */
  repositories?: Repositories;
}

export function RepositoryProvider({ children, repositories }: RepositoryProviderProps) {
  const [value] = useState(() => repositories ?? createRepositories());
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useRepositories(): Repositories {
  const repos = useContext(RepositoryContext);
  if (!repos) throw new Error('useRepositories must be used inside <RepositoryProvider>');
  return repos;
}
