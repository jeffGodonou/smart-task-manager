import { clearToken, getAuthHeaders } from './auth';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const base = `${apiBaseUrl}/api/projects`;

export type GitProject = {
  id?: string;
  name: string;
  repositoryUrl?: string;
  githubAccount?: string;
  localPath?: string;
  branch?: string;
};

export async function loadProjects(): Promise<GitProject[]> {
  const headers = getAuthHeaders();
  if (!headers.Authorization) return [];

  const response = await fetch(base, { headers });
  if (response.status === 404) return [];
  if (response.status === 401) {
    clearToken();
    throw new Error('Your session expired. Please log in again.');
  }
  if (!response.ok) {
    throw new Error(`Failed to load project: ${response.status}`);
  }

  const projects = await response.json() as GitProject[];
  return Array.isArray(projects) ? projects : [];
}

export async function loadProject(): Promise<GitProject | null> {
  const projects = await loadProjects();
  return projects.length > 0 ? projects[0] : null;
}

export async function saveProject(project: GitProject): Promise<GitProject> {
  const headers = getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error('You must be logged in to manage a project.');
  }

  const existing = await loadProject();
  const method = existing?.id ? 'PUT' : 'POST';
  const url = existing?.id ? `${base}/${existing.id}` : base;

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      ...project,
      name: project.name.trim(),
      repositoryUrl: project.repositoryUrl?.trim() ?? '',
      githubAccount: project.githubAccount?.trim() ?? '',
      localPath: project.localPath?.trim() ?? '',
      branch: project.branch?.trim() || 'main',
    }),
  });

  if (response.status === 401) {
    clearToken();
    throw new Error('Your session expired. Please log in again.');
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to save project');
  }

  return response.json() as Promise<GitProject>;
}
