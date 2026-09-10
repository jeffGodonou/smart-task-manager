import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectView from './ProjectView';
import TaskEditor from './TaskEditor';
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

    fireEvent.click(screen.getAllByRole('button', { name: /^create task$/i })[0]);

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
});
