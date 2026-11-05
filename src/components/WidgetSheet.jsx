import { useMemo } from 'react';
import { toSnapshot, widgetData } from '../widget/core.js';
import Sheet from './Sheet.jsx';
import { Group } from './ui.jsx';
import WidgetCard from './WidgetCard.jsx';

function Step({ title, children }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[0.9375rem] font-semibold">{title}</p>
      <p className="mt-0.5 text-[0.875rem] leading-snug text-secondary">{children}</p>
    </div>
  );
}

export default function WidgetSheet({ profile, classes, deadlines, now, onClose }) {
  const snapshot = useMemo(
    () => toSnapshot({ name: profile.name, classes, deadlines, now: new Date() }),
    [profile.name, classes, deadlines],
  );
  const data = widgetData(snapshot, now);

  return (
    <Sheet title="Home Screen Widget" onClose={onClose} cancelLabel="Done">
      <div className="space-y-3">
        <WidgetCard data={data} size="medium" />
        <WidgetCard data={data} size="small" />
      </div>

      <Group className="mt-6" footer="The widget reads a small copy of your schedule saved on this device, so it works offline. Deleted classes disappear from it straight away.">
        <Step title="Windows 11">
          Install ClassFlow from Microsoft Edge (Apps, then Install this site as an app). Open the Widgets board, choose
          Add widgets, and pick ClassFlow.
        </Step>
        <Step title="iPhone and Android">
          Phones don't allow web apps to add home-screen widgets yet. Add ClassFlow to your home screen instead: its
          icon shows how many classes are left today where your phone supports badges, and a long press offers Add a
          class and Deadlines.
        </Step>
      </Group>
    </Sheet>
  );
}
