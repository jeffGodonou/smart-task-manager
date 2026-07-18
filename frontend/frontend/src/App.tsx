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
  const [welcomeUser, setWelcomeUser] = React.useState<string | null>(null);
  const welcomeTimerRef = React.useRef<number | null>(null);

  const showWelcomeMessage = React.useCallback((username?: string) => {
    if (welcomeTimerRef.current !== null) {
      window.clearTimeout(welcomeTimerRef.current);
    }

    if (!username) {
      setWelcomeUser(null);
      return;
    }

    setWelcomeUser(username);
    welcomeTimerRef.current = window.setTimeout(() => {
      setWelcomeUser(null);
      welcomeTimerRef.current = null;
    }, 5000);
  }, []);

  React.useEffect(() => {
    return () => {
      if (welcomeTimerRef.current !== null) {
        window.clearTimeout(welcomeTimerRef.current);
      }
    };
  }, []);

  const renderedView = view === 'list'
             ? <TaskList onTasksChange={setTasks} />
             : view === 'kanban'
               ? <KanbanBoard />
               : <CalendarView />

  if (!isAuthenticated) {
    return <AuthForm onAuthenticated={(username) => {
      setIsAuthenticated(true);
      showWelcomeMessage(username);
    }} />;
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
        {welcomeUser && (
          <div className="welcome-chatbox" role="status" aria-live="polite">
            <div className="welcome-chatbox__bubble">
              <span className="welcome-chatbox__label">Welcome</span>
              <p>welcome {welcomeUser}, the space is ready for you.</p>
            </div>
          </div>
        )}
        <main>
          <TaskEditor />
          {renderedView}
        </main>
      </div>
    </>
  )
}

export default App
