import { useId, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { DEADLINE_TYPES } from '../lib/schedule.js';
import Sheet from './Sheet.jsx';
import { ActionRow, ChipGroup, Group, TextRow, ValueRow } from './ui.jsx';

export default function DeadlineForm({ initial, onSave, onDelete, onClose }) {
  const formId = useId();
  const [draft, setDraft] = useState(initial);
  const bind = (key) => ({
    value: draft[key],
    onChange: (event) => setDraft({ ...draft, [key]: event.target.value }),
  });

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
        <Group>
          <ValueRow label="Date" type="date" required {...bind('date')} />
          <ValueRow label="Time" type="time" required {...bind('time')} />
        </Group>
        {draft.id && (
          <Group>
            <ActionRow icon={Trash2} label="Delete deadline" destructive onClick={() => onDelete(draft.id)} />
          </Group>
        )}
      </form>
    </Sheet>
  );
}
