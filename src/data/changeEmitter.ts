import type { ChangeEvent, ChangeFeed, EntityName } from './repositories';

export interface ChangeEmitter extends ChangeFeed {
  emit(...entities: EntityName[]): void;
}

/** Minimal in-process pub/sub used by repository implementations to announce writes. */
export function createChangeEmitter(): ChangeEmitter {
  const listeners = new Set<(event: ChangeEvent) => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(...entities) {
      const event: ChangeEvent = { entities };
      for (const listener of [...listeners]) listener(event);
    },
  };
}
