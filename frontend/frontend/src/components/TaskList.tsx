import { useEffect, useMemo, useState } from 'react';
import { updateTask } from '../api/tasks.ts';
import type { Task } from '../api/tasks.ts';
import TaskRow from './TaskRow.tsx';
import TaskDetailsModal from './TaskDetailsModal';
import './TaskList.css';
import TaskEditor from './TaskEditor.tsx';
import { sortTasksByCompletionAndDueDate } from '../utils/taskOrdering';
import { useTaskStore } from '../store/TaskStore';
import { flattenTaskTree } from '../utils/taskTree';

/**
 * TaskList Component
 *
 * Responsibilities:
 * - Fetch tasks from API on mount
 * - Display list of tasks with TaskRow sub-component
 * - Handle delete and toggle complete actions
 * - Show loading / error / empty states
 */
type TaskListProps = {
  onTasksChange?: (tasks: any[]) => void;
  refreshKey?: number;
};

const TASKS_PER_PAGE = 10;

export default function TaskList({ onTasksChange, refreshKey = 0 }: TaskListProps) {
  const tasks = useTaskStore(state => state.tasks);
  const loading = useTaskStore(state => state.isLoading);
  const errorMessage = useTaskStore(state => state.error);
  const fetchTasks = useTaskStore(state => state.fetchTasks);
  const removeTask = useTaskStore(state => state.removeTask);
  const toggleComplete = useTaskStore(state => state.toggleComplete);
  const upsertTask = useTaskStore(state => state.upsertTask);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks, refreshKey]);

  useEffect(() => {
    if (onTasksChange) onTasksChange(tasks);
  }, [onTasksChange, tasks]);

  async function handleDelete(task: Task) {
    try {
      await removeTask(task.id!);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to delete task: ' + message);
    }
  }

  async function handleToggleComplete(task: Task) {
    if (task.subtasks && task.subtasks.length > 0) return;
    try {
      const nextCompleted = !task.isCompleted;
      const updated = await updateTask(task.id!, {
        ...task,
        isCompleted: nextCompleted,
        status: nextCompleted ? 'DONE' : 'TODO',
      });
      upsertTask(updated);
      await toggleComplete(task.id!, task.isCompleted ?? false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to update task: ' + message);
    }
  }

  async function handleSaveTaskDetails(updates: any) {
    if (!selectedTask?.id) {
      return;
    }
    try {
      const updated = await updateTask(selectedTask.id, updates);
      upsertTask(updated);
      if (onTasksChange) {
        onTasksChange(tasks);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to save task details: ' + message);
      throw err;
    }
  }

  const flattenedTasks = useMemo(
    () => sortTasksByCompletionAndDueDate(flattenTaskTree(tasks)),
    [tasks],
  );

  const filteredTasks = useMemo(() => flattenedTasks.filter(t => {
    if (filter === 'active') return !t.isCompleted;
    if (filter === 'completed') return t.isCompleted;
    return true;
  }), [filter, flattenedTasks]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedTasks = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * TASKS_PER_PAGE;
    return filteredTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);
  }, [filteredTasks, safeCurrentPage]);

  if (loading) {
    return (
      <div className="task-list-shell">
        <div className="task-list-loading">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="task-list-shell">
        <div className="task-list-error">{errorMessage}</div>
      </div>
    );
  }

  return (
    <>
    <TaskEditor
      onTaskCreated={() => undefined}
      onClose={() => setSelectedTask(null)}
    />

    <div className="task-list-shell">

      {/* Filter tabs + count */}
      <div className="task-list-toolbar">
        <div className="task-filter-tabs">
          {(['all', 'active', 'completed'] as const).map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span className="task-count">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="task-list-empty">
          {filter === 'all'
            ? 'No tasks yet — add one above.'
            : `No ${filter} tasks.`}
        </div>
      ) : (
        <div className="task-list">
          {/* Table header */}
          <div className="task-list-header">
            <span className="task-list-header-spacer" aria-hidden="true" />
            <span>Title</span>
            <span>Description</span>
            <span>Due date</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {/* Rows */}
          {paginatedTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={handleToggleComplete}
              onDelete={handleDelete}
              onOpen={setSelectedTask}
            />
          ))}
        </div>
      )}

      {filteredTasks.length > 0 && totalPages > 1 && (
        <div className="task-list-pagination" aria-label="Task pagination">
          <button
            type="button"
            className="task-page-button"
            onClick={() => setCurrentPage(value => Math.max(1, value - 1))}
            disabled={safeCurrentPage === 1}
            aria-label="Previous page"
          >
            Previous page
          </button>

          <span className="task-page-indicator" aria-live="polite">
            Page {safeCurrentPage} of {totalPages}
          </span>

          <button
            type="button"
            className="task-page-button"
            onClick={() => setCurrentPage(value => Math.min(totalPages, value + 1))}
            disabled={safeCurrentPage === totalPages}
            aria-label="Next page"
          >
            Next page
          </button>
        </div>
      )}

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={handleSaveTaskDetails}
        />
      )}
    </div>
  </> );
}