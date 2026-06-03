import { create } from 'zustand';
import { listTasks, createTask, deleteTask, updateTask, type Task } from '../api/tasks';

type TaskStore = {
    tasks:Task[];
    isLoading: boolean;
    error: string | null;

    fetchTasks: () => Promise<void>;
    addTask: (task: Task) => Promise<void>;
    removeTask: (id: string) => Promise<void>;
    toggleComplete: (id: string, current: boolean) => Promise<void>;
};

export const useTaskStore = create<TaskStore> ((set) => ({
    tasks: [],
    isLoading: false,
    error: null,

    fetchTasks: async () => {
        set({ isLoading: true, error: null });
        try {
            const tasks = await listTasks();
            set({tasks});
        } catch (error) {
            set({ error: 'Failed to load tasks'});
        } finally {
            set ({ isLoading: false});
        }
    },

    addTask: async (task) => {
        try{
            const created = await createTask(task);
             set(state => ({ tasks: [...state.tasks, created] }));
        } catch (error) {
            set({ error: 'Failed to create task'});
        }
    },

    removeTask: async (id) => {
        try{
            await deleteTask(id);
            set(state => ({ tasks: state.tasks.filter(t => t.id !== id)}));
        } catch {
            set({ error: 'Failed to delete task' });
        }
    },

    toggleComplete: async (id, current) => {
        try {
            const updated = await updateTask(id, { isCompleted: !current });
            set (state => ({
                tasks: state.tasks.map(t => t.id === id ? updated: t),
            }));
        } catch {
            set({ error: 'Failed to update task' });
        }
    }
}))