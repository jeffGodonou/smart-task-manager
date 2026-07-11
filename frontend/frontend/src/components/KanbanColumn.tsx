/**
 * KanbanColumn Component
 *
 * Renders a single column in the Kanban board with a header and list of cards.
 */
import React from 'react';
import type { Task } from '../api/tasks';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  title: string;
  status: Task['status'];
  accent: string;
  tasks: Task[];
  onMove: (id: string | undefined, newStatus: Task['status']) => void;
}

export default function KanbanColumn({ title, status, accent, tasks, onMove }: KanbanColumnProps) {
  return (
    <div className="kanban-column">

      {/* Column header */}
      <div className="kanban-column-header">
        <div className="kanban-column-title-row">
          <span className="kanban-column-accent" style={{ background: accent }} />
          <h3 className="kanban-column-title">{title}</h3>
        </div>
        <span className="kanban-column-count">{tasks.length}</span>
      </div>

      {/* Cards */}
      <div className="kanban-cards">
        {tasks.length === 0 ? (
          <div className="kanban-column-empty">No tasks here</div>
        ) : (
          tasks.map(t => (
            <KanbanCard key={t.id} task={t} onMove={onMove} />
          ))
        )}
      </div>

    </div>
  );
}