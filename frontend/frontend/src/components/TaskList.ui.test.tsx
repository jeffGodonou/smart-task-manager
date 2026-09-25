import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TaskList from './TaskList';

vi.mock('../api/tasks.ts', () => ({
  listTasks: vi.fn(),
  deleteTask: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock('../api/projects.ts', () => ({
  loadProjects: vi.fn(),
  saveProject: vi.fn(),
}));

import { listTasks, updateTask } from '../api/tasks.ts';
import { loadProjects } from '../api/projects';
import type { Task } from '../api/tasks.ts';

const listTasksMock = vi.mocked(listTasks);
const updateTaskMock = vi.mocked(updateTask);
const loadProjectsMock = vi.mocked(loadProjects);

describe('TaskList UI edit flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadProjectsMock.mockResolvedValue([
      { id: 10, name: 'Alpha project', projectType: 'NON_CODING' },
      { id: 11, name: 'Beta project', projectType: 'CODING' },
    ]);
  });

  it('lets an existing task be linked to a project from the details modal', async () => {
    const initialTask: Task = {
      id: 'task-1',
      title: 'Linked task',
      isCompleted: false,
      status: 'TODO',
      projectId: null,
    };

    updateTaskMock.mockResolvedValue({
      ...initialTask,
      projectId: 10,
    });
    listTasksMock.mockResolvedValue([initialTask]);

    render(<TaskList />);

    await screen.findByText('Linked task');
    fireEvent.click(screen.getByRole('button', { name: /Open Linked task/i }));

    const projectSelect = await screen.findByLabelText('Task project') as HTMLSelectElement;
    fireEvent.change(projectSelect, { target: { value: '10' } });

    await waitFor(() => {
      expect((screen.getByLabelText('Task project') as HTMLSelectElement).value).toBe('10');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ projectId: 10 })
      );
    });
  });

  it('keeps incomplete tasks above completed ones and sorts each group by due date ascending', async () => {
    listTasksMock.mockResolvedValue([
      { id: 'done-late', title: 'Late done task', isCompleted: true, dueDate: '2026-09-20' },
      { id: 'open-2', title: 'Second open task', isCompleted: false, dueDate: '2026-09-12' },
      { id: 'done-early', title: 'Early done task', isCompleted: true, dueDate: '2026-09-10' },
      { id: 'open-1', title: 'First open task', isCompleted: false, dueDate: '2026-09-09' },
    ]);

    render(<TaskList />);

    await screen.findByText('First open task');

    const taskTitles = screen.getAllByText(/(First open task|Second open task|Early done task|Late done task)/i)
      .map((node) => node.textContent);

    expect(taskTitles.indexOf('First open task')).toBeLessThan(taskTitles.indexOf('Second open task'));
    expect(taskTitles.indexOf('Second open task')).toBeLessThan(taskTitles.indexOf('Early done task'));
    expect(taskTitles.indexOf('Early done task')).toBeLessThan(taskTitles.indexOf('Late done task'));
  });

  it('transitions parent task from IN_PROGRESS to DONE after completing remaining subtask', async () => {
    const initialTask: Task = {
      id: 'parent-1',
      title: 'Parent task',
      status: 'IN_PROGRESS',
      isCompleted: false,
      subtasks: [
        { title: 'Child 1', isCompleted: true, status: 'DONE' },
        { title: 'Child 2', isCompleted: false, status: 'TODO' },
      ],
    };

    const updatedTask: Task = {
      ...initialTask,
      status: 'DONE',
      isCompleted: true,
      subtasks: [
        { title: 'Child 1', isCompleted: true, status: 'DONE' },
        { title: 'Child 2', isCompleted: true, status: 'DONE' },
      ],
    };

    listTasksMock.mockResolvedValue([initialTask]);
    updateTaskMock.mockResolvedValue(updatedTask);

    render(<TaskList />);

    await screen.findByText('Parent task');

    fireEvent.click(screen.getByRole('button', { name: /Open Parent task/i }));

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    expect(statusSelect.value).toBe('IN_PROGRESS');

    const subtaskCheckboxes = screen
      .getAllByRole('checkbox')
      .filter((checkbox) =>
        checkbox.closest('.task-modal-subtask-item') !== null
      ) as HTMLInputElement[];

    const remainingSubtask = subtaskCheckboxes.find((checkbox) => !checkbox.checked);
    expect(remainingSubtask).toBeDefined();
    fireEvent.click(remainingSubtask!);

    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('DONE');

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledWith(
        'parent-1',
        expect.objectContaining({
          status: 'DONE',
          isCompleted: true,
          subtasks: expect.arrayContaining([
            expect.objectContaining({ title: 'Child 1', isCompleted: true }),
            expect.objectContaining({ title: 'Child 2', isCompleted: true }),
          ]),
        })
      );
    });

    await waitFor(() => {
      const parentCheckbox = screen.getByRole('checkbox', {
        name: /Mark Parent task as incomplete/i,
      }) as HTMLInputElement;
      expect(parentCheckbox.checked).toBe(true);
    });
  });
});
