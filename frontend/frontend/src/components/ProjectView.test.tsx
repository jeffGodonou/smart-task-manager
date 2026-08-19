import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectView from './ProjectView';
import * as projectApi from '../api/projects';

vi.mock('../api/projects', () => ({
  loadProjects: vi.fn(),
  saveProject: vi.fn(),
  deleteProject: vi.fn(),
}));

describe('ProjectView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all available projects and adds a new project', async () => {
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

    render(<ProjectView />);

    expect(await screen.findByText('Backend API')).toBeTruthy();
    expect(screen.getByText('Local docs')).toBeTruthy();

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
