const base = '/api/tasks';

export interface Task {
    id?: string;
    title: string;
    description?: string;
    dueDate?: string;
    isCompleted?: boolean;
}

export async function listTasks(): Promise<any[]> {
    const response = await fetch(base);

    return response.ok ? response.json() : [] ;
}

export async function createTask(task: Task): Promise<boolean | any> {
    const response = await fetch(base, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(task)
    });

    return response.json;
}

export async function deleteTask ( id: string) {
    await fetch(`${base}/${id}`, {method: `DELETE`});
}

export async function updateTask( id: string, attribute: any): Promise<boolean | any> {
    const response = await fetch(`${base}/${id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(attribute)
    })

    return response.json();
}
