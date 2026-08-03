import React from 'react';
import { listTasks } from '../api/tasks';
import type { Task } from '../api/tasks';
import './TaskStats.css';

/**
 * TaskStats Component
 *
 * Responsibilities:
 * - Display task statistics: total, completed, by status
 * - Count overdue tasks
 * - Auto-refresh when tasks change
 */

type TaskStatsProps = {
  refreshKey?: number;
};

export default function TaskStats({ refreshKey = 0 }: TaskStatsProps) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listTasks();
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, [refreshKey]);

  // Calculate stats
  const total = tasks.length;
  const completed = tasks.filter(t => t.isCompleted).length;
  const remaining = total - completed;
  const byStatus = {
    todo: tasks.filter(t => (t.status || 'TODO') === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length,
  };

  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && !t.isCompleted).length;

  const allSubtasks = tasks.flatMap(t => t.subtasks ?? []);
  const totalSubtasks = allSubtasks.length;
  const completedSubtasks = allSubtasks.filter(st => st.isCompleted).length;
  const tasksWithSubtasks = tasks.filter(t => (t.subtasks?.length ?? 0) > 0).length;

  const trendBuckets = new Map<string, { total: number; completed: number }>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const bucket = trendBuckets.get(task.dueDate) ?? { total: 0, completed: 0 };
    bucket.total += 1;
    if (task.isCompleted) bucket.completed += 1;
    trendBuckets.set(task.dueDate, bucket);
  }

  const trendDates = Array.from(trendBuckets.keys()).sort((a, b) => a.localeCompare(b));
  const hasTrendData = trendDates.length > 0;

  const trendRows = trendDates.map(date => {
    const bucket = trendBuckets.get(date)!;
    return { date, total: bucket.total, completed: bucket.completed };
  });

  let runningTotal = 0;
  let runningCompleted = 0;
  const cumulativeRows = trendRows.map(row => {
    runningTotal += row.total;
    runningCompleted += row.completed;
    return {
      ...row,
      cumulativeTotal: runningTotal,
      cumulativeCompleted: runningCompleted,
    };
  });

  const maxY = Math.max(1, ...cumulativeRows.map(row => row.cumulativeTotal));
  const chartWidth = 560;
  const chartHeight = 220;
  const padding = { top: 16, right: 16, bottom: 30, left: 38 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (cumulativeRows.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (cumulativeRows.length - 1)) * innerWidth;
  };

  const getY = (value: number) => {
    return padding.top + innerHeight - (value / maxY) * innerHeight;
  };

  const totalPoints = cumulativeRows
    .map((row, index) => `${getX(index)},${getY(row.cumulativeTotal)}`)
    .join(' ');

  const completedPoints = cumulativeRows
    .map((row, index) => `${getX(index)},${getY(row.cumulativeCompleted)}`)
    .join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(scale => Math.round(maxY * scale));

  const formatShortDate = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="task-stats">
      {loading && <div className="stats-loading">Loading...</div>}
      {!loading && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total</div>
              <div className="stat-value">{total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Completed</div>
              <div className="stat-value">{completed}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Remaining</div>
              <div className="stat-value">{remaining}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">To Do</div>
              <div className="stat-value">{byStatus.todo}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">In Progress</div>
              <div className="stat-value">{byStatus.inProgress}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Done</div>
              <div className="stat-value">{byStatus.done}</div>
            </div>
            {overdue > 0 && (
              <div className="stat-card stat-warning">
                <div className="stat-label">Overdue</div>
                <div className="stat-value">{overdue}</div>
              </div>
            )}
            {totalSubtasks > 0 && (
              <>
                <div className="stat-card">
                  <div className="stat-label">Subtasks done</div>
                  <div className="stat-value">{completedSubtasks}/{totalSubtasks}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Tasks with subtasks</div>
                  <div className="stat-value">{tasksWithSubtasks}</div>
                </div>
              </>
            )}
          </div>

          <section className="stats-trend" aria-label="Task trend over time">
            <div className="trend-header">
              <h3>Trend Through Time</h3>
              <p>Cumulative tasks by due date</p>
            </div>
            {!hasTrendData && (
              <div className="trend-empty">
                Add due dates to tasks to visualize how your workload evolves through time.
              </div>
            )}
            {hasTrendData && (
              <>
                <div className="trend-legend">
                  <span><i className="legend-swatch total" />Total</span>
                  <span><i className="legend-swatch completed" />Completed</span>
                </div>
                <div className="trend-chart-wrap">
                  <svg className="trend-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Line chart of cumulative tasks and completed tasks by due date">
                    {yTicks.map((tick, index) => {
                      const y = getY(tick);
                      return (
                        <g key={`${tick}-${index}`}>
                          <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} className="trend-grid-line" />
                          <text x={padding.left - 8} y={y + 4} className="trend-y-label">{tick}</text>
                        </g>
                      );
                    })}

                    <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} className="trend-axis" />
                    <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} className="trend-axis" />

                    <polyline points={totalPoints} className="trend-line total" />
                    <polyline points={completedPoints} className="trend-line completed" />

                    {cumulativeRows.map((row, index) => {
                      const x = getX(index);
                      return (
                        <g key={row.date}>
                          <circle cx={x} cy={getY(row.cumulativeTotal)} r={3.5} className="trend-point total" />
                          <circle cx={x} cy={getY(row.cumulativeCompleted)} r={3.5} className="trend-point completed" />
                        </g>
                      );
                    })}

                    {cumulativeRows.map((row, index) => {
                      if (index !== 0 && index !== cumulativeRows.length - 1) return null;
                      const x = getX(index);
                      return (
                        <text key={`label-${row.date}`} x={x} y={chartHeight - 8} className="trend-x-label" textAnchor={index === 0 ? 'start' : 'end'}>
                          {formatShortDate(row.date)}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}