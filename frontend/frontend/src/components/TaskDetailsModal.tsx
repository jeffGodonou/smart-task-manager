import React from 'react';
import type { Task } from '../api/tasks';
import { loadProjects, saveProject, type GitProject } from '../api/projects';

type TaskDetailsModalProps = {
  task: Task;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => Promise<void>;
};

type ProjectDraft = {
  name: string;
  projectType: 'NON_CODING' | 'CODING';
  description: string;
  projectCategory: string;
  endDate: string;
  repositoryUrl: string;
  localPath: string;
  branch: string;
};

const emptyProjectDraft: ProjectDraft = {
  name: '',
  projectType: 'NON_CODING',
  description: '',
  projectCategory: '',
  endDate: '',
  repositoryUrl: '',
  localPath: '',
  branch: 'main',
};

export default function TaskDetailsModal({ task, onClose, onSave }: TaskDetailsModalProps) {
  const maxSubtasks = 4;
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description ?? '');
  const [dueDate, setDueDate] = React.useState(task.dueDate ?? '');
  const [notes, setNotes] = React.useState(task.notes ?? '');
  const [status, setStatus] = React.useState<Task['status']>(task.status ?? 'TODO');
  const [isCompleted, setIsCompleted] = React.useState(Boolean(task.isCompleted));
  const [isPriority, setIsPriority] = React.useState(Boolean(task.isPriority));
  const [projectId, setProjectId] = React.useState<number | null>(task.projectId != null ? Number(task.projectId) : null);
  const [projects, setProjects] = React.useState<GitProject[]>([]);
  const [showProjectCreator, setShowProjectCreator] = React.useState(false);
  const [projectDraft, setProjectDraft] = React.useState<ProjectDraft>(emptyProjectDraft);
  const [projectError, setProjectError] = React.useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = React.useState(false);
  const [subtasks, setSubtasks] = React.useState<Task[]>(task.subtasks ?? []);
  const [newSubtask, setNewSubtask] = React.useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [subtaskError, setSubtaskError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void loadProjects()
      .then((loadedProjects) => setProjects(loadedProjects))
      .catch(() => setProjects([]));
  }, []);

  const isSubtask = Boolean(task.parentTaskId || task.isSubtask);
  const completedSubtasks = subtasks.filter(st => Boolean(st.isCompleted)).length;
  const hasSubtasks = subtasks.length > 0;

  const normalizedStatus: Task['status'] = hasSubtasks
    ? (completedSubtasks === subtasks.length ? 'DONE' : completedSubtasks > 0 ? 'IN_PROGRESS' : 'TODO')
    : (isCompleted ? 'DONE' : (status === 'DONE' ? 'TODO' : status));

  const normalizedCompleted = hasSubtasks ? completedSubtasks === subtasks.length : isCompleted;

  const handleAddSubtask = () => {
    if (isSubtask) return;

    const trimmed = newSubtask.trim();
    if (!trimmed) return;

    if (subtasks.length >= maxSubtasks) {
      setSubtaskError('A task can have at most 4 subtasks. Split the task if more are needed.');
      return;
    }

    const newChild: Task = {
      title: trimmed,
      isCompleted: false,
      status: 'TODO',
      parentTaskId: task.id,
      dueDate: newSubtaskDueDate || undefined,
    };
    setSubtasks(prev => [...prev, newChild]);
    setSubtaskError(null);
    setNewSubtask('');
    setNewSubtaskDueDate('');
  };

  const handleCreateProject = async () => {
    const trimmedName = projectDraft.name.trim();
    const trimmedRepo = projectDraft.repositoryUrl.trim();
    const trimmedLocalPath = projectDraft.localPath.trim();

    if (!trimmedName) {
      setProjectError('Project name is required.');
      return;
    }

    if (projectDraft.projectType === 'CODING' && !trimmedRepo && !trimmedLocalPath) {
      setProjectError('Coding projects require a repository URL or a local path.');
      return;
    }

    try {
      setIsSavingProject(true);
      setProjectError(null);

      const createdProject = await saveProject({
        ...projectDraft,
        name: trimmedName,
        description: projectDraft.description.trim() || '',
        projectType: projectDraft.projectType,
        projectCategory: projectDraft.projectCategory.trim() || '',
        endDate: projectDraft.endDate.trim() || '',
        repositoryUrl: trimmedRepo,
        githubAccount: '',
        localPath: trimmedLocalPath,
        branch: projectDraft.branch.trim() || 'main',
      });

      setProjects((currentProjects) => {
        const nextProjects = currentProjects.filter((project) => project.id !== createdProject.id);
        return [...nextProjects, createdProject];
      });

      setProjectId(Number(createdProject.id ?? 0) || null);
      setShowProjectCreator(false);
      setProjectDraft(emptyProjectDraft);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : 'Unable to create project.');
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        projectId: projectId != null ? Number(projectId) : null,
        isCompleted: normalizedCompleted,
        isPriority,
        status: normalizedStatus,
        subtasks: subtasks
          .map(st => ({
            ...st,
            title: st.title.trim(),
            isCompleted: Boolean(st.isCompleted),
            parentTaskId: task.id,
          }))
          .filter(st => st.title.length > 0),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal" onClick={(event) => event.stopPropagation()}>
        <div className="task-modal-header">
          <h3>{isSubtask ? 'Subtask details' : 'Task details'}</h3>
          <button type="button" className="task-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="task-modal-body">
          {isSubtask && (
            <div className="task-modal-completion-hint">
              ℹ️ This is a subtask. It behaves like a lightweight task and cannot contain its own subtasks.
            </div>
          )}

          <div className="task-modal-field">
            <label htmlFor="task-modal-title">Title</label>
            <input
              id="task-modal-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="task-modal-field">
            <label htmlFor="task-modal-description">Description</label>
            <textarea
              id="task-modal-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>

          <div className="task-modal-field">
            <label htmlFor="task-details-project">Project</label>
            <div className="task-project-inline-row">
              <select
                id="task-details-project"
                aria-label="Task project"
                value={projectId ?? ''}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setProjectId(nextValue === '' ? null : Number(nextValue));
                }}
                className="task-project-select"
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={String(project.id ?? project.name)} value={String(project.id ?? '')}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="task-project-inline-button"
                onClick={() => setShowProjectCreator((current) => !current)}
              >
                {showProjectCreator ? 'Cancel' : '+ New project'}
              </button>
            </div>
          </div>

          {showProjectCreator && (
            <div className="task-project-creator-panel">
              <div className="task-modal-field">
                <label htmlFor="task-project-name">Project name</label>
                <input
                  id="task-project-name"
                  type="text"
                  value={projectDraft.name}
                  onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="New project"
                />
              </div>

              <div className="task-modal-field">
                <label htmlFor="task-project-type">Project type</label>
                <select
                  id="task-project-type"
                  value={projectDraft.projectType}
                  onChange={(event) => setProjectDraft((current) => ({ ...current, projectType: event.target.value as 'NON_CODING' | 'CODING' }))}
                >
                  <option value="NON_CODING">Non-coding</option>
                  <option value="CODING">Coding</option>
                </select>
              </div>

              <div className="task-modal-grid">
                <div className="task-modal-field">
                  <label htmlFor="task-project-description">Description</label>
                  <input
                    id="task-project-description"
                    type="text"
                    value={projectDraft.description}
                    onChange={(event) => setProjectDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Optional description"
                  />
                </div>

                <div className="task-modal-field">
                  <label htmlFor="task-project-category">Category</label>
                  <input
                    id="task-project-category"
                    type="text"
                    value={projectDraft.projectCategory}
                    onChange={(event) => setProjectDraft((current) => ({ ...current, projectCategory: event.target.value }))}
                    placeholder="General"
                  />
                </div>
              </div>

              {projectDraft.projectType === 'NON_CODING' && (
                <div className="task-modal-grid">
                  <div className="task-modal-field">
                    <label htmlFor="task-project-end-date">End date</label>
                    <input
                      id="task-project-end-date"
                      type="date"
                      value={projectDraft.endDate}
                      onChange={(event) => setProjectDraft((current) => ({ ...current, endDate: event.target.value }))}
                    />
                  </div>
                </div>
              )}

              {projectDraft.projectType === 'CODING' && (
                <div className="task-modal-grid">
                  <div className="task-modal-field">
                    <label htmlFor="task-project-repo">Repository URL</label>
                    <input
                      id="task-project-repo"
                      type="url"
                      value={projectDraft.repositoryUrl}
                      onChange={(event) => setProjectDraft((current) => ({ ...current, repositoryUrl: event.target.value }))}
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div className="task-modal-field">
                    <label htmlFor="task-project-path">Local path</label>
                    <input
                      id="task-project-path"
                      type="text"
                      value={projectDraft.localPath}
                      onChange={(event) => setProjectDraft((current) => ({ ...current, localPath: event.target.value }))}
                      placeholder="./src"
                    />
                  </div>
                </div>
              )}

              {projectError && <p className="task-modal-subtask-error">{projectError}</p>}

              <div className="task-project-creator-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowProjectCreator(false)}>
                  Close
                </button>
                <button type="button" className="btn-primary" onClick={handleCreateProject} disabled={isSavingProject}>
                  {isSavingProject ? 'Saving...' : 'Create project'}
                </button>
              </div>
            </div>
          )}

          <div className="task-modal-grid">
            <div className="task-modal-field">
              <label htmlFor="task-modal-due-date">Due date</label>
              <input
                id="task-modal-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>

            <div className="task-modal-field">
              <label htmlFor="task-modal-status">Status</label>
              <select
                id="task-modal-status"
                value={normalizedStatus}
                onChange={(event) => {
                  const next = event.target.value as Task['status'];
                  setStatus(next);
                  setIsCompleted(next === 'DONE');
                }}
                disabled={hasSubtasks || isCompleted}
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <label className="task-modal-checkline">
            <input
              type="checkbox"
              checked={isPriority}
              onChange={(event) => setIsPriority(event.target.checked)}
            />
            Mark as priority task
          </label>

          <label className="task-modal-checkline">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(event) => {
                if (hasSubtasks) {
                  return;
                }
                const checked = event.target.checked;
                setIsCompleted(checked);
                if (checked) {
                  setStatus('DONE');
                }
              }}
              disabled={hasSubtasks}
              title={hasSubtasks ? 'Complete all subtasks first to mark the parent task as done' : ''}
            />
            Mark as completed {hasSubtasks ? '(derived from subtasks)' : ''}
          </label>

          {hasSubtasks && (
            <div className="task-modal-completion-hint">
              ℹ️ Complete all subtasks first to mark this task as done.
            </div>
          )}

          <div className="task-modal-field">
            <label htmlFor="task-modal-notes">Completion notes</label>
            <textarea
              id="task-modal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Add notes about progress, blockers, or completion context..."
            />
          </div>

          {!isSubtask && (
            <div className="task-modal-field">
              <label>Subtasks</label>
              <div className="task-modal-subtask-new">
                <input
                  type="text"
                  value={newSubtask}
                  placeholder="Subtask title"
                  onChange={(event) => setNewSubtask(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                />
                <input
                  type="date"
                  value={newSubtaskDueDate}
                  onChange={(event) => setNewSubtaskDueDate(event.target.value)}
                  className="task-modal-subtask-date-input"
                  title="Subtask due date (optional)"
                />
                <button type="button" className="btn-secondary" onClick={handleAddSubtask}>Add</button>
              </div>
              {subtaskError && <p className="task-modal-subtask-error">{subtaskError}</p>}
              <div className="task-modal-subtasks">
                {subtasks.length === 0 && <p className="task-modal-subtasks-empty">No subtasks yet.</p>}
                {subtasks.map((subtask, index) => (
                  <div key={`${subtask.title}-${index}`} className="task-modal-subtask-item">
                    <label className="task-modal-subtask-label">
                      <input
                        type="checkbox"
                        checked={Boolean(subtask.isCompleted)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSubtasks(prev => prev.map((st, i) => i === index ? { ...st, isCompleted: checked } : st));
                        }}
                      />
                      <span className={subtask.isCompleted ? 'task-modal-subtask-done' : ''}>{subtask.title}</span>
                    </label>
                    <div className="task-modal-subtask-meta">
                      <input
                        type="date"
                        value={subtask.dueDate ?? ''}
                        onChange={(event) => {
                          const val = event.target.value;
                          setSubtasks(prev => prev.map((st, i) => i === index ? { ...st, dueDate: val || undefined } : st));
                        }}
                        className="task-modal-subtask-date-input"
                        title="Subtask due date"
                      />
                      <button
                        type="button"
                        className="task-modal-subtask-remove"
                        onClick={() => setSubtasks(prev => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="task-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
