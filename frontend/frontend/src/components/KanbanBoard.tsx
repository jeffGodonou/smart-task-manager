/**
 * KanbanBoard Component
 *
 * Displays tasks grouped into status columns and handles moving tasks
 * between statuses by calling the API.
 */
import React from 'react';
import { listTasks, updateTask } from '../api/tasks';
import type { Task } from '../api/tasks';
import KanbanColumn from './KanbanColumn';

export default function KanbanBoard() {
  const [tasks, setTasks]     = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTasks();
      setTasks(data);
    } catch (e) {
      setError('Failed to load tasks.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const handleMove = async (id: string | undefined, newStatus: Task['status']) => {
    if (!id) return;
    try {
      const updated = await updateTask(id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (e) {
      console.error(e);
    }
  };

  const byStatus = (s: Task['status']) =>
    tasks.filter(t => (t.status || 'TODO') === s);

  const columns: { title: string; status: Task['status']; accent: string }[] = [
    { title: 'To Do',       status: 'TODO',        accent: '#1F4E79' },
    { title: 'In Progress', status: 'IN_PROGRESS',  accent: '#854F0B' },
    { title: 'Done',        status: 'DONE',          accent: '#0F6E56' },
  ];

  if (loading) {
    return (
      <div className="kanban-board">
        <div className="kanban-loading">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kanban-board">
        <div className="kanban-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="kanban-board">
      <div className="kanban-columns">
        {columns.map(col => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            status={col.status}
            accent={col.accent}
            tasks={byStatus(col.status)}
            onMove={handleMove}
          />
        ))}
      </div>
    </div>
  );
}