import { useCallback } from 'react';
import { useToast } from '@/shared/components/Toast';

/**
 * Wraps a write operation: shows an optional success toast, and turns thrown
 * errors into an error toast instead of an unhandled rejection.
 * Resolves to the result, or undefined on failure.
 */
export function useAction() {
  const toast = useToast();
  return useCallback(
    async <T>(fn: () => Promise<T>, successMessage?: string): Promise<T | undefined> => {
      try {
        const result = await fn();
        if (successMessage) toast(successMessage);
        return result;
      } catch (error) {
        console.error(error);
        toast(`İşlem başarısız: ${error instanceof Error ? error.message : String(error)}`, 'error');
        return undefined;
      }
    },
    [toast],
  );
}
