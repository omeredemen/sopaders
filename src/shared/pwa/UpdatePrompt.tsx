import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/shared/components/Button';
import { useToast } from '@/shared/components/Toast';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Registers the service worker and shows a banner when a new version is ready.
 * The user decides when to reload. Data lives in IndexedDB, so updating never loses it.
 */
export function UpdatePrompt() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Installed apps can stay open for days; check for updates periodically.
      if (registration) setInterval(() => registration.update().catch(() => {}), UPDATE_CHECK_INTERVAL_MS);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast('Uygulama çevrimdışı kullanıma hazır');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady, toast]);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-slate-900 p-3 pl-4 text-sm text-white shadow-lg md:bottom-6 dark:bg-slate-100 dark:text-slate-900"
    >
      <span className="flex-1">Yeni sürüm hazır.</span>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        className="h-9 rounded-lg px-3 font-medium text-slate-200 hover:bg-white/10 dark:text-slate-700 dark:hover:bg-slate-900/10"
      >
        Sonra
      </button>
      <Button size="sm" onClick={() => updateServiceWorker(true)}>
        Güncelle
      </Button>
    </div>
  );
}
