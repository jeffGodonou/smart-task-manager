import React from 'react';
import { loadProjects, saveProject, type GitProject } from '../api/projects';
import { listTasks } from '../api/tasks';
import './ProjectView.css';
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
  const [showTaskEditor, setShowTaskEditor] = React.useState(false);
  const [taskEditorProject, setTaskEditorProject] = React.useState<GitProject | null>(null);
  const [taskCounts, setTaskCounts] = React.useState<Record<string, number>>({});

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

  const refreshTaskCounts = React.useCallback(async () => {
    try {
      const tasks = await listTasks();
      const counts = tasks.reduce<Record<string, number>>((accumulator, task) => {
        if (!task.projectId) {
          return accumulator;
        }

        accumulator[task.projectId] = (accumulator[task.projectId] ?? 0) + 1;
        return accumulator;
      }, {});

      setTaskCounts(counts);
    } catch {
      setTaskCounts({});
    }
  }, []);

  React.useEffect(() => {
    void refreshProjects();
    void refreshTaskCounts();
  }, [refreshProjects, refreshTaskCounts]);

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

  const handleCreateTaskForProject = (project?: GitProject) => {
    setTaskEditorProject(project ?? null);
    setShowTaskEditor(true);
    setError(null);
  };

  const closeTaskEditor = () => {
    setShowTaskEditor(false);
    setTaskEditorProject(null);
  };

  // Using fr units (not %) so the trailing `auto` submit-button column can
  // size itself to its content first; the fr tracks then split only the
  // remaining space in the same 18:28:12:12:30 ratio. With % tracks that sum
  // to 100 plus an extra auto column, the row overflows its container and
  // the browser shrinks the button, causing "Add project" to wrap.
  const projectGridTemplate = '18fr 28fr 12fr 12fr 30fr auto';

  return (
    <section className="project-view">
      <div className="project-view-header">
        <h2 className="project-view-title">Project view</h2>
      </div>

      <form onSubmit={handleSubmit} className="task-editor-fields project-view-form" style={{ gridTemplateColumns: projectGridTemplate }}>
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

        <button
          type="submit"
          className="task-editor-submit"
          disabled={saving}
          style={{ whiteSpace: 'nowrap' }}
        >
          {saving ? 'Saving...' : 'Add project'}
        </button>
      </form>

      {error && <p className="task-error" style={{ marginTop: '12px' }}>{error}</p>}

      {showTaskEditor && (
        <div className="project-view-modal-backdrop">
          <div className="project-view-modal-card">
            <TaskEditor
              initialProjectId={taskEditorProject?.id ?? null}
              showCloseButton={true}
              onTaskCreated={() => {
                void refreshTaskCounts();
                setShowTaskEditor(false);
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
        <div className="project-view-table-wrapper">
          <table role="table" className="project-view-table">
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '30%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Project</th>
                <th>Repository / Path</th>
                <th>GitHub</th>
                <th>Branch</th>
                <th>Task</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const key = project.id ?? project.name;
                return (
                  <tr key={key}>
                    <td>
                      <strong>{project.name}</strong>
                    </td>
                    <td>
                      {project.repositoryUrl ? project.repositoryUrl : project.localPath || '—'}
                    </td>
                    <td>
                      {project.githubAccount || '—'}
                    </td>
                    <td>
                      {project.branch || 'main'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ minWidth: '3ch', fontWeight: 600, color: '#2d3748' }}>
                          {`${taskCounts[project.id ?? ''] ?? 0} task${(taskCounts[project.id ?? ''] ?? 0) === 1 ? '' : 's'}`}
                        </span>
                        <button
                          type="button"
                          className="task-editor-submit"
                          aria-label={`Create task for ${project.name}`}
                          onClick={() => handleCreateTaskForProject(project)}
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