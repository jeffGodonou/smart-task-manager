import React from 'react';

import './App.css';
import TaskList from './components/TaskList';
import TaskEditor from './components/TaskEditor';
import type { Task } from './api/tasks';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView';
import AuthForm from './components/AuthForm';
import { clearToken, getStoredToken } from './api/auth';

function App() {
  const [, setTasks] = React.useState<Task[]>([]);
  const [view, setView] = React.useState<'list'|'kanban'|'calendar'>('list');
  const [isAuthenticated, setIsAuthenticated] = React.useState(Boolean(getStoredToken()));

  const renderedView = view === 'list'
             ? <TaskList onTasksChange={setTasks} />
             : view === 'kanban'
               ? <KanbanBoard />
               : <CalendarView />

  if (!isAuthenticated) {
    return <AuthForm onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <>
      <div className='app'>
        <header>
          <h1>Smart Task Manager</h1>
          <div className="header-actions">
            <div className="view-toggle">
              <button onClick={() => setView('list')} disabled={view==='list'}>List</button>
              <button onClick={() => setView('kanban')} disabled={view==='kanban'}>Kanban</button>
              <button onClick={() => setView('calendar')} disabled={view==='calendar'}>Calendar</button>
            </div>
            <button
              className="btn-secondary header-logout"
              onClick={() => {
                clearToken();
                setIsAuthenticated(false);
              }}
            >
              Log out
            </button>
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
