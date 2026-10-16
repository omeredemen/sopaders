import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons row at the bottom. */
  footer?: ReactNode;
}

/**
 * Modal dialog built on the native <dialog> element (focus trap, Esc to close).
 * Render it conditionally (`{open && <Modal …/>}`) so form state resets each time.
 */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-black/40 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="p-5">
        <h2 id="modal-title" className="mb-4 text-lg font-semibold">
          {title}
        </h2>
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  );
}
