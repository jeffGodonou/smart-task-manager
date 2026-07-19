import React from 'react';
import './TaskRow.css';
import type { Task } from '../api/tasks';
import { isUrgentDueDate } from '../utils/taskUrgency';

interface TaskRowProps {
    task: Task;
    onToggle: (task: Task) => void;
    onDelete: (task: Task) => void;
}

/**
 * TaskRow Component
 * 
 * Responsibilities:
 * - Display a single task
 * - Render checkbox, title, description
 * - Trigger callbacks (toggle complete, delete)
 */

export default function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
    const isUrgent = !task.isCompleted && isUrgentDueDate(task.dueDate);
    const taskTitle = React.createElement('div', { className: 'task-title' }, task.title);
    const taskDescription = task.description
        ? React.createElement('div', { className: 'task-description' }, task.description)
        : null;
    const taskDueDate = task.dueDate
        ? React.createElement('div', { className: `task-due-date ${isUrgent ? 'task-due-date--urgent' : ''}` }, task.dueDate)
        : null;
    const taskContent = React.createElement('div', { className: 'task-content' }, taskTitle, taskDescription, taskDueDate);

    return React.createElement(
        'div',
        { className: `task-row ${isUrgent ? 'task-row--urgent' : ''}`, 'data-completed': task.isCompleted },
        React.createElement('input', {
            type: 'checkbox',
            checked: task.isCompleted || false,
            onChange: () => onToggle(task),
            className: 'task-checkbox',
            'aria-label': `Mark ${task.title} as ${task.isCompleted ? 'incomplete' : 'complete'}`,
        }),
        taskContent,
        React.createElement(
            'button',
            {
                className: 'task-delete',
                onClick: () => onDelete(task),
                'aria-label': `Delete ${task.title}`,
            },
            'Delete'
        )
    );
}