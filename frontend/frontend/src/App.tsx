import React from 'react';

import './App.css';
import TaskList from './components/TaskList';
import TaskEditor from './components/TaskEditor';
import type { Task } from './api/tasks';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView';
import TaskStats from './components/TaskStats';
import AuthForm from './components/AuthForm';
import WelcomeMessage from './components/WelcomeMessage';
import ProfileMenu from './components/ProfileMenu';
import ProjectView from './components/ProjectView';
import { clearToken, getStoredToken, saveToken, updateProfile } from './api/auth';

type ThemeName = 'light' | 'dark' | 'blue' | 'forest' | 'gray';

const themeStorageKey = 'smart-task-manager-theme';

function getStoredTheme(): ThemeName {
  const storedTheme = localStorage.getItem(themeStorageKey);
  return storedTheme === 'light'
    || storedTheme === 'dark'
    || storedTheme === 'blue'
    || storedTheme === 'forest'
    || storedTheme === 'gray'
    ? storedTheme
    : 'blue';
}

function App() {
  const [, setTasks] = React.useState<Task[]>([]);
  const [view, setView] = React.useState<'list'|'kanban'|'calendar'|'stats'|'projects'>('list');
  const [isAuthenticated, setIsAuthenticated] = React.useState(Boolean(getStoredToken()));
  const [currentUsername, setCurrentUsername] = React.useState<string | null>(null);
  const [welcomeUser, setWelcomeUser] = React.useState<string | null>(null);
  const [tasksRefreshKey, setTasksRefreshKey] = React.useState(0);
  const [taskEditorOpen, setTaskEditorOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<ThemeName>(() => getStoredTheme());

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const renderedView = view === 'list'
             ? <>
                 {!taskEditorOpen && (
                   <button
                     type="button"
                     className="task-editor-submit"
                     onClick={() => setTaskEditorOpen(true)}
                     style={{ marginBottom: '16px' }}
                   >
                     Add task
                   </button>
                 )}
                 {taskEditorOpen && (
                   <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                     <div style={{ width: 'min(700px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                       <TaskEditor
                         onTaskCreated={() => {
                           setTasksRefreshKey(prev => prev + 1);
                           setTaskEditorOpen(false);
                         }}
                         onClose={() => setTaskEditorOpen(false)}
                       />
                     </div>
                   </div>
                 )}
                 <TaskList onTasksChange={setTasks} refreshKey={tasksRefreshKey} />
               </>
             : view === 'kanban'
               ? <KanbanBoard refreshKey={tasksRefreshKey} />
               : view === 'calendar'
                 ? <CalendarView refreshKey={tasksRefreshKey} />
                 : view === 'stats'
                   ? <TaskStats refreshKey={tasksRefreshKey} />
                   : <ProjectView />

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
            <img
              className="header-brand-lockup"
              src="/header-lockup-translucent.svg"
              alt="Smart Task Manager"
            />
            {currentUsername && <span className="header-username">{currentUsername}</span>}
          </div>
          <div className="header-actions">
            <div className="view-toggle">
              <button onClick={() => setView('list')} disabled={view==='list'}>List</button>
              <button onClick={() => setView('kanban')} disabled={view==='kanban'}>Kanban</button>
              <button onClick={() => setView('calendar')} disabled={view==='calendar'}>Calendar</button>
              <button onClick={() => setView('stats')} disabled={view==='stats'}>Stats</button>
              <button onClick={() => setView('projects')} disabled={view==='projects'}>Projects</button>
            </div>
            <ProfileMenu
              username={currentUsername}
              onUpdateProfile={async ({ username, currentPassword, newPassword }) => {
                const response = await updateProfile({ username, currentPassword, newPassword });
                saveToken(response.token);
                setCurrentUsername(response.username);
                setWelcomeUser(null);
              }}
              theme={theme}
              onThemeChange={setTheme}
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
          {renderedView}
        </main>
      </div>
    </>
  )
}

export default App
