import { useEffect, useState } from 'react';
import { listTasks, deleteTask, updateTask } from '../api/tasks.ts';
import TaskRow from './TaskRow.ts';
import './TaskList.css';

/**
 * TaskList Component
 *
 * Responsibilities:
 * - Fetch tasks from API on mount
 * - Display list of tasks with TaskRow sub-component
 * - Handle delete and toggle complete actions
 * - Show loading / error / empty states
 */

type TaskListProps = {
  onTasksChange?: (tasks: any[]) => void;
  refreshKey?: number;
};

export default function TaskList({ onTasksChange, refreshKey = 0 }: TaskListProps) {
  const [tasks, setTasks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    loadTasks();
  }, [refreshKey]);

  async function loadTasks() {
    try {
      setLoading(true);
      setError(null);
      const data = await listTasks();
      setTasks(data);
      if (onTasksChange) onTasksChange(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError('Failed to load tasks: ' + message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(task: any) {
    try {
      await deleteTask(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError('Failed to delete task: ' + message);
    }
  }

  async function handleToggleComplete(task: any) {
    try {
      const nextCompleted = !task.isCompleted;
      const updated = await updateTask(task.id, {
        ...task,
        isCompleted: nextCompleted,
        status: nextCompleted ? 'DONE' : 'TODO',
      });
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError('Failed to update task: ' + message);
    }
  }

  if (loading) {
    return (
      <div className="task-list-shell">
        <div className="task-list-loading">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-list-shell">
        <div className="task-list-error">{error}</div>
      </div>
    );
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'active')    return !t.isCompleted;
    if (filter === 'completed') return  t.isCompleted;
    return true;
  });

  return (
    <div className="task-list-shell">

      {/* Filter tabs + count */}
      <div className="task-list-toolbar">
        <div className="task-filter-tabs">
          {(['all', 'active', 'completed'] as const).map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span className="task-count">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="task-list-empty">
          {filter === 'all'
            ? 'No tasks yet — add one above.'
            : `No ${filter} tasks.`}
        </div>
      ) : (
        <div className="task-list">
          {/* Table header */}
          <div className="task-list-header">
            <span>Title</span>
            <span>Description</span>
            <span>Due date</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {/* Rows */}
          {filteredTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={handleToggleComplete}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}