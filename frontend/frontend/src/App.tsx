import React from 'react';

import './App.css';
import TaskList from './components/TaskList';
import TaskEditor from './components/TaskEditor';
import type { Task } from './api/tasks';

function App() {
  const [task, setTasks] = React.useState<Task[]>([]);

  return (
    <>
      <div className='app'>
        <header>
          <h1>Smart Task Manager</h1>
        </header>
        <main>
          <TaskEditor/>
          <TaskList onTasksChange={setTasks} />
        </main>
      </div>
    </>
  )
}

export default App
