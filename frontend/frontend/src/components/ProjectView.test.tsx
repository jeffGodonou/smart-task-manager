import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectView from './ProjectView';
import * as projectApi from '../api/projects';
import * as taskApi from '../api/tasks';

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
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.getByText('Backend API')).toBeTruthy();
    expect(screen.getByText('Local docs')).toBeTruthy();
  });

  it('supports non-coding projects with description, category, and end date fields', async () => {
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

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Theatre production' } });
    fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'NON_CODING' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Prepare the fall show.' } });
    fireEvent.change(screen.getByLabelText('Project category'), { target: { value: 'Theatre' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: /add project/i }));

    await waitFor(() => {
      expect(projectApi.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Theatre production',
          description: 'Prepare the fall show.',
          projectType: 'NON_CODING',
          projectCategory: 'Theatre',
          endDate: '2026-10-15',
        }),
      );
    });
  });

  it('allows creating a standalone task from the list view without assigning a project', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main' },
    ]);
    vi.mocked(taskApi.createTask).mockResolvedValue({
      id: '99',
      title: 'General task',
      projectId: null,
      status: 'TODO',
      isCompleted: false,
    });

    render(<ProjectView />);

    const taskButton = await screen.findByRole('button', { name: /^create task$/i });
    fireEvent.click(taskButton);

    expect(await screen.findByText('Add a new task')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'General task' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ add task/i }));

    await waitFor(() => {
      expect(taskApi.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'General task',
          projectId: null,
          status: 'TODO',
        }),
      );
    });
  });

  it('opens the task modal for a project row even when the project id is a non-string value', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: 42 as unknown as string, name: 'Numeric project', repositoryUrl: 'https://github.com/acme/project.git', branch: 'main' },
    ]);

    render(<ProjectView />);

    const numericTaskButton = await screen.findByRole('button', { name: /create task for numeric project/i });
    fireEvent.click(numericTaskButton);

    expect(await screen.findByText('Add a new task')).toBeTruthy();
  });

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
});
