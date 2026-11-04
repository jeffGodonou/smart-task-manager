// Tests for ProjectView (project list, type filtering, status column, form
// validation, edit flow, per-project task modal) and for TaskEditor (project
// linking, validation, close button, inline project creator).
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectView from './ProjectView';
import TaskEditor from './TaskEditor';
import * as projectApi from '../api/projects';
import * as taskApi from '../api/tasks';
import { useTaskStore } from '../store/TaskStore';

// Replace the API layer with mocks so tests never hit the real backend.
// vi.mock calls are hoisted, so the factories must be self-contained.
vi.mock('../api/projects', () => ({
  loadProjects: vi.fn(),
  loadProject: vi.fn().mockResolvedValue({ id: '1', name: 'Backend API' }),
  saveProject: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock('../api/tasks', () => ({
  listTasks: vi.fn().mockResolvedValue([]),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  updateTask: vi.fn(),
}));

describe('ProjectView', () => {
  // Reset mock call history and unmount rendered components between tests.
  beforeEach(() => {
    vi.clearAllMocks();
    // The zustand store is module-level and shared across tests; reset it and
    // re-establish the default listTasks implementation (clearAllMocks keeps
    // implementations, so an override in one test would otherwise leak into
    // the next).
    useTaskStore.setState({ tasks: [], projectProgress: {}, isLoading: false, error: null, hasLoaded: false });
    vi.mocked(taskApi.listTasks).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all available projects in the list view', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main' },
      { id: '2', name: 'Local docs', localPath: '/workspace/docs', branch: 'dev' },
    ]);

    render(<ProjectView />);

    // findBy* waits for the asynchronous project load to complete.
    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.getByText('Backend API')).toBeTruthy();
    expect(screen.getByText('Local docs')).toBeTruthy();
  });

  it('defaults new projects to non-coding and allows switching back to coding', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([]);
    vi.mocked(projectApi.saveProject).mockResolvedValue({
      id: '3',
      name: 'Theatre production',
      description: 'Prepare the fall show.',
      projectType: 'NON_CODING',
      projectCategory: 'Theatre',
      endDate: '2026-10-15',
    });

    render(<ProjectView />);

    // The form defaults to NON_CODING...
    expect((screen.getByLabelText('Project type') as HTMLSelectElement).value).toBe('NON_CODING');

    // ...but the user can switch back to CODING, which enables the repository URL field.
    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });
    expect((screen.getByLabelText('Project type') as HTMLSelectElement).value).toBe('CODING');

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Theatre production' } });
    fireEvent.change(screen.getByLabelText('Git repository URL'), { target: { value: 'https://github.com/acme/show.git' } });
    fireEvent.click(screen.getByRole('button', { name: /add project/i }));

    await waitFor(() => {
      expect(projectApi.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Theatre production',
          projectType: 'CODING',
          repositoryUrl: 'https://github.com/acme/show.git',
        }),
      );
    });
  });

  it('shows only the projects matching the active project type', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main', projectType: 'CODING' },
      { id: '2', name: 'Theatre production', description: 'Prepare the fall show.', projectType: 'NON_CODING', projectCategory: 'Theatre', endDate: '2026-10-15' },
      { id: '3', name: 'Launch plan', description: 'Marketing launch.', projectType: 'NON_CODING', projectCategory: 'Marketing', endDate: '2026-11-01' },
    ]);

    render(<ProjectView />);

    // The list is filtered by the type selector, which defaults to NON_CODING.
    expect(await screen.findByText('Theatre production')).toBeTruthy();
    expect(screen.getByText('Launch plan')).toBeTruthy();
    expect(screen.queryByText('Backend API')).toBeNull();
    expect(screen.getByRole('button', { name: /edit theatre production/i })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });

    await waitFor(() => {
      expect(screen.getByText('Backend API')).toBeTruthy();
    });
    expect(screen.queryByText('Theatre production')).toBeNull();
    expect(screen.queryByText('Launch plan')).toBeNull();
  });

  it('shows project advancement in the status column', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main', projectType: 'CODING' },
    ]);
    vi.mocked(taskApi.listTasks).mockResolvedValue([
      { id: 'a', title: 'Setup', projectId: '1', status: 'TODO', isCompleted: false },
      { id: 'b', title: 'Ship', projectId: '1', status: 'DONE', isCompleted: true },
    ]);

    render(<ProjectView />);

    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });

    expect(await screen.findByText('Status')).toBeTruthy();
    // One of the two tasks is DONE, so advancement should read 50%.
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText(/in progress|complete|started/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /edit backend api/i })).toBeTruthy();
  });

  // This test renders TaskEditor on its own (not inside ProjectView).
  it('lets a task be linked to an existing project', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main', projectType: 'CODING' },
      { id: '2', name: 'Launch plan', description: 'Marketing launch', projectType: 'NON_CODING', projectCategory: 'Marketing', endDate: '2026-11-01' },
    ]);
    vi.mocked(taskApi.createTask).mockResolvedValue({
      id: '99',
      title: 'Project-linked task',
      projectId: 1,
      status: 'TODO',
      isCompleted: false,
    });

    render(<TaskEditor />);

    expect(await screen.findByLabelText('Project')).toBeTruthy();

    // Select values are strings; TaskEditor converts the chosen id to a number.
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Project-linked task' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ add task/i }));

    await waitFor(() => {
      expect(taskApi.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Project-linked task',
          projectId: 1,
          status: 'TODO',
        }),
      );
    });
  });

  // When the modal is opened from a project row, the project is already known,
  // so the form should not ask for it again.
  it('hides the project selector when creating a task from a project modal', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '42', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main' },
    ]);

    render(<ProjectView />);

    const projectTaskButton = await screen.findByRole('button', { name: /create task for backend api/i });
    fireEvent.click(projectTaskButton);

    expect(await screen.findByText('Add a new task')).toBeTruthy();
    expect(screen.queryByLabelText('Project')).toBeNull();
  });

  it('opens the task modal for a project row even when the project id is a non-string value', async () => {
    // The backend can return numeric ids even though the TS type says string;
    // the cast simulates that mismatch.
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: 42 as unknown as string, name: 'Numeric project', repositoryUrl: 'https://github.com/acme/project.git', branch: 'main' },
    ]);

    render(<ProjectView />);

    const numericTaskButton = await screen.findByRole('button', { name: /create task for numeric project/i });
    fireEvent.click(numericTaskButton);

    expect(await screen.findByText('Add a new task')).toBeTruthy();
  });

  // The modal must convert the project's string id to a number in the create payload.
  it('sends a numeric projectId when creating a task from a project modal', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '42', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main' },
    ]);
    vi.mocked(taskApi.createTask).mockResolvedValue({
      id: '99',
      title: 'Planned task',
      projectId: 42,
      status: 'TODO',
      isCompleted: false,
    });

    render(<ProjectView />);

    const projectTaskButton = await screen.findByRole('button', { name: /create task for backend api/i });
    fireEvent.click(projectTaskButton);

    expect(await screen.findByText('Add a new task')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Planned task' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ add task/i }));

    await waitFor(() => {
      expect(taskApi.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Planned task',
          projectId: 42,
          status: 'TODO',
        }),
      );
    });
  });

  it('requires a project name before saving', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([]);

    render(<ProjectView />);

    // Submit with the name field left empty.
    fireEvent.click(screen.getByRole('button', { name: /add project/i }));

    expect(await screen.findByText('Project name is required.')).toBeTruthy();
    expect(projectApi.saveProject).not.toHaveBeenCalled();
  });

  it('requires a repository URL or a local path for coding projects', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([]);

    render(<ProjectView />);

    // A coding project with a name but no repository URL or local path is invalid.
    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Backend API' } });
    fireEvent.click(screen.getByRole('button', { name: /add project/i }));

    expect(await screen.findByText('Coding projects require a repository URL or a local path.')).toBeTruthy();
    expect(projectApi.saveProject).not.toHaveBeenCalled();
  });

  it('shows an empty state when no projects match the active type', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([]);

    render(<ProjectView />);

    expect(await screen.findByRole('heading', { name: /no non-coding projects yet/i })).toBeTruthy();

    // The empty state follows the active type filter.
    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });
    expect(screen.getByRole('heading', { name: /no coding projects yet/i })).toBeTruthy();
  });

  it('switches the table columns based on the active project type', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main', projectType: 'CODING' },
      { id: '2', name: 'Theatre production', description: 'Prepare the fall show.', projectType: 'NON_CODING', projectCategory: 'Theatre', endDate: '2026-10-15' },
    ]);

    render(<ProjectView />);

    // Non-coding columns are shown by default. Column headers are queried by
    // role because some names (e.g. "End date", "Branch") also appear as form labels.
    expect(await screen.findByRole('columnheader', { name: 'Details' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Category / Timeline' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'End date' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });

    expect(screen.getByRole('columnheader', { name: 'Repository / Path' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'GitHub' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Branch' })).toBeTruthy();
  });

  it('creates a non-coding project with category and end date', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([]);
    vi.mocked(projectApi.saveProject).mockResolvedValue({
      id: '7',
      name: 'Theatre production',
      description: 'Prepare the fall show.',
      projectType: 'NON_CODING',
      projectCategory: 'Theatre',
      endDate: '2026-10-15',
    });

    render(<ProjectView />);

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Theatre production' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Prepare the fall show.' } });
    fireEvent.change(screen.getByLabelText('Project category'), { target: { value: 'Theatre' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: /add project/i }));

    await waitFor(() => {
      expect(projectApi.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Theatre production',
          projectType: 'NON_CODING',
          projectCategory: 'Theatre',
          endDate: '2026-10-15',
        }),
      );
    });

    // The new project appears in the (non-coding) list.
    expect(await screen.findByText('Theatre production')).toBeTruthy();
  });

  it('populates the form for editing and saves changes to the project', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main', projectType: 'CODING' },
    ]);
    vi.mocked(projectApi.saveProject).mockResolvedValue({
      id: '1',
      name: 'Backend API v2',
      repositoryUrl: 'https://github.com/acme/backend.git',
      branch: 'main',
      projectType: 'CODING',
    });

    render(<ProjectView />);

    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });
    fireEvent.click(await screen.findByRole('button', { name: /edit backend api/i }));

    // The form is pre-filled with the project's values and the submit button
    // switches to "Save changes".
    expect((screen.getByLabelText('Project name') as HTMLInputElement).value).toBe('Backend API');
    expect((screen.getByLabelText('Git repository URL') as HTMLInputElement).value).toBe('https://github.com/acme/backend.git');

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Backend API v2' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // The existing project id is sent so the backend updates instead of creating.
    await waitFor(() => {
      expect(projectApi.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', name: 'Backend API v2' }),
      );
    });

    // The form returns to "add" mode after a successful save.
    expect(screen.getByRole('button', { name: /add project/i })).toBeTruthy();

    // The updated project replaces the old one in the list (the draft reset
    // switched the filter back to NON_CODING, so switch to CODING again).
    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });
    expect(await screen.findByText('Backend API v2')).toBeTruthy();
    expect(screen.queryByText('Backend API')).toBeNull();
  });

  it('cancels editing and restores the empty form', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main', projectType: 'CODING' },
    ]);

    render(<ProjectView />);

    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });
    fireEvent.click(await screen.findByRole('button', { name: /edit backend api/i }));
    expect((screen.getByLabelText('Project name') as HTMLInputElement).value).toBe('Backend API');

    fireEvent.click(screen.getByRole('button', { name: /cancel edit/i }));

    // The draft is cleared and the form returns to "add" mode.
    expect((screen.getByLabelText('Project name') as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('button', { name: /add project/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /cancel edit/i })).toBeNull();
  });

  it('shows an error message when saving a project fails', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([]);
    vi.mocked(projectApi.saveProject).mockRejectedValue(new Error('Server unavailable'));

    render(<ProjectView />);

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Theatre production' } });
    fireEvent.click(screen.getByRole('button', { name: /add project/i }));

    // The rejection message from the API is surfaced to the user.
    expect(await screen.findByText('Server unavailable')).toBeTruthy();
  });

  it('shows "No tasks" for a project without tasks', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main', projectType: 'CODING' },
    ]);
    vi.mocked(taskApi.listTasks).mockResolvedValue([]);

    render(<ProjectView />);

    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });

    expect(await screen.findByText('No tasks')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByText('0/0 done')).toBeTruthy();
  });

  it('shows "Complete" when all project tasks are done', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main', projectType: 'CODING' },
    ]);
    vi.mocked(taskApi.listTasks).mockResolvedValue([
      { id: 'a', title: 'Setup', projectId: '1', status: 'DONE', isCompleted: true },
      { id: 'b', title: 'Ship', projectId: '1', status: 'DONE', isCompleted: true },
    ]);

    render(<ProjectView />);

    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'CODING' } });

    expect(await screen.findByText('100%')).toBeTruthy();
    expect(screen.getByText('Complete')).toBeTruthy();
    expect(screen.getByText('2/2 done')).toBeTruthy();
  });

  it('closes the task modal when the close button is clicked', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '42', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main' },
    ]);

    render(<ProjectView />);

    fireEvent.click(await screen.findByRole('button', { name: /create task for backend api/i }));
    expect(await screen.findByText('Add a new task')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /close task form/i }));

    await waitFor(() => {
      expect(screen.queryByText('Add a new task')).toBeNull();
    });
  });

  // The tests below render TaskEditor on its own (not inside ProjectView).

  it('requires a title before creating a task', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([]);

    render(<TaskEditor />);

    fireEvent.click(screen.getByRole('button', { name: /\+ add task/i }));

    // The zod schema blocks submission and surfaces the field error.
    expect(await screen.findByText('Title is required')).toBeTruthy();
    expect(taskApi.createTask).not.toHaveBeenCalled();
  });

  it('calls onClose when the close button is clicked', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([]);
    const onClose = vi.fn();

    render(<TaskEditor showCloseButton={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close task form/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('creates a project from the task form and selects it', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([]);
    vi.mocked(projectApi.saveProject).mockResolvedValue({
      id: '5',
      name: 'Launch plan',
      projectType: 'NON_CODING',
    });

    render(<TaskEditor />);

    // Open the inline project creator next to the project selector.
    fireEvent.click(screen.getByRole('button', { name: /\+ new project/i }));

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Launch plan' } });
    fireEvent.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(projectApi.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Launch plan', projectType: 'NON_CODING' }),
      );
    });

    // The creator closes and the new project becomes the selected option.
    await waitFor(() => {
      expect((screen.getByLabelText('Project') as HTMLSelectElement).value).toBe('5');
    });
    expect(screen.queryByRole('button', { name: /create project/i })).toBeNull();
  });
});
