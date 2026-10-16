import { useEffect, useRef, useState } from 'react';

interface EditableNameProps {
  value: string;
  label: string;
  onSave: (value: string) => void;
  className?: string;
}

/**
 * Input that saves on blur or Enter, and reverts on Escape or when emptied.
 */
export function EditableName({ value, label, onSave, className = '' }: EditableNameProps) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (cancelled.current || !trimmed) {
      cancelled.current = false;
      setDraft(value);
      return;
    }
    if (trimmed !== value) onSave(trimmed);
  };

  return (
    <input
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      className={`h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:border-slate-700 dark:bg-slate-950 ${className}`}
    />
  );
}
