import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/Dialog';
import { TaskFields } from '../../components/TaskFields';
import { DomainError, type TaskInput } from '../../domain/types';
import { emptyTaskInput } from '../../domain/tasks';
import { useWorkspace } from '../../state/DataProvider';
import { useUi } from '../../state/UiProvider';

export function TaskCreateDialog({
  open,
  onClose,
  initialDate = null,
  navigateOnCreate = false,
}: {
  open: boolean;
  onClose: () => void;
  initialDate?: string | null;
  navigateOnCreate?: boolean;
}) {
  const { createTask, snapshot } = useWorkspace();
  const { announce } = useUi();
  const navigate = useNavigate();
  const [value, setValue] = useState<TaskInput>(() => emptyTaskInput(initialDate));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue(emptyTaskInput(initialDate));
      setError('');
    }
  }, [open, initialDate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!value.title.trim()) {
      setError('Add a title before saving.');
      return;
    }
    try {
      const id = await createTask(value);
      announce('Task added');
      onClose();
      if (navigateOnCreate) navigate(`/tasks/${id}`);
    } catch (caught) {
      setError(caught instanceof DomainError ? caught.message : "Couldn't save that task.");
    }
  }

  return (
    <Dialog open={open} title="New task" onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <TaskFields value={value} projects={snapshot.projects} onChange={setValue} idPrefix="new-task" />
        <div className="button-row">
          <button type="submit" className="button button--primary">
            Add task
          </button>
          <button type="button" className="button button--quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}
