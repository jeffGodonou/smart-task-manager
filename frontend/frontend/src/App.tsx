import React from 'react';

import './App.css';
import TaskList from './components/TaskList';
import TaskEditor from './components/TaskEditor';
import type { Task } from './api/tasks';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView';
import AuthForm from './components/AuthForm';
import WelcomeMessage from './components/WelcomeMessage';
import ProfileMenu from './components/ProfileMenu';
import { clearToken, getStoredToken } from './api/auth';

function App() {
  const [, setTasks] = React.useState<Task[]>([]);
  const [view, setView] = React.useState<'list'|'kanban'|'calendar'>('list');
  const [isAuthenticated, setIsAuthenticated] = React.useState(Boolean(getStoredToken()));
  const [currentUsername, setCurrentUsername] = React.useState<string | null>(null);
  const [welcomeUser, setWelcomeUser] = React.useState<string | null>(null);

  const renderedView = view === 'list'
             ? <TaskList onTasksChange={setTasks} />
             : view === 'kanban'
               ? <KanbanBoard />
               : <CalendarView />

  if (!isAuthenticated) {
    return <AuthForm onAuthenticated={(username) => {
      setIsAuthenticated(true);
      setCurrentUsername(username ?? null);
      setWelcomeUser(username ?? null);
    }} />;
  }

  return (
    <>
      <div className='app'>
        <header>
          <div className="header-brand">
            <h1>Smart Task Manager</h1>
            {currentUsername && <span className="header-username">{currentUsername}</span>}
          </div>
          <div className="header-actions">
            <div className="view-toggle">
              <button onClick={() => setView('list')} disabled={view==='list'}>List</button>
              <button onClick={() => setView('kanban')} disabled={view==='kanban'}>Kanban</button>
              <button onClick={() => setView('calendar')} disabled={view==='calendar'}>Calendar</button>
            </div>
            <ProfileMenu
              onEditProfile={() => {
                setWelcomeUser(null);
              }}
              onLogout={() => {
                clearToken();
                setIsAuthenticated(false);
                setCurrentUsername(null);
                setWelcomeUser(null);
              }}
            />
          </div>
        </header>
        {welcomeUser && (
          <WelcomeMessage username={welcomeUser} onDismiss={() => setWelcomeUser(null)} />
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
