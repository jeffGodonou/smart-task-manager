import React from 'react';
import { loadProjects, saveProject, type GitProject } from '../api/projects';
import { listTasks } from '../api/tasks';
import './ProjectView.css';
import TaskEditor from './TaskEditor';
import { sortTasksByCompletionAndDueDate } from '../utils/taskOrdering';

const emptyDraft: Omit<GitProject, 'id'> = {
  name: '',
  description: '',
  projectType: 'NON_CODING',
  projectCategory: '',
  endDate: '',
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
  const [taskProgress, setTaskProgress] = React.useState<Record<string, { total: number; completed: number }>>({});
  const [editingProjectId, setEditingProjectId] = React.useState<string | number | null>(null);

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
      const tasks = sortTasksByCompletionAndDueDate(await listTasks());
      const progress = tasks.reduce<Record<string, { total: number; completed: number }>>((accumulator, task) => {
        if (!task.projectId) {
          return accumulator;
        }

        const key = String(task.projectId);
        const current = accumulator[key] ?? { total: 0, completed: 0 };

        current.total += 1;
        if (task.isCompleted || task.status === 'DONE') {
          current.completed += 1;
        }

        accumulator[key] = current;
        return accumulator;
      }, {});

      setTaskProgress(progress);
    } catch {
      setTaskProgress({});
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
    const isCodingProject = draft.projectType === 'CODING';

    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }

    if (isCodingProject && !trimmedRepo && !trimmedLocalPath) {
      setError('Coding projects require a repository URL or a local path.');
      return;
    }

    try {
      setSaving(true);
      const saved = await saveProject({
        ...draft,
        id: editingProjectId ?? undefined,
        name: trimmedName,
        description: draft.description?.trim() ?? '',
        projectType: draft.projectType ?? 'NON_CODING',
        projectCategory: draft.projectCategory?.trim() ?? '',
        endDate: draft.endDate?.trim() ?? '',
        repositoryUrl: trimmedRepo,
        githubAccount: draft.githubAccount?.trim() ?? '',
        localPath: trimmedLocalPath,
        branch: draft.branch?.trim() || 'main',
      });
      setProjects((current) => {
        const next = current.filter((project) => project.id !== saved.id);
        return [...next, saved];
      });
      setEditingProjectId(null);
      setDraft(emptyDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save project.');
    } finally {
      setSaving(false);
    }
  };

  /*const beginEditProject = (project: GitProject) => {
    setEditingProjectId(project.id ?? null);
    setDraft({
      name: project.name ?? '',
      description: project.description ?? '',
      projectType: project.projectType ?? 'NON_CODING',
      projectCategory: project.projectCategory ?? '',
      endDate: project.endDate ?? '',
      repositoryUrl: project.repositoryUrl ?? '',
      githubAccount: project.githubAccount ?? '',
      localPath: project.localPath ?? '',
      branch: project.branch ?? 'main',
    });
    setError(null);
  };*/

  const cancelEdit = () => {
    setEditingProjectId(null);
    setDraft(emptyDraft);
    setError(null);
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
  const activeProjectType = draft.projectType ?? 'NON_CODING';
  const showCodingFields = activeProjectType === 'CODING';
  const visibleProjects = projects.filter((project) => (project.projectType ?? 'NON_CODING') === activeProjectType);

  return (
    <section className="project-view">
      <div className="project-view-header">
        <h2 className="project-view-title">Project view</h2>
        <button
          type="button"
          className="project-view-header-button"
          aria-label="Create task"
          onClick={() => handleCreateTaskForProject()}
        >
          <span aria-hidden="true">＋</span>
          <span>Task</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="task-editor-fields project-view-form" style={{ gridTemplateColumns: projectGridTemplate }}>
        {editingProjectId !== null && (
          <div className="task-editor-field" style={{ gridColumn: '1 / -1', marginBottom: '8px' }}>
            <button type="button" className="task-editor-submit" onClick={cancelEdit}>Cancel edit</button>
          </div>
        )}
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
          <label htmlFor="project-type">Project type</label>
          <select
            id="project-type"
            className="task-editor-input"
            value={draft.projectType ?? 'NON_CODING'}
            onChange={(event) => setDraft((current) => ({
              ...current,
              projectType: event.target.value === 'CODING' ? 'CODING' : 'NON_CODING',
            }))}
          >
            <option value="CODING">Coding project</option>
            <option value="NON_CODING">Non-coding project</option>
          </select>
        </div>

        {showCodingFields ? (
          <>
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
          </>
        ) : (
          <>
            <div className="task-editor-field">
              <label htmlFor="project-description">Description</label>
              <input
                id="project-description"
                className="task-editor-input"
                type="text"
                value={draft.description ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Project overview and goals"
              />
            </div>

            <div className="task-editor-field">
              <label htmlFor="project-category">Project category</label>
              <input
                id="project-category"
                className="task-editor-input"
                type="text"
                value={draft.projectCategory ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, projectCategory: event.target.value }))}
                placeholder="Theatre"
              />
            </div>

            <div className="task-editor-field">
              <label htmlFor="project-end-date">End date</label>
              <input
                id="project-end-date"
                className="task-editor-input"
                type="date"
                value={draft.endDate ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>
          </>
        )}

        <button
          type="submit"
          className="task-editor-submit"
          disabled={saving}
          style={{ whiteSpace: 'nowrap' }}
        >
          {saving ? 'Saving...' : editingProjectId !== null ? 'Save changes' : 'Add project'}
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
      ) : visibleProjects.length === 0 ? (
        <p>No {activeProjectType === 'CODING' ? 'coding' : 'non-coding'} projects added yet.</p>
      ) : (
        <div className="project-view-table-wrapper">
          <table role="table" className="project-view-table">
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '26%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Project</th>
                <th>{activeProjectType === 'NON_CODING' ? 'Details' : 'Repository / Path'}</th>
                <th>{activeProjectType === 'NON_CODING' ? 'Category / Timeline' : 'GitHub'}</th>
                <th>{activeProjectType === 'NON_CODING' ? 'End date' : 'Branch'}</th>
                <th className="project-view-status-column">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map((project) => {
                const key = project.id ?? project.name;
                const isCodingProject = project.projectType === 'CODING';
                const projectProgress = taskProgress[String(project.id ?? '')] ?? { total: 0, completed: 0 };
                const totalTasks = projectProgress.total;
                const completedTasks = projectProgress.completed;
                const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
                const statusText = totalTasks === 0 ? 'No tasks' : percentage === 100 ? 'Complete' : percentage > 0 ? 'In progress' : 'Not started';
                const statusTone = totalTasks === 0 ? 'neutral' : percentage === 100 ? 'complete' : percentage > 0 ? 'in-progress' : 'not-started';
                const badgeClassName = isCodingProject ? 'project-view-type-badge coding' : 'project-view-type-badge non-coding';

                return (
                  <tr key={key}>
                    <td>
                      <strong>{project.name}</strong>
                      <div className={badgeClassName}>
                        {isCodingProject ? 'Coding' : 'Non-coding'}
                      </div>
                    </td>
                    <td>
                      {isCodingProject
                        ? (project.repositoryUrl ? project.repositoryUrl : project.localPath || '—')
                        : (project.description || '—')}
                    </td>
                    <td>
                      {isCodingProject
                        ? (project.githubAccount || '—')
                        : (project.projectCategory || 'General')}
                    </td>
                    <td>
                      {isCodingProject
                        ? (project.branch || 'main')
                        : (project.endDate || '—')}
                    </td>
                    <td className="project-view-status-cell">
                      <div className="project-view-status">
                        <div className="project-view-status-header">
                          <span className="project-view-status-value">{percentage}%</span>
                          <span className={`project-view-status-pill ${statusTone}`}>{statusText}</span>
                        </div>
                        <div className="project-view-progress-track" aria-label={`${project.name} progress`}>
                          <span className="project-view-progress-fill" style={{ width: `${percentage}%` }} />
                        </div>
                        <small>{completedTasks}/{totalTasks} done</small>
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