import { useId, useState } from 'react';
import { CircleAlert, Trash2 } from 'lucide-react';
import { DAYS, findConflict, toMinutes } from '../lib/schedule.js';
import Sheet from './Sheet.jsx';
import { ActionRow, ChipGroup, Group, TextRow, ValueRow } from './ui.jsx';

export default function ClassForm({ initial, classes, onSave, onDelete, onClose }) {
  const formId = useId();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState(null);
  const bind = (key) => ({
    value: draft[key],
    onChange: (event) => {
      setDraft({ ...draft, [key]: event.target.value });
      setError(null);
    },
  });

  const submit = (event) => {
    event.preventDefault();
    if (toMinutes(draft.startTime) >= toMinutes(draft.endTime)) {
      setError('The class has to end after it starts.');
      return;
    }
    const clash = findConflict(classes, draft);
    if (clash) {
      setError(`This overlaps ${clash.courseName} (${clash.startTime}–${clash.endTime}).`);
      return;
    }
    onSave(draft);
  };

  return (
    <Sheet
      title={draft.id ? 'Edit Class' : 'New Class'}
      onClose={onClose}
      action={{ label: draft.id ? 'Save' : 'Add', form: formId }}
      persistent
    >
      <form id={formId} onSubmit={submit} className="space-y-5">
        <Group>
          <TextRow label="Course name" required {...bind('courseName')} />
          <TextRow label="Course code" required className="uppercase placeholder:normal-case" {...bind('courseCode')} />
        </Group>
        <Group>
          <TextRow label="Venue" required {...bind('venue')} />
          <TextRow label="Lecturer" required {...bind('lecturer')} />
        </Group>
        <ChipGroup
          label="Day"
          options={DAYS}
          value={draft.day}
          columns={7}
          labelFor={(day) => day.slice(0, 2)}
          onChange={(day) => {
            setDraft({ ...draft, day });
            setError(null);
          }}
        />
        <Group>
          <ValueRow label="Starts" type="time" required {...bind('startTime')} />
          <ValueRow label="Ends" type="time" required {...bind('endTime')} />
        </Group>
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-2xl bg-destructive-soft p-3.5 text-[0.9375rem] text-destructive">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
        {draft.id && (
          <Group>
            <ActionRow icon={Trash2} label="Delete class" destructive onClick={() => onDelete(draft.id)} />
          </Group>
        )}
      </form>
    </Sheet>
  );
}
