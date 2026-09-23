import { clearToken, getAuthHeaders } from './auth';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const base = `${apiBaseUrl}/api/projects`;

export type ProjectType = 'CODING' | 'NON_CODING';

export type GitProject = {
  id?: string | number;
  name: string;
  description?: string;
  projectType?: ProjectType;
  projectCategory?: string;
  endDate?: string;
  repositoryUrl?: string;
  githubAccount?: string;
  localPath?: string;
  branch?: string;
};

function normalizeProjectType(projectType?: ProjectType | null): ProjectType {
  return projectType === 'CODING' ? 'CODING' : 'NON_CODING';
}

function normalizeProject(project: GitProject): GitProject {
  return {
    ...project,
    projectType: normalizeProjectType(project.projectType),
    projectCategory: project.projectCategory?.trim() ?? '',
    endDate: project.endDate?.trim() ?? '',
    repositoryUrl: project.repositoryUrl?.trim() ?? '',
    githubAccount: project.githubAccount?.trim() ?? '',
    localPath: project.localPath?.trim() ?? '',
    branch: project.branch?.trim() || 'main',
  };
}

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
  return Array.isArray(projects) ? projects.map(normalizeProject) : [];
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

  const method = project.id ? 'PUT' : 'POST';
  const url = project.id ? `${base}/${project.id}` : base;

  const normalizedProject = normalizeProject(project);

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      ...normalizedProject,
      name: normalizedProject.name.trim(),
      description: normalizedProject.description?.trim() ?? '',
      projectType: normalizeProjectType(normalizedProject.projectType),
      projectCategory: normalizedProject.projectCategory?.trim() ?? '',
      endDate: normalizedProject.endDate?.trim() ?? '',
      repositoryUrl: normalizedProject.repositoryUrl?.trim() ?? '',
      githubAccount: normalizedProject.githubAccount?.trim() ?? '',
      localPath: normalizedProject.localPath?.trim() ?? '',
      branch: normalizedProject.branch?.trim() || 'main',
    }),
  });

  if (response.status === 401) {
    clearToken();
    throw new Error('Your session expired. Please log in again.');
  }

  if (!response.ok) {
    let message = 'Failed to save project';

    try {
      const payload = await response.json() as { error?: string; message?: string };
      message = payload.error || payload.message || message;
    } catch {
      const fallbackMessage = await response.text();
      if (fallbackMessage) {
        message = fallbackMessage;
      }
    }

    throw new Error(message);
  }

  return response.json() as Promise<GitProject>;
}
