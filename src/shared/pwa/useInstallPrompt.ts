import { useEffect, useState } from 'react';

/** Chrome/Edge/Android's install event (not in TypeScript's DOM lib). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Captured at module load: the event can fire before any component mounts.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the mini-infobar
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function isRunningInstalled(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * `canInstall` is true when the browser offers installation (Chrome on Android/desktop).
 * Other browsers (iOS Safari, Firefox) install via their own menus.
 */
export function useInstallPrompt() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => void listeners.delete(listener);
  }, []);

  return {
    canInstall: deferred !== null,
    installed: isRunningInstalled(),
    async install(): Promise<boolean> {
      if (!deferred) return false;
      const event = deferred;
      deferred = null;
      notify();
      await event.prompt();
      return (await event.userChoice).outcome === 'accepted';
    },
  };
}
