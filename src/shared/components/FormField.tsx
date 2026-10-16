import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export function FormField({ label, error, hint, className = '', ...input }: FormFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 dark:bg-slate-950 ${
          error
            ? 'border-red-500 focus:ring-red-500/20'
            : 'border-slate-300 focus:border-brand-600 focus:ring-brand-600/20 dark:border-slate-700'
        }`}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
