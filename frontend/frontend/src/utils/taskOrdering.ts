import type { Task } from '../api/tasks';

export function sortTasksByCompletionAndDueDate(taskList: Task[]): Task[] {
  return [...taskList].sort((left, right) => {
    const leftCompleted = Boolean(left.isCompleted);
    const rightCompleted = Boolean(right.isCompleted);

    if (leftCompleted !== rightCompleted) {
      return Number(leftCompleted) - Number(rightCompleted);
    }

    const leftDate = left.dueDate ?? '9999-12-31';
    const rightDate = right.dueDate ?? '9999-12-31';
    const dateComparison = leftDate.localeCompare(rightDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return (left.title ?? '').localeCompare(right.title ?? '');
  });
}
