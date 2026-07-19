type UrgencyTask = {
  dueDate?: string;
  isCompleted?: boolean;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
};

export function isUrgentDueDate(dueDate?: string, thresholdDays = 2): boolean {
  if (!dueDate) return false;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadline = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(deadline.getTime())) {
    return false;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilDue = Math.floor((deadline.getTime() - startOfToday.getTime()) / msPerDay);
  return daysUntilDue <= thresholdDays;
}

export function isTaskUrgent(task: UrgencyTask, thresholdDays = 2): boolean {
  const isDone = task.status === 'DONE' || Boolean(task.isCompleted);
  return !isDone && isUrgentDueDate(task.dueDate, thresholdDays);
}
