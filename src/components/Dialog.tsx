import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  dismissable?: boolean;
}

export function Dialog({ open, title, onClose, children, dismissable = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    const onCancel = (event: Event) => {
      event.preventDefault();
      if (dismissable) onCloseRef.current();
    };
    const onClick = (event: MouseEvent) => {
      if (!dismissable) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) onCloseRef.current();
    };
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('click', onClick);
      if (dialog.open) dialog.close();
    };
  }, [open, dismissable]);

  if (!open) return null;

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId}>
      <div className="dialog-panel">
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onClose, children }: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <p>{body}</p>
      {children}
      <div className="button-row">
        <button type="button" className="button button--primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="button button--quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
