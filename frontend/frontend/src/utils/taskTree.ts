import type { Task } from '../api/tasks';

export function flattenTaskTree(taskList: Task[]): Task[] {
  const flattened: Task[] = [];

  const walk = (tasks: Task[]) => {
    for (const task of tasks) {
      flattened.push({
        ...task,
        isSubtask: Boolean(task.parentTaskId || task.isSubtask),
      });

      if (task.subtasks && task.subtasks.length > 0) {
        walk(task.subtasks.map(subtask => ({
          ...subtask,
          parentTaskId: task.id,
          isSubtask: true,
        })));
      }
    }
  };

  walk(taskList);
  return flattened;
}

export function buildProjectProgress(taskList: Task[]): Record<string, { total: number; completed: number }> {
  return taskList.reduce<Record<string, { total: number; completed: number }>>((accumulator, task) => {
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
}
