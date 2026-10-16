import type { ReactNode } from 'react';
import type { StatusSummary } from '@/domain/statusSummary';
import type { Lesson } from '@/domain/types';
import { IconButton } from '@/shared/components/Button';
import { EditableName } from '@/shared/components/EditableName';
import { Icon } from '@/shared/components/Icon';

interface LessonSectionProps {
  lesson: Lesson;
  summary: StatusSummary;
  expanded: boolean;
  onToggle: () => void;
  editing: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  /** Rendered as the progress indicator under the header (e.g. a StatusBar). */
  progress: ReactNode;
  /** Section body (the topic list). */
  children: ReactNode;
}

/** Collapsible card for one lesson. Knows nothing about topics; the page composes them in. */
export function LessonSection(props: LessonSectionProps) {
  const { lesson, summary, expanded, onToggle, editing, progress, children } = props;
  const bodyId = `lesson-${lesson.id}`;

  return (
    <section className="min-w-0 rounded-xl bg-white shadow-sm dark:bg-slate-900">
      {editing ? (
        <div className="flex items-center gap-1 p-3">
          <IconButton aria-label="Dersi yukarı taşı" disabled={!props.canMoveUp} onClick={() => props.onMove(-1)}>
            <Icon name="arrowUp" className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="Dersi aşağı taşı" disabled={!props.canMoveDown} onClick={() => props.onMove(1)}>
            <Icon name="arrowDown" className="h-4 w-4" />
          </IconButton>
          <EditableName label="Ders adı" value={lesson.name} onSave={props.onRename} className="font-semibold" />
          <IconButton aria-label="Dersi sil" onClick={props.onDelete} className="hover:text-red-600">
            <Icon name="trash" className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label={expanded ? 'Daralt' : 'Genişlet'} aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle}>
            <Icon name="chevronDown" className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </IconButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold">{lesson.name}</span>
              <span className="shrink-0 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                {summary.done}/{summary.total}
              </span>
            </div>
            <div className="mt-2">{progress}</div>
          </div>
          <Icon name="chevronDown" className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
      {expanded && (
        <div id={bodyId} className="border-t border-slate-100 px-3 pt-1 pb-3 dark:border-slate-800">
          {children}
        </div>
      )}
    </section>
  );
}
