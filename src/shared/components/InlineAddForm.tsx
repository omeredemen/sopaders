import { useState, type FormEvent } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

interface InlineAddFormProps {
  placeholder: string;
  /** Accessible label for the input. */
  label: string;
  onAdd: (value: string) => Promise<unknown> | void;
}

/** Single-line "type and press Enter" add form. Keeps focus so several items can be added in a row. */
export function InlineAddForm({ placeholder, label, onAdd }: InlineAddFormProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onAdd(trimmed);
      setValue('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        aria-label={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="done"
        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:border-slate-700 dark:bg-slate-950"
      />
      <Button type="submit" size="sm" className="h-10" disabled={!value.trim() || busy} aria-label={label}>
        <Icon name="plus" className="h-4 w-4" />
        Ekle
      </Button>
    </form>
  );
}
