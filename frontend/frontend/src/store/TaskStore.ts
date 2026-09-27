import { create } from 'zustand';
import { listTasks, createTask, deleteTask, updateTask, type Task } from '../api/tasks';
import { buildProjectProgress, type ProjectProgress } from '../utils/taskTree';

type TaskStore = {
    tasks: Task[];
    projectProgress: ProjectProgress;
    isLoading: boolean;
    error: string | null;
    hasLoaded: boolean;

    fetchTasks: (force?: boolean) => Promise<void>;
    addTask: (task: Task) => Promise<void>;
    removeTask: (id: string) => Promise<void>;
    toggleComplete: (id: string, current: boolean) => Promise<void>;
    upsertTask: (updatedTask: Task) => void;
};

export const useTaskStore = create<TaskStore> ((set, get) => ({
    tasks: [],
    projectProgress: {},
    isLoading: false,
    error: null,
    hasLoaded: false,

    fetchTasks: async (force = false) => {
        if (!force && get().hasLoaded) {
            return;
        }

        set({ isLoading: true, error: null });
        try {
            const tasks = await listTasks();
            set({ tasks, projectProgress: buildProjectProgress(tasks), hasLoaded: true });
        } catch (error) {
            set({ error: 'Failed to load tasks' });
        } finally {
            set({ isLoading: false });
        }
    },

    addTask: async (task) => {
        set({ error: null });
        try {
            const created = await createTask(task);
            set(state => ({
                tasks: [...state.tasks, created],
                projectProgress: buildProjectProgress([...state.tasks, created]),
                hasLoaded: true,
            }));
        } catch (error) {
            set({ error: 'Failed to create task' });
            throw error;
        }
    },

    removeTask: async (id) => {
        try {
            await deleteTask(id);
            set(state => {
                const nextTasks = state.tasks.filter(t => t.id !== id);
                return {
                    tasks: nextTasks,
                    projectProgress: buildProjectProgress(nextTasks),
                };
            });
        } catch {
            set({ error: 'Failed to delete task' });
        }
    },

    toggleComplete: async (id, current) => {
        try {
            const updated = await updateTask(id, { isCompleted: !current });
            set(state => {
                const nextTasks = state.tasks.map(t => t.id === id ? updated : t);
                return {
                    tasks: nextTasks,
                    projectProgress: buildProjectProgress(nextTasks),
                };
            });
        } catch {
            set({ error: 'Failed to update task' });
        }
    },

    upsertTask: (updatedTask) => {
        const replaceInTree = (taskList: Task[]): Task[] => taskList.map(task => {
            if (task.id === updatedTask.id) {
                return { ...task, ...updatedTask };
            }

            if (task.subtasks && task.subtasks.length > 0) {
                return {
                    ...task,
                    subtasks: replaceInTree(task.subtasks),
                };
            }

            return task;
        });

        set(state => {
            const nextTasks = replaceInTree(state.tasks);
            return {
                tasks: nextTasks,
                projectProgress: buildProjectProgress(nextTasks),
            };
        });
    },
}))