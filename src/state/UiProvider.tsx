import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface Toast {
  id: number;
  text: string;
}

interface UiContextValue {
  announce: (message: string) => void;
  message: string;
  notify: (text: string) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const announce = useCallback((next: string) => {
    setMessage('');
    window.setTimeout(() => setMessage(next), 30);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (text: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current.slice(-2), { id, text }]);
      announce(text);
      window.setTimeout(() => dismissToast(id), 6000);
    },
    [announce, dismissToast],
  );

  const value = useMemo(
    () => ({ announce, message, notify, toasts, dismissToast }),
    [announce, message, notify, toasts, dismissToast],
  );

  return (
    <UiContext.Provider value={value}>
      {children}
      <div className="sr-only" role="status" aria-live="polite">
        {message}
      </div>
    </UiContext.Provider>
  );
}

export function useUi(): UiContextValue {
  const value = useContext(UiContext);
  if (!value) throw new Error('useUi must be used within UiProvider');
  return value;
}
