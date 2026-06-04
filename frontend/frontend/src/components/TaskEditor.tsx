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
  const addTask = useTaskStore(state => state.addTask);
  const error = useTaskStore(state => state.error);
  const fetchTasks = useTaskStore(state => state.fetchTasks);

  useEffect (() => {
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
    await addTask(data)
    reset();
    await fetchTasks();
  }

  return (
    <form className="task-editor" data-completed={false} onSubmit={handleSubmit(onSubmit)}>
      {error && <p className="task-error">{error}</p>}
      <div className="task-content">
        <input
          className="task-title"
          type="text"
          placeholder="Title"
          {...register('title')}
        />
        {errors.title && <span className="field-error">{errors.title?.message}</span>}
        <input
          className="task-description"
          type="text"
          placeholder="Description"
          {...register('description')}
        />
        {errors.description && <span className="field-error">{errors.description.message}</span>}
        <input
          className="task-due-date"
          type="date"
          {...register('dueDate')}
        />
        {errors.dueDate && <span className="field-error">{errors.dueDate.message}</span>}
      </div>
      <button className="task-create" type="submit" disabled={isSubmitting}>
        {isSubmitting ?'Adding...' : 'Add'}
      </button>
    </form>
  );
}