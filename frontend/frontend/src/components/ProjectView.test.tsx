import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('renders all available projects as a table and creates a task for the selected project', async () => {
    vi.mocked(projectApi.loadProjects).mockResolvedValue([
      { id: '1', name: 'Backend API', repositoryUrl: 'https://github.com/acme/backend.git', branch: 'main' },
      { id: '2', name: 'Local docs', localPath: '/workspace/docs', branch: 'dev' },
    ]);
    vi.mocked(projectApi.saveProject).mockResolvedValue({
      id: '3',
      name: 'New project',
      localPath: '/workspace/new-app',
      branch: 'main',
    });
    vi.mocked(taskApi.createTask).mockResolvedValue({
      id: '99',
      title: 'Fix API docs',
      projectId: '1',
      status: 'TODO',
      isCompleted: false,
    });

    render(<ProjectView />);

    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.getByText('Backend API')).toBeTruthy();
    expect(screen.getByText('Local docs')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /create task for backend api/i }));

    expect(await screen.findByText('Add a new task')).toBeTruthy();
    expect(screen.getByRole('button', { name: /close task form/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Fix API docs' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ add task/i }));

    await waitFor(() => {
      expect(taskApi.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fix API docs',
          projectId: '1',
          status: 'TODO',
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /close task form/i }));
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'New project' } });
    fireEvent.change(screen.getByLabelText('Local folder path'), { target: { value: '/workspace/new-app' } });
    fireEvent.click(screen.getByRole('button', { name: /add project/i }));

    await waitFor(() => {
      expect(projectApi.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New project',
          localPath: '/workspace/new-app',
          branch: 'main',
        }),
      );
    });
  });
});
