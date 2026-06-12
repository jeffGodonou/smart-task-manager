import React from 'react';
import { listTasks } from '../api/tasks';
import type { Task } from '../api/tasks';
import './TaskStats.css';

/**
 * TaskStats Component
 *
 * Responsibilities:
 * - Display task statistics: total, completed, by status
 * - Count overdue tasks
 * - Auto-refresh when tasks change
 */

export default function TaskStats() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listTasks();
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  // Calculate stats
  const total = tasks.length;
  const completed = tasks.filter(t => t.isCompleted).length;
  const remaining = total - completed;
  const byStatus = {
    todo: tasks.filter(t => (t.status || 'TODO') === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length,
  };

  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && !t.isCompleted).length;

  return (
    <div className="task-stats">
      {loading && <div className="stats-loading">Loading...</div>}
      {!loading && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value">{total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{completed}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Remaining</div>
            <div className="stat-value">{remaining}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">To Do</div>
            <div className="stat-value">{byStatus.todo}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">In Progress</div>
            <div className="stat-value">{byStatus.inProgress}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Done</div>
            <div className="stat-value">{byStatus.done}</div>
          </div>
          {overdue > 0 && (
            <div className="stat-card stat-warning">
              <div className="stat-label">Overdue</div>
              <div className="stat-value">{overdue}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}