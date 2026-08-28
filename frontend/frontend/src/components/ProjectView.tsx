import React from 'react';
import { loadProjects, saveProject, type GitProject } from '../api/projects';
import { createTask } from '../api/tasks';

const emptyDraft: Omit<GitProject, 'id'> = {
  name: '',
  repositoryUrl: '',
  localPath: '',
  branch: 'main',
};

export default function ProjectView() {
  const [projects, setProjects] = React.useState<GitProject[]>([]);
  const [draft, setDraft] = React.useState<Omit<GitProject, 'id'>>(emptyDraft);
  const [quickTaskDrafts, setQuickTaskDrafts] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const refreshProjects = React.useCallback(async () => {
    try {
      const loaded = await loadProjects();
      setProjects(loaded);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = draft.name.trim();
    const trimmedRepo = draft.repositoryUrl?.trim() ?? '';
    const trimmedLocalPath = draft.localPath?.trim() ?? '';

    if (!trimmedName || (!trimmedRepo && !trimmedLocalPath)) {
      setError('Project name and at least one of repository URL or local path are required.');
      return;
    }

    try {
      setSaving(true);
      const saved = await saveProject({
        ...draft,
        name: trimmedName,
        repositoryUrl: trimmedRepo,
        githubAccount: draft.githubAccount?.trim() ?? '',
        localPath: trimmedLocalPath,
        branch: draft.branch?.trim() || 'main',
      });
      setProjects((current) => {
        const next = current.filter((project) => project.id !== saved.id);
        return [...next, saved];
      });
      setDraft(emptyDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save project.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTaskForProject = async (project: GitProject) => {
    const key = project.id ?? project.name;
    const title = quickTaskDrafts[key]?.trim();
    if (!title) {
      setError(`Please enter a task title for ${project.name}.`);
      return;
    }

    try {
      setError(null);
      await createTask({
        title,
        description: undefined,
        projectId: project.id ?? null,
        isCompleted: false,
        status: 'TODO',
      });
      setQuickTaskDrafts((current) => ({ ...current, [key]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to create a task for ${project.name}.`);
    }
  };

  return (
    <section className="task-editor">
      <h2>Project view</h2>

      <form onSubmit={handleSubmit} className="task-editor-fields" style={{ gridTemplateColumns: '1.4fr 1.5fr 1.2fr 1fr auto' }}>
        <div className="task-editor-field">
          <label htmlFor="project-name">Project name</label>
          <input
            id="project-name"
            className="task-editor-input"
            type="text"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="My project"
          />
        </div>

        <div className="task-editor-field">
          <label htmlFor="project-repository-url">Git repository URL</label>
          <input
            id="project-repository-url"
            className="task-editor-input"
            type="text"
            value={draft.repositoryUrl}
            onChange={(event) => setDraft((current) => ({ ...current, repositoryUrl: event.target.value }))}
            placeholder="https://github.com/user/repo.git"
          />
        </div>

        <div className="task-editor-field">
          <label htmlFor="project-github-account">GitHub account</label>
          <input
            id="project-github-account"
            className="task-editor-input"
            type="text"
            value={draft.githubAccount ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, githubAccount: event.target.value }))}
            placeholder="octocat"
          />
        </div>

        <div className="task-editor-field">
          <label htmlFor="project-local-path">Local folder path</label>
          <input
            id="project-local-path"
            className="task-editor-input"
            type="text"
            value={draft.localPath}
            onChange={(event) => setDraft((current) => ({ ...current, localPath: event.target.value }))}
            placeholder="/workspace/my-project"
          />
        </div>

        <div className="task-editor-field">
          <label htmlFor="project-branch">Branch</label>
          <input
            id="project-branch"
            className="task-editor-input"
            type="text"
            value={draft.branch}
            onChange={(event) => setDraft((current) => ({ ...current, branch: event.target.value }))}
            placeholder="main"
          />
        </div>

        <button type="submit" className="task-editor-submit" disabled={saving}>
          {saving ? 'Saving...' : 'Add project'}
        </button>
      </form>

      {error && <p className="task-error" style={{ marginTop: '12px' }}>{error}</p>}

      {loading ? (
        <p>Loading projects…</p>
      ) : projects.length === 0 ? (
        <p>No projects added yet.</p>
      ) : (
        <div style={{ marginTop: '18px', overflowX: 'auto' }}>
          <table role="table" style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Project</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Repository / Path</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Branch</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Task</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const key = project.id ?? project.name;
                return (
                  <tr key={key} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <strong>{project.name}</strong>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      {project.repositoryUrl ? project.repositoryUrl : project.localPath || '—'}
                      {project.githubAccount ? <div style={{ marginTop: '6px', color: 'var(--muted)' }}>GitHub: {project.githubAccount}</div> : null}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      {project.branch || 'main'}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          aria-label={`Task title for ${project.name}`}
                          type="text"
                          value={quickTaskDrafts[key] ?? ''}
                          onChange={(event) => setQuickTaskDrafts((current) => ({ ...current, [key]: event.target.value }))}
                          placeholder="Task title"
                          style={{ minWidth: '180px', flex: '1 1 180px' }}
                        />
                        <button
                          type="button"
                          className="task-editor-submit"
                          aria-label={`Create task for ${project.name}`}
                          onClick={() => void handleCreateTaskForProject(project)}
                        >
                          Create task
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
