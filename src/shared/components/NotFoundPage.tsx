import { Link } from 'react-router';
import { PageHeader } from './PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Sayfa bulunamadı" />
      <Link to="/exams" className="text-brand-600 underline">
        Ana sayfaya dön
      </Link>
    </>
  );
}
