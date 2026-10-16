import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { isStoragePersisted, requestPersistentStorage } from '@/shared/pwa/persistentStorage';
import { useInstallPrompt } from '@/shared/pwa/useInstallPrompt';

/** Install button and storage-persistence status. */
export function AppSection() {
  const { canInstall, installed, install } = useInstallPrompt();
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    isStoragePersisted().then(setPersisted);
  }, []);

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="mb-1 font-semibold">Uygulama</h2>
      {installed ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Uygulama olarak yüklü ve çevrimdışı çalışıyor.</p>
      ) : canInstall ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-slate-600 dark:text-slate-400">
            Ana ekrana ekle: internet olmadan da açılır, tam ekran çalışır.
          </p>
          <Button onClick={install}>Uygulamayı yükle</Button>
        </div>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Yüklemek için tarayıcı menüsünden <strong>“Ana ekrana ekle”</strong> veya <strong>“Uygulamayı yükle”</strong>yi seç.
        </p>
      )}

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Kalıcı depolama:{' '}
        {persisted === null ? (
          'desteklenmiyor'
        ) : persisted ? (
          <strong>açık</strong>
        ) : (
          <>
            <strong>kapalı</strong> (tarayıcı yer açmak için verileri silebilir).{' '}
            <button
              type="button"
              onClick={async () => setPersisted(await requestPersistentStorage())}
              className="font-medium text-brand-600 underline dark:text-blue-400"
            >
              İzin iste
            </button>
          </>
        )}
      </p>
    </section>
  );
}
