import { useEffect, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { DomainError } from '../../domain/types';
import { useWorkspace } from '../../state/DataProvider';
import { useUi } from '../../state/UiProvider';

export function CaptureDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addInbox } = useWorkspace();
  const { announce } = useUi();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setText('');
      setError('');
    }
  }, [open]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) {
      setError('Write something to capture.');
      return;
    }
    setSaving(true);
    try {
      await addInbox(text);
      announce('Captured');
      onClose();
    } catch (caught) {
      setError(caught instanceof DomainError ? caught.message : "Couldn't save that capture.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} title="Capture" onClose={onClose}>
      <form aria-label="Capture" onSubmit={onSubmit}>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="field">
          <span className="sr-only">What’s on your mind?</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            placeholder="A task, idea, or something to remember"
            autoFocus
          />
        </label>
        <div className="button-row">
          <button type="submit" className="button button--primary" disabled={saving}>
            Save capture
          </button>
          <button type="button" className="button button--quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}
