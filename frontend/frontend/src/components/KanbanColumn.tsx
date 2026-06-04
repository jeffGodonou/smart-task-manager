import React from 'react';
import type { Task } from '../api/tasks';
import KanbanCard from './KanbanCard';

export default function KanbanColumn({ title, status, tasks, onMove }:{title:string,status:Task['status'],tasks:Task[],onMove:(id:string|undefined,newStatus:Task['status'])=>void}){
  return (
    <div className="kanban-column">
      <h3>{title} ({tasks.length})</h3>
      <div className="kanban-cards">
        {tasks.map(t => (
          <KanbanCard key={t.id} task={t} onMove={onMove} />
        ))}
      </div>
    </div>
  );
}
