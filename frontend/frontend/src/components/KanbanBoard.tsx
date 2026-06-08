import React from 'react';
import { listTasks, updateTask } from '../api/tasks';
import type { Task } from '../api/tasks';
import KanbanColumn from './KanbanColumn.tsx';

export default function KanbanBoard() {
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

  const handleMove = async (id: string | undefined, newStatus: Task['status']) => {
    if (!id) return;
    try {
      const updated = await updateTask(id, { status: newStatus });
      setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch (e) {
      console.error(e);
    }
  };

  const byStatus = (s: Task['status']) => tasks.filter(t => (t.status || 'TODO') === s);

  return (
    <div className="kanban-board">
      {loading && <div>Loading...</div>}
      <div className="kanban-columns">
        <KanbanColumn title="To Do" status="TODO" tasks={byStatus('TODO')} onMove={handleMove} />
        <KanbanColumn title="In Progress" status="IN_PROGRESS" tasks={byStatus('IN_PROGRESS')} onMove={handleMove} />
        <KanbanColumn title="Done" status="DONE" tasks={byStatus('DONE')} onMove={handleMove} />
      </div>
    </div>
  );
}
