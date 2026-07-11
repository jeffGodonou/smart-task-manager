/**
 * KanbanCard Component
 *
 * Shows a single task card in the Kanban column with metadata and
 * a button to move the task to the next status.
 */
import React from 'react';
import type { Task } from '../api/tasks';

interface KanbanCardProps {
  task: Task;
  onMove: (id: string | undefined, newStatus: Task['status']) => void;
}

const STATUS_FLOW: Record<string, Task['status']> = {
  'TODO':        'IN_PROGRESS',
  'IN_PROGRESS': 'DONE',
  'DONE':        'TODO',
};

const MOVE_LABEL: Record<string, string> = {
  'TODO':        '→ In Progress',
  'IN_PROGRESS': '→ Done',
  'DONE':        '↩ Restart',
};

/**
 * formatDate
 *
 * Returns a compact localized date string for display, or null.
 */
function formatDate(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric'
  });
}

/**
 * priorityClass
 *
 * Returns a CSS class for the priority badge when provided.
 */
function priorityClass(priority?: string) {
  if (!priority) return '';
  return `badge badge-${priority.toLowerCase()}`;
}

export default function KanbanCard({ task, onMove }: KanbanCardProps) {
  const currentStatus = task.status || 'TODO';
  const nextStatus    = STATUS_FLOW[currentStatus];
  const moveLabel     = MOVE_LABEL[currentStatus];
  const formattedDate = formatDate(task.dueDate);
  const isDone        = currentStatus === 'DONE';

  return (
    <div className={`kanban-card ${isDone ? 'kanban-card--done' : ''}`}>

      {/* Priority badge + title */}
      <div className="kanban-card-header">
        {task.status && (
          <span className={priorityClass(task.status)}>
            {task.status}
          </span>
        )}
      </div>

      <div className={`kanban-card-title ${isDone ? 'kanban-card-title--done' : ''}`}>
        {task.title}
      </div>

      {task.description && (
        <div className="kanban-card-desc">{task.description}</div>
      )}

      {/* Footer: due date + move button */}
      <div className="kanban-card-footer">
        {formattedDate ? (
          <span className="kanban-card-date">📅 {formattedDate}</span>
        ) : (
          <span />
        )}
        <button
          className="kanban-move-btn"
          onClick={() => onMove(task.id, nextStatus)}
          title={`Move to ${nextStatus}`}
        >
          {moveLabel}
        </button>
      </div>

    </div>
  );
}