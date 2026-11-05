import { useId, useState } from 'react';
import { CalendarPlus, Compass, LayoutGrid, MessageSquare, Share, Trash2 } from 'lucide-react';
import Sheet from './Sheet.jsx';
import { ActionRow, Group, TextRow } from './ui.jsx';

export default function MoreSheet({
  profile,
  hasClasses,
  onSaveProfile,
  onShare,
  onExportCalendar,
  onWidget,
  onReplayTour,
  onFeedback,
  onClear,
  onClose,
}) {
  const formId = useId();
  const [form, setForm] = useState({ name: profile.name, program: profile.program });
  const changed = form.name !== profile.name || form.program !== profile.program;

  return (
    <Sheet
      title="Settings"
      onClose={onClose}
      cancelLabel={changed ? 'Cancel' : 'Done'}
      action={changed ? { label: 'Save', form: formId } : undefined}
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          onSaveProfile({ name: form.name.trim(), program: form.program.trim() });
        }}
        className="space-y-5"
      >
        <Group>
          <TextRow label="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextRow
            label="Course / program"
            required
            value={form.program}
            onChange={(e) => setForm({ ...form, program: e.target.value })}
          />
        </Group>
        <Group footer="In-app alarms ring only while ClassFlow is open. Add your schedule to your calendar to get reminders even when it's closed or you're offline.">
          <ActionRow icon={CalendarPlus} label="Add to calendar" onClick={onExportCalendar} />
          <ActionRow icon={LayoutGrid} label="Home screen widget" onClick={onWidget} />
        </Group>
        <Group footer="Works offline. Your timetable is saved only on this device.">
          <ActionRow icon={Share} label="Share schedule" onClick={onShare} />
          <ActionRow icon={Compass} label="Replay tour" onClick={onReplayTour} />
          <ActionRow icon={MessageSquare} label="Suggest a feature" onClick={onFeedback} />
          {hasClasses && <ActionRow icon={Trash2} label="Clear entire schedule" destructive onClick={onClear} />}
        </Group>
      </form>
    </Sheet>
  );
}
