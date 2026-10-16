import { Link } from 'react-router';
import { TOPIC_STATUSES } from '@/config/topicStatuses';
import { useRepoQuery } from '@/data/useRepoQuery';
import { BackupSection } from '@/features/import-export/components/BackupSection';
import { PageHeader } from '@/shared/components/PageHeader';
import { AppSection } from '../components/AppSection';

const card = 'rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900';

export function SettingsPage() {
  const { data: exams, loading, error } = useRepoQuery((r) => r.exams.list(), [], ['exams']);

  return (
    <>
      <PageHeader title="Ayarlar" />
      <div className="grid grid-cols-1 gap-3">
        <AppSection />
        <BackupSection />

        <section className={card}>
          <h2 className="mb-1 font-semibold">Konuları içe aktar</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            CSV, Excel veya düz metinden konu eklemek için bir sınav açıp alttaki{' '}
            <strong>“Dosyadan veya metinden içe aktar”</strong> bağlantısını kullan.{' '}
            <Link to="/exams" className="font-medium text-brand-600 underline dark:text-blue-400">
              Sınavlara git
            </Link>
          </p>
        </section>

        <section className={card}>
          <h2 className="mb-1 font-semibold">Depolama</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Veriler yalnızca bu cihazda saklanıyor (IndexedDB). Tarayıcı verilerini silmek uygulama verilerini de siler;
            düzenli yedek almayı unutma.{' '}
            {loading ? 'Yükleniyor…' : error ? `Hata: ${error.message}` : `Kayıtlı sınav sayısı: ${exams?.length ?? 0}.`}
          </p>
        </section>

        <section className={card}>
          <h2 className="mb-2 font-semibold">Konu durumları</h2>
          <ul className="flex flex-wrap gap-2">
            {TOPIC_STATUSES.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm dark:border-slate-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                {s.label}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
