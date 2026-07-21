import React from 'react';
import type { Task, SubTask } from '../api/tasks';

type TaskDetailsModalProps = {
  task: Task;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => Promise<void>;
};

export default function TaskDetailsModal({ task, onClose, onSave }: TaskDetailsModalProps) {
  const maxSubtasks = 4;
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description ?? '');
  const [dueDate, setDueDate] = React.useState(task.dueDate ?? '');
  const [notes, setNotes] = React.useState(task.notes ?? '');
  const [status, setStatus] = React.useState<Task['status']>(task.status ?? 'TODO');
  const [isCompleted, setIsCompleted] = React.useState(Boolean(task.isCompleted));
  const [subtasks, setSubtasks] = React.useState<SubTask[]>(task.subtasks ?? []);
  const [newSubtask, setNewSubtask] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [subtaskError, setSubtaskError] = React.useState<string | null>(null);

  const completedSubtasks = subtasks.filter(st => Boolean(st.isCompleted)).length;
  const hasSubtasks = subtasks.length > 0;

  const normalizedStatus: Task['status'] = hasSubtasks
    ? (completedSubtasks === subtasks.length ? 'DONE' : completedSubtasks > 0 ? 'IN_PROGRESS' : 'TODO')
    : (isCompleted ? 'DONE' : (status === 'DONE' ? 'TODO' : status));

  const normalizedCompleted = hasSubtasks ? completedSubtasks === subtasks.length : isCompleted;

  const handleAddSubtask = () => {
    const trimmed = newSubtask.trim();
    if (!trimmed) return;

    if (subtasks.length >= maxSubtasks) {
      setSubtaskError('A task can have at most 4 subtasks. Split the task if more are needed.');
      return;
    }

    setSubtasks(prev => [...prev, { title: trimmed, isCompleted: false }]);
    setSubtaskError(null);
    setNewSubtask('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        isCompleted: normalizedCompleted,
        status: normalizedStatus,
        subtasks: subtasks
          .map(st => ({ title: st.title.trim(), isCompleted: Boolean(st.isCompleted) }))
          .filter(st => st.title.length > 0),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal" onClick={(event) => event.stopPropagation()}>
        <div className="task-modal-header">
          <h3>Task details</h3>
          <button type="button" className="task-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="task-modal-body">
          <div className="task-modal-field">
            <label htmlFor="task-modal-title">Title</label>
            <input
              id="task-modal-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="task-modal-field">
            <label htmlFor="task-modal-description">Description</label>
            <textarea
              id="task-modal-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>

          <div className="task-modal-grid">
            <div className="task-modal-field">
              <label htmlFor="task-modal-due-date">Due date</label>
              <input
                id="task-modal-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>

            <div className="task-modal-field">
              <label htmlFor="task-modal-status">Status</label>
              <select
                id="task-modal-status"
                value={normalizedStatus}
                onChange={(event) => {
                  const next = event.target.value as Task['status'];
                  setStatus(next);
                  setIsCompleted(next === 'DONE');
                }}
                disabled={hasSubtasks || isCompleted}
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <label className="task-modal-checkline">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(event) => {
                if (hasSubtasks) {
                  return;
                }
                const checked = event.target.checked;
                setIsCompleted(checked);
                if (checked) {
                  setStatus('DONE');
                }
              }}
              disabled={hasSubtasks}
            />
            Mark as completed {hasSubtasks ? '(derived from subtasks)' : ''}
          </label>

          <div className="task-modal-field">
            <label htmlFor="task-modal-notes">Completion notes</label>
            <textarea
              id="task-modal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Add notes about progress, blockers, or completion context..."
            />
          </div>

          <div className="task-modal-field">
            <label>Subtasks</label>
            <div className="task-modal-subtask-new">
              <input
                type="text"
                value={newSubtask}
                placeholder="Add subtask"
                onChange={(event) => setNewSubtask(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
              <button type="button" className="btn-secondary" onClick={handleAddSubtask}>Add</button>
            </div>
            {subtaskError && <p className="task-modal-subtask-error">{subtaskError}</p>}
            <div className="task-modal-subtasks">
              {subtasks.length === 0 && <p className="task-modal-subtasks-empty">No subtasks yet.</p>}
              {subtasks.map((subtask, index) => (
                <div key={`${subtask.title}-${index}`} className="task-modal-subtask-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(subtask.isCompleted)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSubtasks(prev => prev.map((st, i) => i === index ? { ...st, isCompleted: checked } : st));
                      }}
                    />
                    <span>{subtask.title}</span>
                  </label>
                  <button
                    type="button"
                    className="task-modal-subtask-remove"
                    onClick={() => setSubtasks(prev => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="task-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
