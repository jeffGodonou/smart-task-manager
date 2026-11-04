import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TaskList from './TaskList';
import TaskEditor from './TaskEditor';

// Replace the API modules with mocks so tests never hit the network;
// each test controls the returned data through these vi.fn() handles.
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
import { useTaskStore } from '../store/TaskStore';
import type { Task } from '../api/tasks.ts';

const listTasksMock = vi.mocked(listTasks);
const updateTaskMock = vi.mocked(updateTask);
const loadProjectsMock = vi.mocked(loadProjects);
const taskStoreActions = useTaskStore.getState();

describe('TaskList UI edit flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the global task store to a clean slate, keeping the real action
    // implementations so components behave as they do in production.
    useTaskStore.setState({
      tasks: [],
      projectProgress: {},
      isLoading: false,
      error: null,
      hasLoaded: false,
      fetchTasks: taskStoreActions.fetchTasks,
      addTask: taskStoreActions.addTask,
      removeTask: taskStoreActions.removeTask,
      toggleComplete: taskStoreActions.toggleComplete,
      upsertTask: taskStoreActions.upsertTask,
    });
    // Two projects are available for linking tasks in every test.
    loadProjectsMock.mockResolvedValue([
      { id: 10, name: 'Alpha project', projectType: 'NON_CODING' },
      { id: 11, name: 'Beta project', projectType: 'CODING' },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it('lets a new task be created with an explicit status selection', async () => {
    const addTaskMock = vi.fn().mockResolvedValue({
      id: 'task-2',
      title: 'New task',
      status: 'IN_PROGRESS',
      isCompleted: false,
    });

    // Swap in a spy for addTask so we can assert exactly what the editor submits.
    useTaskStore.setState({
      tasks: [],
      projectProgress: {},
      isLoading: false,
      error: null,
      hasLoaded: true,
      addTask: addTaskMock,
      fetchTasks: vi.fn(),
      removeTask: vi.fn(),
      toggleComplete: vi.fn(),
      upsertTask: vi.fn(),
    });

    render(<TaskEditor />);

    // Fill the form, choosing a non-default status, then submit.
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New task' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'IN_PROGRESS' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add task' }));

    // The chosen status must be passed through instead of the default TODO.
    await waitFor(() => {
      expect(addTaskMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New task',
        status: 'IN_PROGRESS',
        isCompleted: false,
      }));
    });
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

    // Open the task's details modal.
    await screen.findByText('Linked task');
    fireEvent.click(screen.getByRole('button', { name: /Open Linked task/i }));

    // Pick "Alpha project" (id 10) in the project dropdown.
    const projectSelect = await screen.findByLabelText('Task project') as HTMLSelectElement;
    fireEvent.change(projectSelect, { target: { value: '10' } });

    await waitFor(() => {
      expect((screen.getByLabelText('Task project') as HTMLSelectElement).value).toBe('10');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    // The update call must carry the newly linked projectId.
    await waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ projectId: 10 })
      );
    });
  });

  it('keeps incomplete tasks above completed ones and sorts each group by due date ascending', async () => {
    // Deliberately unsorted input: expected display order is
    // open-1 (Sep 9), open-2 (Sep 12), done-early (Sep 10), done-late (Sep 20).
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

  it('shows 10 tasks per page and paginates the rest', async () => {
    // 15 tasks at 10 per page should produce exactly 2 pages.
    const tasks: Task[] = Array.from({ length: 15 }, (_, index) => ({
      id: `task-${index + 1}`,
      title: `Task ${index + 1}`,
      isCompleted: index % 2 === 0,
      status: index % 2 === 0 ? 'DONE' : 'TODO',
      dueDate: `2026-09-${String((index % 28) + 1).padStart(2, '0')}`,
    }));

    listTasksMock.mockResolvedValue(tasks);

    render(<TaskList />);

    // Page 1 shows tasks 1-10; task 11 must not be rendered yet.
    expect(await screen.findByText('Task 1')).toBeTruthy();
    expect(screen.getByText('Page 1 of 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: /next page/i })).toBeTruthy();
    expect(screen.queryByText('Task 11')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));

    // Page 2 reveals the remaining tasks.
    await waitFor(() => {
      expect(screen.getByText('Page 2 of 2')).toBeTruthy();
    });
    expect(screen.getByText('Task 11')).toBeTruthy();
  });

  it('marks multiple selected tasks complete in one bulk action', async () => {
    const tasks: Task[] = [
      { id: 'task-1', title: 'First task', isCompleted: false, status: 'TODO' },
      { id: 'task-2', title: 'Second task', isCompleted: false, status: 'TODO' },
    ];
    listTasksMock.mockResolvedValue(tasks);
    // Echo the update back merged into the original task, like the real API would.
    updateTaskMock.mockImplementation(async (id, updates) => ({
      ...tasks.find(task => task.id === id)!,
      ...updates,
    }));

    render(<TaskList />);

    // Select both tasks via their row checkboxes, then trigger the bulk action.
    await screen.findByText('First task');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select First task' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Second task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark 2 selected complete' }));

    // Each selected task gets its own update call marking it DONE.
    await waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledTimes(2);
    });
    expect(updateTaskMock).toHaveBeenCalledWith('task-1', {
      isCompleted: true,
      status: 'DONE',
    });
    expect(updateTaskMock).toHaveBeenCalledWith('task-2', {
      isCompleted: true,
      status: 'DONE',
    });
    // The bulk-action button disappears once the selection is cleared.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /selected complete/i })).toBeNull();
    });
  });

  it('transitions parent task from IN_PROGRESS to DONE after completing remaining subtask', async () => {
    // Parent starts IN_PROGRESS with one subtask done and one still open.
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

    // Narrow to the subtask checkboxes inside the modal (other checkboxes on
    // the page, e.g. row selectors, must be excluded).
    const subtaskCheckboxes = screen
      .getAllByRole('checkbox')
      .filter((checkbox) =>
        checkbox.closest('.task-modal-subtask-item') !== null
      ) as HTMLInputElement[];

    // Complete the only remaining open subtask.
    const remainingSubtask = subtaskCheckboxes.find((checkbox) => !checkbox.checked);
    expect(remainingSubtask).toBeDefined();
    fireEvent.click(remainingSubtask!);

    // With all subtasks done, the parent status auto-flips to DONE.
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('DONE');

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    // The persisted update must include the DONE status and both completed subtasks.
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

    // Back in the list, the parent's row checkbox reflects its completed state.
    await waitFor(() => {
      const parentCheckbox = screen.getByRole('checkbox', {
        name: /Mark Parent task as incomplete/i,
      }) as HTMLInputElement;
      expect(parentCheckbox.checked).toBe(true);
    });
  });
});
