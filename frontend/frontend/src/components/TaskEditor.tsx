import { useState } from "react";
import { createTask, type Task } from "../api/tasks";

/**
 * TaskEditor Component
 *
 * Responsibilities:
 * - Create a new Task
 */

type TaskEditorProps = {
  onTaskCreated: (task: Task) => void;
};

export default function TaskEditor({ onTaskCreated }: TaskEditorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');  
  const [dueDate, setDueDate] = useState('');          

  const handleAdd = async () => {
    const task: Task = { title, description, dueDate };
    await createTask(task);   // fixed: now awaited
    onTaskCreated(task);
  };

  return (
    <div className="task-editor" data-completed={false}>
      <div className="task-content">
        <input
          className="task-title"
          type="text"
          value={title}                                  
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="task-description"
          type="text"
          value={description}                            
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="task-due-date"
          type="date"
          value={dueDate}                               
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <button className="task-create" onClick={handleAdd} aria-label="Add">
        Add
      </button>
    </div>
  );
}