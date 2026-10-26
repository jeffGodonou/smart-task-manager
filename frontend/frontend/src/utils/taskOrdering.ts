import type { Task } from '../api/tasks';

export function sortTasksByCompletionAndDueDate(taskList: Task[]): Task[] {
  // Sort a copy so callers' task lists keep their original order.
  return [...taskList].sort((left, right) => {
    const leftCompleted = Boolean(left.isCompleted);
    const rightCompleted = Boolean(right.isCompleted);

    // Keep unfinished tasks first; completed tasks follow.
    if (leftCompleted !== rightCompleted) {
      return Number(leftCompleted) - Number(rightCompleted);
    }

    // Treat missing due dates as last, then use the title for a stable tie-break.
    const leftDate = left.dueDate ?? '9999-12-31';
    const rightDate = right.dueDate ?? '9999-12-31';
    const dateComparison = leftDate.localeCompare(rightDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return (left.title ?? '').localeCompare(right.title ?? '');
  });
}
