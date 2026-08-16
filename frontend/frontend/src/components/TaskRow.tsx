import { useState, useEffect } from 'react';
import './TaskRow.css';
import type { Task } from '../api/tasks';
import { isUrgentDueDate } from '../utils/taskUrgency';

interface TaskRowProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpen: (task: Task) => void;
}

/**
 * TaskRow Component
 *
 * Responsibilities:
 * - Display a single task
 * - Render checkbox, title, description
 * - Trigger callbacks (toggle complete, delete)
 * - Show tooltips on hover with 3-second auto-hide
 */
export default function TaskRow({ task, onToggle, onDelete, onOpen }: TaskRowProps) {
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (openTooltip) {
      const timer = setTimeout(() => setOpenTooltip(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [openTooltip]);

  const showTooltip = (tooltipId: string) => {
    setOpenTooltip(tooltipId);
  };

  const hideTooltip = () => {
    setOpenTooltip(null);
  };

  const isUrgent = !task.isCompleted && isUrgentDueDate(task.dueDate);
  const isSubtask = Boolean(task.isSubtask || task.parentTaskId);

  // Show subtask completion indicator if task has subtasks
  const completedCount = task.subtasks?.filter(s => s.isCompleted).length ?? 0;
  const totalCount = task.subtasks?.length ?? 0;
  const hasSubtasks = totalCount > 0;
  const normalizedStatus = (task.status ?? (task.isCompleted ? 'DONE' : 'TODO')) as Task['status'];
  const displayStatus = normalizedStatus === 'IN_PROGRESS'
    ? 'In Progress'
    : normalizedStatus === 'DONE'
      ? 'Done'
      : 'To do';

  return (
    <div
      className={`task-row ${isUrgent ? 'task-row--urgent' : ''} ${isSubtask ? 'task-row--subtask' : ''}`}
      data-completed={task.isCompleted}
    >
      <input
        type="checkbox"
        checked={task.isCompleted || false}
        onChange={() => onToggle(task)}
        className="task-checkbox"
        aria-label={`Mark ${task.title} as ${task.isCompleted ? 'incomplete' : 'complete'}`}
      />

      <div className="task-content">
        <div className="task-title-row">
          <div className="task-title">{task.title}</div>
          {isSubtask && <span className="task-subtask-badge">Subtask</span>}
        </div>

        {task.description && (
          <div className="task-description">{task.description}</div>
        )}

        {task.dueDate && (
          <div
            className={`task-due-date ${isUrgent ? 'task-due-date--urgent' : ''}`}
          >
            {task.dueDate}
          </div>
        )}

        {hasSubtasks && !isSubtask && (
          <div className="task-subtask-info">
            {completedCount}/{totalCount} subtasks
          </div>
        )}

        <div className="task-status-inline">
          <span className={`task-status-pill task-status-pill--${normalizedStatus.toLowerCase()}`}>
            {displayStatus}
          </span>
        </div>
      </div>

      <div className="task-row-actions">
        <div className="task-action-button-wrapper">
          <button
            className="task-open"
            onClick={() => onOpen(task)}
            onMouseEnter={() => showTooltip('open')}
            onMouseLeave={hideTooltip}
            aria-label={`Open ${task.title}`}
          >
            ✎
          </button>
          {openTooltip === 'open' && (
            <div className="task-tooltip">Open task details</div>
          )}
        </div>

        <div className="task-action-button-wrapper">
          <button
            className="task-delete"
            onClick={() => onDelete(task)}
            onMouseEnter={() => showTooltip('delete')}
            onMouseLeave={hideTooltip}
            aria-label={`Delete ${task.title}`}
          >
            🗑
          </button>
          {openTooltip === 'delete' && (
            <div className="task-tooltip">Delete task</div>
          )}
        </div>
      </div>
    </div>
  );
}
