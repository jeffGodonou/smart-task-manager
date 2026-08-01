import React from 'react';
import './TaskRow.css';
import type { Task } from '../api/tasks';
import { isUrgentDueDate } from '../utils/taskUrgency';

interface TaskRowProps {
    task: Task;
    onToggle: (task: Task) => void;
    onDelete: (task: Task) => void;
    onOpen: (task: Task) => void;
}

/**
 * TaskRow Component
 * 
 * Responsibilities:
 * - Display a single task
 * - Render checkbox, title, description
 * - Trigger callbacks (toggle complete, delete)
 * - Show tooltips on hover with 3-second auto-hide
 */

export default function TaskRow({ task, onToggle, onDelete, onOpen }: TaskRowProps) {
    const [openTooltip, setOpenTooltip] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (openTooltip) {
            const timer = setTimeout(() => setOpenTooltip(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [openTooltip]);

    const showTooltip = (tooltipId: string) => {
        setOpenTooltip(tooltipId);
    };

    const hideTooltip = () => {
        setOpenTooltip(null);
    };

    const isUrgent = !task.isCompleted && isUrgentDueDate(task.dueDate);
    const taskTitle = React.createElement('div', { className: 'task-title' }, task.title);
    const taskDescription = task.description
        ? React.createElement('div', { className: 'task-description' }, task.description)
        : null;
    const taskDueDate = task.dueDate
        ? React.createElement('div', { className: `task-due-date ${isUrgent ? 'task-due-date--urgent' : ''}` }, task.dueDate)
        : null;

    // Show subtask completion indicator if task has subtasks
    let taskSubtaskInfo = null;
    if (task.subtasks && task.subtasks.length > 0) {
      const completedCount = task.subtasks.filter(s => s.isCompleted).length;
      const totalCount = task.subtasks.length;
      taskSubtaskInfo = React.createElement(
        'div',
        { className: 'task-subtask-info' },
        `${completedCount}/${totalCount} subtasks`
      );
    }

    const taskContent = React.createElement('div', { className: 'task-content' }, taskTitle, taskDescription, taskDueDate, taskSubtaskInfo);

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
            'div',
            { className: 'task-row-actions' },
            React.createElement(
                'div',
                { className: 'task-action-button-wrapper' },
                React.createElement(
                    'button',
                    {
                        className: 'task-open',
                        onClick: () => onOpen(task),
                        onMouseEnter: () => showTooltip('open'),
                        onMouseLeave: hideTooltip,
                        'aria-label': `Open ${task.title}`,
                    },
                    '✎'
                ),
                openTooltip === 'open' && React.createElement(
                    'div',
                    { className: 'task-tooltip' },
                    'Open task details'
                )
            ),
            React.createElement(
                'div',
                { className: 'task-action-button-wrapper' },
                React.createElement(
                    'button',
                    {
                        className: 'task-delete',
                        onClick: () => onDelete(task),
                        onMouseEnter: () => showTooltip('delete'),
                        onMouseLeave: hideTooltip,
                        'aria-label': `Delete ${task.title}`,
                    },
                    '🗑'
                ),
                openTooltip === 'delete' && React.createElement(
                    'div',
                    { className: 'task-tooltip' },
                    'Delete task'
                )
            )
        )
    );
}