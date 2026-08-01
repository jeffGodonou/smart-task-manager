/**
 * CalendarView Component
 *
 * Renders a month/week/day calendar view of tasks using react-big-calendar.
 * Provides a modal UI for creating and editing task due dates.
 */
import React from 'react';
import { Calendar, dateFnsLocalizer, type Event as RbcEvent } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';

import { createTask, listTasks, updateTask } from '../api/tasks';
import type { Task } from '../api/tasks';
import { isTaskUrgent } from '../utils/taskUrgency';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface CalendarEvent extends RbcEvent {
  id: string | undefined;
  task: Task;
  isSubtask?: boolean;
}

type CalendarViewProps = {
  refreshKey?: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────

function tasksToEvents(items: Task[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  items.forEach(t => {
    // Add parent task if it has a due date
    if (t.dueDate) {
      const d = new Date(t.dueDate as string);
      events.push({
        id: t.id,
        title: t.title,
        start: d,
        end: d,
        allDay: true,
        task: t,
        isSubtask: false,
      });
    }
    
    // Add subtasks if they have due dates
    if (t.subtasks && t.subtasks.length > 0) {
      t.subtasks.forEach(subtask => {
        if (subtask.dueDate) {
          const d = new Date(subtask.dueDate as string);
          events.push({
            id: subtask.id,
            title: `${t.title} > ${subtask.title}`,
            start: d,
            end: d,
            allDay: true,
            task: subtask,
            isSubtask: true,
          });
        }
      });
    }
  });
  
  return events;
}

function formatDateLocal(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ── Modal component ──────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  defaultDate: string;
  defaultTitle?: string;
  mode: 'edit' | 'create';
  onConfirm: (title: string, date: string) => void;
  onCancel: () => void;
}

/**
 * TaskModal
 *
 * Small modal used to create or edit a task's due date and title.
 */
function TaskModal({ title, defaultDate, defaultTitle = '', mode, onConfirm, onCancel }: ModalProps) {
  const [taskTitle, setTaskTitle] = React.useState(defaultTitle);
  const [taskDate, setTaskDate]   = React.useState(defaultDate);

  return (
    <div className="calendar-modal-overlay" onClick={onCancel}>
      <div className="calendar-modal" onClick={e => e.stopPropagation()}>

        <div className="calendar-modal-header">
          <h2 className="calendar-modal-title">{title}</h2>
          <button className="calendar-modal-close" onClick={onCancel}>✕</button>
        </div>

        <div className="calendar-modal-body">
          {mode === 'create' && (
            <div className="calendar-modal-field">
              <label htmlFor="modal-title">Task title</label>
              <input
                id="modal-title"
                type="text"
                placeholder="Enter task title..."
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <div className="calendar-modal-field">
            <label htmlFor="modal-date">Due date</label>
            <input
              id="modal-date"
              type="date"
              value={taskDate}
              onChange={e => setTaskDate(e.target.value)}
            />
          </div>
        </div>

        <div className="calendar-modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(taskTitle, taskDate)}
            disabled={mode === 'create' && !taskTitle.trim()}
          >
            {mode === 'create' ? 'Create task' : 'Save changes'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Priority dot for event styling ────────────────────────────────────────

/**
 * EventLabel
 *
 * Renders an event title with an optional priority dot for styling.
 * Subtasks show with a lighter visual style and indentation.
 */
function EventLabel({ event }: { event: CalendarEvent }) {
  const priority = event.task?.status?.toLowerCase();
  const urgent = isTaskUrgent(event.task);
  const isSubtask = event.isSubtask || false;
  
  return (
    <span className={`calendar-event-label ${urgent ? 'calendar-event-label--urgent' : ''} ${isSubtask ? 'calendar-event-label--subtask' : ''}`}>
      {!isSubtask && priority && <span className={`calendar-event-dot dot-${priority}`} />}
      {isSubtask && <span className="calendar-event-subtask-bullet">•</span>}
      {event.title as string}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function CalendarView({ refreshKey = 0 }: CalendarViewProps) {
  const [tasks, setTasks]   = React.useState<Task[]>([]);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [error, setError]   = React.useState<string | null>(null);
  const [modal, setModal]   = React.useState<{
    mode: 'edit' | 'create';
    date: string;
    title: string;
    eventId?: string;
  } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await listTasks();
        setTasks(data);
        setEvents(tasksToEvents(data));
      } catch (err) {
        setError('Failed to load tasks.');
        console.error(err);
      }
    })();
  }, [refreshKey]);

  // Click existing event → open edit modal
  function onSelectEvent(event: any) {
    setModal({
      mode: 'edit',
      date: (event.task?.dueDate || '').toString(),
      title: event.title as string,
      eventId: String(event.id),
    });
  }

  // Click empty slot → open create modal prefilled with that date
  function onSelectSlot(slotInfo: any) {
    setModal({
      mode: 'create',
      date: formatDateLocal(slotInfo.start),
      title: '',
    });
  }

  async function handleModalConfirm(title: string, date: string) {
    if (!modal) return;
    setModal(null);

    try {
      if (modal.mode === 'edit' && modal.eventId) {
        const updated = await updateTask(modal.eventId, { dueDate: date });
        const newTasks = tasks.map(t => String(t.id) === String(updated.id) ? updated : t);
        setTasks(newTasks);
        setEvents(tasksToEvents(newTasks));
      } else {
        const created = await createTask({ title, dueDate: date });
        const newTasks = [...tasks, created];
        setTasks(newTasks);
        setEvents(tasksToEvents(newTasks));
      }
    } catch (e) {
      setError(modal.mode === 'edit' ? 'Failed to update task.' : 'Failed to create task.');
      console.error(e);
    }
  }

  return (
    <div className="calendar-view">

      {error && (
        <div className="calendar-error">{error}</div>
      )}

      <div className="calendar-hint">
        Click a date to create a task · Click an event to edit its due date
      </div>

      <div className="calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectEvent={onSelectEvent}
          onSelectSlot={onSelectSlot}
          views={['month', 'week', 'day']}
          eventPropGetter={(event: CalendarEvent) => {
            const isSubtask = event.isSubtask || false;
            const isUrgent = isTaskUrgent(event.task);
            
            let className = '';
            if (isSubtask) {
              className = isUrgent ? 'calendar-event--subtask-urgent' : 'calendar-event--subtask';
            } else {
              className = isUrgent ? 'calendar-event--urgent' : '';
            }
            
            return { className };
          }}
          components={{ event: EventLabel as any }}
        />
      </div>

      {modal && (
        <TaskModal
          title={modal.mode === 'create' ? 'New task' : 'Edit due date'}
          defaultDate={modal.date}
          defaultTitle={modal.title}
          mode={modal.mode}
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}