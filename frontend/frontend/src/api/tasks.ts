import { getAuthHeaders } from './auth';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const base = `${apiBaseUrl}/api/tasks`;

export interface Task {
    id?: string;
    title: string;
    description?: string;
    dueDate?: string;
    isCompleted?: boolean;
    status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

export async function listTasks(): Promise<Task[]> {
    const response = await fetch(base, { headers: getAuthHeaders() });
    if(!response.ok) throw new Error(`Failed to load tasks: ${response.status}`);
    
    return response.ok ? response.json() : [] ;
}

export async function createTask(task: Task): Promise<Task> {
    const response = await fetch(base, {
        method: 'POST',
        headers: {'Content-Type':'application/json', ...getAuthHeaders()},
        body: JSON.stringify(task)
    });
    if(!response.ok) throw new Error(`Failed to create task: ${response.status}`);
    
    return response.json();
}

export async function deleteTask ( id: string): Promise<void> {
    const response = await fetch(`${base}/${id}`, {method: `DELETE`, headers: getAuthHeaders()});
    if(!response.ok) throw new Error(`Failed to delete tasks: ${response.status}`);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const currentResponse = await fetch(`${base}/${id}`, { headers: getAuthHeaders() });
    if (!currentResponse.ok) throw new Error(`Failed to fetch task: ${currentResponse.status}`);

    const existingTask = await currentResponse.json() as Task;
    const taskToUpdate: Task = { ...existingTask, ...updates };

    const response = await fetch(`${base}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(taskToUpdate)
    });

    if (!response.ok) throw new Error(`Failed to update task: ${response.status}`);

    return response.json();
}
