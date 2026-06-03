import React, { useEffect, useState } from 'react';
import { listTasks, deleteTask, updateTask} from '../api/tasks.ts';
import TaskRow from './TaskRow.ts';
import './TaskList.css';

/**
 * TaskList Component
 * 
 * Responsibilities:
 * - Fetch tasks from API on mount
 * - Display list of tasks with TaskRow sub-component
 * - Handle delete action
 * - Handle toggle complete action
 * - Show loading/error states
 */

type TaskListProps = {
    onTasksChange?: (tasks: any[]) => void;
};

export default function TaskList({ onTasksChange }: TaskListProps) {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        loadTasks();
    }, []);

    async function loadTasks() {
        try {
            setLoading(true);
            setError(null);
            const data = await listTasks();
            setTasks(data);
            if (onTasksChange) onTasksChange(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError('Failed to load tasks: ' + message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(task: any) {
        try {
            await deleteTask(task.id);
            setTasks(prev => prev.filter(t => t.id !== task.id));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError('Failed to delete task: ' + message);
        }
    }

    async function handleToggleComplete(task: any) {
        try {
            const updated = await updateTask(task.id, {
                ...task,
                isCompleted: !task.isCompleted
            });
            setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError('Failed to update task: ' + message);
        }
    }

    if (loading) return React.createElement('div', { className: 'task-list loading' }, 'Loading task...');

    if (error) return React.createElement('div', { className: 'task-list error' }, error);

    if (!tasks || tasks.length === 0) return React.createElement('div', {className: 'task-list empty'}, 'No tasks yet. Create a new task to get started');

    return React.createElement('div', 
                                { className: 'task-list' }, 
                                tasks.map(task => 
                                    React.createElement(TaskRow, 
                                        {
                                            key: task.id,
                                            task: task,
                                            onToggle: handleToggleComplete,
                                            onDelete: handleDelete
                                        })));
}