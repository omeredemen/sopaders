import { NavLink, Outlet } from 'react-router';
import { Icon, type IconName } from './Icon';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/exams', label: 'Sınavlar', icon: 'list' },
  { to: '/dashboard', label: 'Panel', icon: 'chart' },
  { to: '/trials', label: 'Denemeler', icon: 'clipboard' },
  { to: '/settings', label: 'Ayarlar', icon: 'sliders' },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    'max-md:flex-1 max-md:flex-col max-md:gap-0.5 max-md:px-1 max-md:py-2 max-md:text-xs',
    isActive
      ? 'text-brand-600 md:bg-brand-50 dark:text-blue-400 md:dark:bg-slate-800'
      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
  ].join(' ');

/**
 * App frame: bottom tab bar on mobile, left sidebar on desktop (md+).
 */
export function AppLayout() {
  return (
    <div className="min-h-dvh md:flex">
      <nav
        aria-label="Ana menü"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:sticky md:top-0 md:h-dvh md:w-56 md:flex-col md:gap-1 md:border-t-0 md:border-r md:p-3"
      >
        <div className="hidden px-3 py-4 text-lg font-bold md:block">sopaders</div>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <Icon name={item.icon} className="h-6 w-6" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="mx-auto w-full max-w-3xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-24 md:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
