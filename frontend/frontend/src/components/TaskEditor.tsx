import { useForm } from "react-hook-form";
import { taskSchema, type TaskFormData } from "../validation/taskSchema";
import { useTaskStore } from "../store/TaskStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { loadProjects, saveProject, type GitProject } from "../api/projects";
import './TaskEditor.css';
import { useEffect, useState } from "react";

/**
 * TaskEditor Component
 *
 * Responsibilities:
 * - Create a new Task
 */

type TaskEditorProps = {
  onTaskCreated?: () => void;
  onClose?: () => void;
  initialProjectId?: string | number | null;
  showCloseButton?: boolean;
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

export default function TaskEditor({ onTaskCreated, onClose, initialProjectId = null, showCloseButton = false }: TaskEditorProps) {
  const addTask   = useTaskStore(state => state.addTask);
  const error     = useTaskStore(state => state.error);
  const fetchTasks = useTaskStore(state => state.fetchTasks);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<GitProject[]>([]);
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(emptyProjectDraft);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);

  useEffect(() => {
    void fetchTasks();
    void loadProjects()
      .then((loadedProjects) => setProjects(loadedProjects))
      .catch(() => setProjects([]));

    if (initialProjectId == null) {
      setProjectId(null);
      return;
    }

    const rawValue = typeof initialProjectId === 'string' ? initialProjectId.trim() : String(initialProjectId).trim();
    const normalizedProjectId = rawValue ? Number(rawValue) : null;
    setProjectId(Number.isFinite(normalizedProjectId) ? normalizedProjectId : null);
  }, [fetchTasks, initialProjectId]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  const onSubmit = async (data: TaskFormData) => {
    const normalizedTask = {
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      dueDate: data.dueDate || undefined,
      projectId: projectId ?? null,
      isCompleted: false,
      status: 'TODO' as const,
    };

    try {
      await addTask(normalizedTask);
      reset();
      await fetchTasks();
      onTaskCreated?.();
      onClose?.();
    } catch {
      // Keep form values when create fails so the user can correct and retry.
    }
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

  return (
    <form className="task-editor" onSubmit={handleSubmit(onSubmit)}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <p className="task-editor-section-label" style={{ margin: 0 }}>Add a new task</p>
        {showCloseButton && onClose && (
          <button type="button" onClick={onClose} aria-label="Close task form" style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer' }}>
            ×
          </button>
        )}
      </div>

      {(error || projectError) && <p className="task-editor-error">{error ?? projectError}</p>}

      <div className="task-editor-fields">

        <div className="task-editor-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            placeholder="Task title..."
            {...register('title')}
          />
          {errors.title && (
            <span className="field-error">{errors.title.message}</span>
          )}
        </div>

        <div className="task-editor-field">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            type="text"
            placeholder="Optional description..."
            {...register('description')}
          />
          {errors.description && (
            <span className="field-error">{errors.description.message}</span>
          )}
        </div>

        <div className="task-editor-field">
          <label htmlFor="dueDate">Due date</label>
          <input
            id="dueDate"
            type="date"
            {...register('dueDate')}
          />
          {errors.dueDate && (
            <span className="field-error">{errors.dueDate.message}</span>
          )}
        </div>

        <div className="task-editor-field task-editor-project-field">
          <label htmlFor="task-project">Project</label>
          <div className="task-editor-project-row">
            <select
              id="task-project"
              className="task-editor-select"
              value={projectId ?? ''}
              onChange={(event) => {
                const nextValue = event.target.value;
                setProjectId(nextValue === '' ? null : Number(nextValue));
              }}
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
              className="task-editor-inline-button"
              onClick={() => setShowProjectCreator((current) => !current)}
            >
              {showProjectCreator ? 'Cancel' : '+ New project'}
            </button>
          </div>
        </div>

        <div className="task-editor-field task-editor-submit">
          <button
            className="btn-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : '+ Add task'}
          </button>
        </div>

      </div>

      {showProjectCreator && (
        <div className="task-editor-project-creator">
          <div className="task-editor-field">
            <label htmlFor="new-project-name">Project name</label>
            <input
              id="new-project-name"
              type="text"
              value={projectDraft.name}
              onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="New project"
            />
          </div>

          <div className="task-editor-field">
            <label htmlFor="new-project-type">Project type</label>
            <select
              id="new-project-type"
              className="task-editor-select"
              value={projectDraft.projectType}
              onChange={(event) => setProjectDraft((current) => ({
                ...current,
                projectType: event.target.value === 'CODING' ? 'CODING' : 'NON_CODING',
              }))}
            >
              <option value="NON_CODING">Non-coding project</option>
              <option value="CODING">Coding project</option>
            </select>
          </div>

          {projectDraft.projectType === 'CODING' ? (
            <>
              <div className="task-editor-field">
                <label htmlFor="new-project-repository-url">Repository URL</label>
                <input
                  id="new-project-repository-url"
                  type="text"
                  value={projectDraft.repositoryUrl}
                  onChange={(event) => setProjectDraft((current) => ({ ...current, repositoryUrl: event.target.value }))}
                  placeholder="https://github.com/user/repo.git"
                />
              </div>

              <div className="task-editor-field">
                <label htmlFor="new-project-local-path">Local path</label>
                <input
                  id="new-project-local-path"
                  type="text"
                  value={projectDraft.localPath}
                  onChange={(event) => setProjectDraft((current) => ({ ...current, localPath: event.target.value }))}
                  placeholder="/workspace/project"
                />
              </div>
            </>
          ) : (
            <>
              <div className="task-editor-field">
                <label htmlFor="new-project-description">Description</label>
                <input
                  id="new-project-description"
                  type="text"
                  value={projectDraft.description}
                  onChange={(event) => setProjectDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Project overview"
                />
              </div>

              <div className="task-editor-field">
                <label htmlFor="new-project-category">Category</label>
                <input
                  id="new-project-category"
                  type="text"
                  value={projectDraft.projectCategory}
                  onChange={(event) => setProjectDraft((current) => ({ ...current, projectCategory: event.target.value }))}
                  placeholder="Theatre"
                />
              </div>

              <div className="task-editor-field">
                <label htmlFor="new-project-end-date">End date</label>
                <input
                  id="new-project-end-date"
                  type="date"
                  value={projectDraft.endDate}
                  onChange={(event) => setProjectDraft((current) => ({ ...current, endDate: event.target.value }))}
                />
              </div>
            </>
          )}

          <div className="task-editor-project-creator-actions">
            <button type="button" className="task-editor-inline-button task-editor-save-project" onClick={handleCreateProject} disabled={isSavingProject}>
              {isSavingProject ? 'Saving...' : 'Create project'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}