import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from './Icon';

interface PageHeaderProps {
  title: string;
  /** Shows a back arrow linking here. */
  backTo?: string;
  /** Optional actions shown on the right (buttons, menus). */
  actions?: ReactNode;
}

export function PageHeader({ title, backTo, actions }: PageHeaderProps) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1">
        {backTo && (
          <Link
            to={backTo}
            aria-label="Geri"
            className="-ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Icon name="chevronLeft" className="h-6 w-6" />
          </Link>
        )}
        <h1 className="truncate text-2xl font-bold">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
