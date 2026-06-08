import React from 'react';
import type { Task } from '../api/tasks';

export default function KanbanCard({ task, onMove }:{task:Task, onMove:(id:string|undefined,newStatus:Task['status'])=>void}){
  const next = (status: Task['status']) => {
    if (status === 'TODO') return 'IN_PROGRESS' as Task['status'];
    if (status === 'IN_PROGRESS') return 'DONE' as Task['status'];
    return 'TODO' as Task['status'];
  }

  return (
    <div className="kanban-card">
      <div className="kanban-card-title">{task.title}</div>
      {task.dueDate && <div className="kanban-card-due">Due: {task.dueDate}</div>}
      <div className="kanban-card-actions">
        <button onClick={() => onMove(task.id, next(task.status || 'TODO'))}>Move</button>
      </div>
    </div>
  );
}
