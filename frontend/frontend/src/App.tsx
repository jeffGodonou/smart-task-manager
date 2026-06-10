import React from 'react';

import './App.css';
import TaskList from './components/TaskList';
import TaskEditor from './components/TaskEditor';
import type { Task } from './api/tasks';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView';

function App() {
  const [task, setTasks] = React.useState<Task[]>([]);
  const [view, setView] = React.useState<'list'|'kanban'|'calendar'>('list');
  const renderedView = view === 'list'
             ? <TaskList onTasksChange={setTasks} />
             : view === 'kanban'
               ? <KanbanBoard />
               : <CalendarView />
  return (
    <>
      <div className='app'>
        <header>
          <h1>Smart Task Manager</h1>
          <div className="view-toggle">
            <button onClick={() => setView('list')} disabled={view==='list'}>List</button>
            <button onClick={() => setView('kanban')} disabled={view==='kanban'}>Kanban</button>
            <button onClick={() => setView('calendar')} disabled={view==='calendar'}>Calendar</button>
          </div>
        </header>
        <main>
          <TaskEditor />
          {renderedView}
        </main>
      </div>
    </>
  )
}

export default App
