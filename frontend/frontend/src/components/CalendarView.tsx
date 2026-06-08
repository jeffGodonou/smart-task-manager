import React from 'react';
import { Calendar, dateFnsLocalizer, Event as RbcEvent } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { listTasks, updateTask } from '../api/tasks';
import type { Task } from '../api/tasks';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function CalendarView() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [events, setEvents] = React.useState<RbcEvent[]>([]);

  // Load tasks and map to events
  React.useEffect(() => {
    (async () => {
      try {
        const data = await listTasks();
        setTasks(data);
        setEvents(tasksToEvents(data));
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Map Task -> calendar event
  function tasksToEvents(items: Task[]) {
    return items
      .filter(t => t.dueDate) // only tasks with a date
      .map(t => {
        // backend returns 'YYYY-MM-DD' so construct Date at midnight local timezone
        const d = new Date(t.dueDate as string);
        return {
          id: t.id,
          title: t.title,
          start: d,
          end: d,
          allDay: true,
          task: t
        };
      });
  }

  // When user clicks an event: simple inline edit prompt example
  async function onSelectEvent(event: any) {
    const newDate = window.prompt('New due date (YYYY-MM-DD):', (event.task?.dueDate || '').toString());
    if (!newDate) return;
    try {
      const updated = await updateTask(String(event.id), { dueDate: newDate });
      // update local state
      setTasks(prev => prev.map(t => (String(t.id) === String(updated.id) ? updated : t)));
      setEvents(tasksToEvents(tasks.map(t => (String(t.id) === String(updated.id) ? updated : t))));
    } catch (e) {
      console.error(e);
      alert('Failed to update due date');
    }
  }

  // When user selects an empty slot: show tasks on that day or create new (example)
  function onSelectSlot(slotInfo: any) {
    // slotInfo.start is a Date; convert to YYYY-MM-DD to create a new task or prefill editor
    const iso = slotInfo.start.toISOString().slice(0,10);
    const title = window.prompt('Create task title for ' + iso);
    if (!title) return;
    // you can use your createTask() API here to persist; omitted for brevity
  }

  return (
    <div style={{ height: 600 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={onSelectEvent}
        selectable
        onSelectSlot={onSelectSlot}
        views={['month', 'week', 'day']}
      />
    </div>
  );
}