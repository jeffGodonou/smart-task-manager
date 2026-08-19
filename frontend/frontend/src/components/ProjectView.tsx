import React from 'react';
import { loadProjects, saveProject, type GitProject } from '../api/projects';

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

      <div className="project-view-list" style={{ marginTop: '18px', display: 'grid', gap: '12px' }}>
        {loading ? (
          <p>Loading projects…</p>
        ) : projects.length === 0 ? (
          <p>No projects added yet.</p>
        ) : (
          projects.map((project) => (
            <div key={project.id ?? project.name} className="project-card" style={{
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <strong>{project.name}</strong>
              <span>{project.repositoryUrl ? `Repo: ${project.repositoryUrl}` : 'Local project only'}</span>
              {project.localPath && <span>Path: {project.localPath}</span>}
              {project.branch && <span>Branch: {project.branch}</span>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
