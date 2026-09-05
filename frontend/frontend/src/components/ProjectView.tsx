import React from 'react';
import { loadProjects, saveProject, type GitProject } from '../api/projects';
import TaskEditor from './TaskEditor';

const emptyDraft: Omit<GitProject, 'id'> = {
  name: '',
  repositoryUrl: '',
  localPath: '',
  branch: 'main',
};

export default function ProjectView() {
  const [projects, setProjects] = React.useState<GitProject[]>([]);
  const [draft, setDraft] = React.useState<Omit<GitProject, 'id'>>(emptyDraft);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [taskEditorProject, setTaskEditorProject] = React.useState<GitProject | null>(null);

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

  const handleCreateTaskForProject = (project: GitProject) => {
    setTaskEditorProject(project);
    setError(null);
  };

  const closeTaskEditor = () => {
    setTaskEditorProject(null);
  };

  return (
    <section className="task-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Project view</h2>
        <button type="button" className="task-editor-submit" onClick={() => handleCreateTaskForProject({ name: 'General task', branch: 'main' })}>
          Create task
        </button>
      </div>

      <form onSubmit={handleSubmit} className="task-editor-fields" style={{ gridTemplateColumns: '1.3fr 1.5fr 1.1fr 1.3fr 0.8fr auto' }}>
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

      {taskEditorProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ width: 'min(700px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <TaskEditor
              initialProjectId={taskEditorProject.id ?? null}
              onTaskCreated={() => {
                setTaskEditorProject(null);
              }}
              onClose={closeTaskEditor}
            />
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading projects…</p>
      ) : projects.length === 0 ? (
        <p>No projects added yet.</p>
      ) : (
        <div style={{ marginTop: '18px', overflowX: 'auto' }}>
          <table role="table" style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: '150px' }}>Project</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: '220px' }}>Repository / Path</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: '120px' }}>GitHub</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: '90px' }}>Branch</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: '260px' }}>Task</th>
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
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      {project.githubAccount || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      {project.branch || 'main'}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <button
                        type="button"
                        className="task-editor-submit"
                        aria-label={`Create task for ${project.name}`}
                        onClick={() => handleCreateTaskForProject(project)}
                      >
                        Create task
                      </button>
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
