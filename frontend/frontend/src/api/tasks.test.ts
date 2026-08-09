import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./auth', () => ({
    getAuthHeaders: () => ({ Authorization: 'Bearer test-token' })
}));

import { updateTask, type Task } from './tasks';

describe('tasks API updateTask', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('fetches current task then PUTs a merged payload with subtask updates', async () => {
        const existingTask: Task = {
            id: '42',
            title: 'Parent task',
            description: 'Existing description',
            status: 'IN_PROGRESS',
            isCompleted: false,
            subtasks: [
                { title: 'Child 1', isCompleted: true },
                { title: 'Child 2', isCompleted: false }
            ]
        };

        const updates: Partial<Task> = {
            subtasks: [
                { title: 'Child 1', isCompleted: true },
                { title: 'Child 2', isCompleted: true }
            ]
        };

        const updatedTask: Task = {
            ...existingTask,
            ...updates,
            status: 'DONE',
            isCompleted: true
        };

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response(JSON.stringify(existingTask), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(updatedTask), { status: 200 }));

        vi.stubGlobal('fetch', fetchMock);

        const result = await updateTask('42', updates);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            expect.stringMatching(/\/api\/tasks\/42$/),
            { headers: { Authorization: 'Bearer test-token' } }
        );

        const secondCallArgs = fetchMock.mock.calls[1];
        expect(secondCallArgs[0]).toMatch(/\/api\/tasks\/42$/);
        expect(secondCallArgs[1]).toMatchObject({
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer test-token'
            }
        });

        const putBody = JSON.parse((secondCallArgs[1] as RequestInit).body as string) as Task;
        expect(putBody).toMatchObject({
            id: '42',
            title: 'Parent task',
            description: 'Existing description',
            subtasks: [
                { title: 'Child 1', isCompleted: true },
                { title: 'Child 2', isCompleted: true }
            ]
        });

        expect(result.status).toBe('DONE');
        expect(result.isCompleted).toBe(true);
    });

    it('throws when loading current task fails before update', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(new Response('', { status: 500 }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(updateTask('42', { title: 'Updated title' })).rejects.toThrow(
            'Failed to fetch task: 500'
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
