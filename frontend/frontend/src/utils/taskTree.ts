import type { Task } from '../api/tasks';

export function flattenTaskTree(taskList: Task[]): Task[] {
  const flattened: Task[] = [];

  const walk = (tasks: Task[]) => {
    // Visit each task before its descendants to preserve parent-first order.
    for (const task of tasks) {
      flattened.push({
        ...task,
        isSubtask: Boolean(task.parentTaskId || task.isSubtask),
      });

      if (task.subtasks && task.subtasks.length > 0) {
        // Copy descendants with their parent link instead of mutating the source tree.
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

export type ProjectProgress = Record<string, { total: number; completed: number }>;

export function buildProjectProgress(taskList: Task[]): ProjectProgress {
  return taskList.reduce<ProjectProgress>((accumulator, task) => {
    // Tasks without a project are not part of any project's progress.
    if (!task.projectId) {
      return accumulator;
    }

    const key = String(task.projectId);
    const current = accumulator[key] ?? { total: 0, completed: 0 };

    current.total += 1;
    // Either field can indicate that the task is complete.
    if (task.isCompleted || task.status === 'DONE') {
      current.completed += 1;
    }

    accumulator[key] = current;
    return accumulator;
  }, {});
}
