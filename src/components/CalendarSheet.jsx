import { useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import Sheet from './Sheet.jsx';
import { Button, Group, ValueRow } from './ui.jsx';

const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

function Step({ title, children }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[0.9375rem] font-semibold">{title}</p>
      <p className="mt-0.5 text-[0.875rem] leading-snug text-secondary">{children}</p>
    </div>
  );
}

/** Pick the semester, save the calendar file, and learn how to take it back out. */
export default function CalendarSheet({ semester, onSave, onClose }) {
  const [range, setRange] = useState(semester);
  const valid = Boolean(range.start && range.end && range.end > range.start);
  const weeks = valid ? Math.ceil((new Date(range.end) - new Date(range.start)) / (7 * 86400000)) : 0;

  return (
    <Sheet title="Add to Calendar" onClose={onClose}>
      <Group
        footer={
          valid
            ? `Your classes repeat every week for ${weeks} ${weeks === 1 ? 'week' : 'weeks'} and stop after ${longDate(range.end)}. Upcoming deadlines are added once, with reminders.`
            : 'The semester has to end after it starts.'
        }
      >
        <ValueRow
          label="Semester starts"
          type="date"
          required
          value={range.start}
          onChange={(e) => setRange({ ...range, start: e.target.value })}
        />
        <ValueRow
          label="Semester ends"
          type="date"
          required
          min={range.start}
          value={range.end}
          onChange={(e) => setRange({ ...range, end: e.target.value })}
        />
      </Group>

      <Button onClick={() => onSave(range)} disabled={!valid} className="mt-4 w-full">
        <CalendarCheck size={19} /> Save calendar file
      </Button>

      <h3 className="mt-7 px-1 text-[1.0625rem] font-bold tracking-[-0.015em]">Removing it later</h3>
      <Group
        className="mt-2"
        footer="You may not need to: classes stop repeating on their own after the semester ends."
      >
        <Step title="Tip: give it its own calendar">
          When you open the file, choose a calendar called ClassFlow (create one first if needed). Deleting that one
          calendar later removes everything ClassFlow added, and nothing else.
        </Step>
        <Step title="iPhone and iPad">
          Open Calendar, tap Calendars, tap ⓘ next to ClassFlow, then Delete Calendar. If you added the classes to
          another calendar, open a class and choose Delete All Future Events.
        </Step>
        <Step title="Google Calendar">
          On calendar.google.com, open Settings, choose the ClassFlow calendar under Settings for my calendars, then
          Remove calendar and Delete.
        </Step>
        <Step title="Outlook">Right-click the ClassFlow calendar in the calendar list and choose Delete calendar.</Step>
      </Group>
    </Sheet>
  );
}
