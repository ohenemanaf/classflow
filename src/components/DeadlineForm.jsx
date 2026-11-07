import { useId, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { DEADLINE_TYPES, deadlineDate, shiftDate } from '../lib/schedule.js';
import Sheet from './Sheet.jsx';
import { ActionRow, ChipGroup, Group, TextRow, ValueRow } from './ui.jsx';

// One-tap moves for when a lecturer brings a deadline forward or pushes it back.
const MOVES = [
  [-7, '1 week earlier'],
  [-1, '1 day earlier'],
  [1, '1 day later'],
  [7, '1 week later'],
];

export default function DeadlineForm({ initial, onSave, onDelete, onClose }) {
  const formId = useId();
  const [draft, setDraft] = useState(initial);
  const bind = (key) => ({
    value: draft[key],
    onChange: (event) => setDraft({ ...draft, [key]: event.target.value }),
  });

  const due = draft.date && draft.time ? deadlineDate(draft) : null;
  const dueText =
    due && !Number.isNaN(due.getTime())
      ? `Due ${due.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`
      : null;

  return (
    <Sheet
      title={draft.id ? 'Edit Deadline' : 'New Deadline'}
      onClose={onClose}
      action={{ label: draft.id ? 'Save' : 'Add', form: formId }}
      persistent
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        className="space-y-5"
      >
        <ChipGroup
          label="Type"
          options={DEADLINE_TYPES}
          value={draft.type}
          onChange={(type) => setDraft({ ...draft, type })}
        />
        <Group>
          <TextRow label="Title" required {...bind('title')} />
          <TextRow label="Course code" required className="uppercase placeholder:normal-case" {...bind('courseCode')} />
          <TextRow label="Venue (optional)" {...bind('venue')} />
        </Group>
        <div>
          <Group footer={dueText}>
            <ValueRow label="Date" type="date" required {...bind('date')} />
            <ValueRow label="Time" type="time" required {...bind('time')} />
          </Group>
          {draft.date && (
            <div role="group" aria-label="Move the deadline" className="mt-3 grid grid-cols-2 gap-1.5">
              {MOVES.map(([days, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDraft({ ...draft, date: shiftDate(draft.date, days) })}
                  className="press glass min-h-11 rounded-full px-3 text-[0.875rem] font-semibold text-tint"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {draft.id && (
          <Group>
            <ActionRow icon={Trash2} label="Delete deadline" destructive onClick={() => onDelete(draft.id)} />
          </Group>
        )}
      </form>
    </Sheet>
  );
}
