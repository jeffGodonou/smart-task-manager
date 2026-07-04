import { useForm } from "react-hook-form";
import { taskSchema, type TaskFormData } from "../validation/taskSchema";
import { useTaskStore } from "../store/TaskStore";
import { zodResolver } from "@hookform/resolvers/zod";
import './TaskEditor.css';
import { useEffect } from "react";

/**
 * TaskEditor Component
 *
 * Responsibilities:
 * - Create a new Task
 */

export default function TaskEditor() {
  const addTask   = useTaskStore(state => state.addTask);
  const error     = useTaskStore(state => state.error);
  const fetchTasks = useTaskStore(state => state.fetchTasks);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  const onSubmit = async (data: TaskFormData) => {
    await addTask(data);
    reset();
    await fetchTasks();
  };

  return (
    <form className="task-editor" onSubmit={handleSubmit(onSubmit)}>

      <p className="task-editor-section-label">Add a new task</p>

      {error && <p className="task-editor-error">{error}</p>}

      <div className="task-editor-fields">

        <div className="task-editor-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            placeholder="Task title..."
            {...register('title')}
          />
          {errors.title && (
            <span className="field-error">{errors.title.message}</span>
          )}
        </div>

        <div className="task-editor-field">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            type="text"
            placeholder="Optional description..."
            {...register('description')}
          />
          {errors.description && (
            <span className="field-error">{errors.description.message}</span>
          )}
        </div>

        <div className="task-editor-field">
          <label htmlFor="dueDate">Due date</label>
          <input
            id="dueDate"
            type="date"
            {...register('dueDate')}
          />
          {errors.dueDate && (
            <span className="field-error">{errors.dueDate.message}</span>
          )}
        </div>

        <div className="task-editor-field task-editor-submit">
          <button
            className="btn-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : '+ Add task'}
          </button>
        </div>

      </div>
    </form>
  );
}