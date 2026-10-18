type UpdateFn = (reloadPage?: boolean) => Promise<void>;
type Listener = (update: UpdateFn) => void;

const listeners = new Set<Listener>();

export function emitAppUpdate(update: UpdateFn): void {
  listeners.forEach((listener) => listener(update));
}

export function subscribeAppUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
