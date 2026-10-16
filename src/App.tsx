import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { AppLayout } from '@/shared/components/AppLayout';
import { Loading } from '@/shared/components/EmptyState';
import { NotFoundPage } from '@/shared/components/NotFoundPage';
import { ToastProvider } from '@/shared/components/Toast';
import { UpdatePrompt } from '@/shared/pwa/UpdatePrompt';
import { ExamsPage } from '@/features/exams/pages/ExamsPage';
import { ExamDetailPage } from '@/features/exams/pages/ExamDetailPage';
import { ActiveExamRedirect } from '@/features/exams/components/ActiveExamRedirect';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { TrialsPage } from '@/features/trials/pages/TrialsPage';
import { TrialFormPage } from '@/features/trials/pages/TrialFormPage';

/** Route table. Each feature owns its page components; add new routes here. */
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    // Shown while a lazy route loads on first page load.
    HydrateFallback: Loading,
    children: [
      { index: true, element: <Navigate to="/exams" replace /> },
      { path: 'exams', element: <ExamsPage /> },
      { path: 'exams/:examId', element: <ExamDetailPage /> },
      // Rarely used pages are code-split (loaded on first visit).
      {
        path: 'exams/:examId/import',
        lazy: () => import('@/features/import-export/pages/TopicImportPage').then((m) => ({ Component: m.TopicImportPage })),
      },
      { path: 'dashboard', element: <ActiveExamRedirect basePath="/dashboard" title="Panel" /> },
      { path: 'dashboard/:examId', element: <DashboardPage /> },
      { path: 'trials', element: <ActiveExamRedirect basePath="/trials" title="Denemeler" /> },
      { path: 'trials/:examId', element: <TrialsPage /> },
      { path: 'trials/:examId/new', element: <TrialFormPage /> },
      { path: 'trials/:examId/:trialId', element: <TrialFormPage /> },
      {
        path: 'settings',
        lazy: () => import('@/features/settings/pages/SettingsPage').then((m) => ({ Component: m.SettingsPage })),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return (
    <RepositoryProvider>
      <ToastProvider>
        <RouterProvider router={router} />
        <UpdatePrompt />
      </ToastProvider>
    </RepositoryProvider>
  );
}
