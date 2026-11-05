import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  notificationsSupported,
  playChime,
  registerServiceWorker,
  showSystemNotification,
  unlockAudio,
} from './lib/alerts.js';
import { buildCalendar } from './lib/calendar.js';
import { classesLeftToday, saveSnapshot, toSnapshot } from './widget/core.js';
import WidgetSheet from './components/WidgetSheet.jsx';
import { getDueAlerts, localDateString, weekdayName } from './lib/schedule.js';
import { KEYS, readJson, readProfile, writeJson } from './lib/storage.js';
import { decodeSchedule } from './lib/sync.js';
import { CalendarDays, Flag, Plus } from 'lucide-react';
import ClassForm from './components/ClassForm.jsx';
import ClassesView from './components/ClassesView.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import DeadlineForm from './components/DeadlineForm.jsx';
import DeadlinesView from './components/DeadlinesView.jsx';
import FeedbackSheet from './components/FeedbackSheet.jsx';
import Header from './components/Header.jsx';
import ImportDialog from './components/ImportDialog.jsx';
import MoreSheet from './components/MoreSheet.jsx';
import Onboarding from './components/Onboarding.jsx';
import Ambient from './components/Ambient.jsx';
import CoachMarks from './components/CoachMarks.jsx';
import Segmented from './components/Segmented.jsx';
import ShareSheet from './components/ShareSheet.jsx';
import Toast from './components/Toast.jsx';

const initialAlarms = () => {
  const stored = localStorage.getItem(KEYS.alarms);
  if (stored) return stored === 'on';
  return notificationsSupported() && Notification.permission === 'granted';
};

const clearSyncParam = () =>
  window.history.replaceState({}, document.title, window.location.pathname);

export default function App() {
  const [profile, setProfile] = useState(readProfile);
  const [classes, setClasses] = useState(() => readJson(KEYS.classes, []));
  const [deadlines, setDeadlines] = useState(() => readJson(KEYS.deadlines, []));
  const [tab, setTab] = useState('classes');
  const [alarmsOn, setAlarmsOn] = useState(initialAlarms);
  const [now, setNow] = useState(() => new Date());
  const [sheet, setSheet] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [toast, setToast] = useState(null);
  const [touring, setTouring] = useState(() => !localStorage.getItem(KEYS.tourDone));

  const toastTimer = useRef();
  const firedAlerts = useRef(new Set());

  const closeSheet = useCallback(() => setSheet(null), []);

  const finishTour = useCallback(() => {
    localStorage.setItem(KEYS.tourDone, '1');
    setTouring(false);
  }, []);

  const showToast = useCallback((title, message, duration = 4000) => {
    clearTimeout(toastTimer.current);
    setToast({ title, message });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => writeJson(KEYS.classes, classes), [classes]);
  useEffect(() => writeJson(KEYS.deadlines, deadlines), [deadlines]);

  // Keep the home-screen widget's copy in step. Each save replaces the whole copy, so a
  // deleted class or deadline is gone from it immediately; then the widget is told to redraw.
  const widgetSnapshot = useMemo(
    () => (profile ? toSnapshot({ name: profile.name, classes, deadlines, now: new Date() }) : null),
    [profile, classes, deadlines],
  );
  useEffect(() => {
    if (!widgetSnapshot || !('indexedDB' in window)) return;
    saveSnapshot(widgetSnapshot)
      .then(() => navigator.serviceWorker?.controller?.postMessage({ type: 'widget-refresh' }))
      .catch(() => {});
  }, [widgetSnapshot]);

  // App icon badge: classes still to come today (installed apps, where the phone supports it).
  const leftToday = widgetSnapshot ? classesLeftToday(widgetSnapshot, now) : 0;
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    (leftToday > 0 ? navigator.setAppBadge(leftToday) : navigator.clearAppBadge()).catch(() => {});
  }, [leftToday]);

  // Browsers throttle timers in background tabs, so catch up as soon as we're visible.
  useEffect(() => {
    const tick = () => setNow(new Date());
    const onVisible = () => document.visibilityState === 'visible' && tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    registerServiceWorker();
    const unlock = () => {
      unlockAudio();
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock, { passive: true });

    const raw = new URLSearchParams(window.location.search).get('sync');
    if (raw) {
      if (raw === localStorage.getItem(KEYS.processedSync)) {
        clearSyncParam();
      } else {
        try {
          const shared = decodeSchedule(raw);
          if (shared.timetable.length > 0) setIncoming({ ...shared, raw });
        } catch {
          showToast('Import failed', 'The shared schedule link is invalid or corrupted.');
        }
      }
    }
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, [showToast]);

  useEffect(() => {
    for (const alert of getDueAlerts(classes, now)) {
      if (firedAlerts.current.has(alert.key)) continue;
      firedAlerts.current.add(alert.key);
      const { courseCode, venue } = alert.class;
      const title = alert.minutes === 0 ? 'Class is starting' : 'Upcoming class';
      const message =
        alert.minutes === 0
          ? `${courseCode} is starting right now at ${venue}.`
          : `${courseCode} starts in about ${alert.minutes} minutes at ${venue}.`;
      showToast(title, message, 10000);
      if (alarmsOn) {
        playChime();
        showSystemNotification(title, message);
      }
    }
    const today = now.toDateString();
    for (const key of firedAlerts.current) {
      if (!key.includes(today)) firedAlerts.current.delete(key);
    }
  }, [now, classes, alarmsOn, showToast]);

  const toggleAlarms = async () => {
    unlockAudio();
    if (alarmsOn) {
      localStorage.setItem(KEYS.alarms, 'off');
      setAlarmsOn(false);
      showToast('Alarms off', "You'll still see a banner in the app, without sound.");
      return;
    }
    let permission = notificationsSupported() ? Notification.permission : 'unsupported';
    if (permission === 'default') permission = await Notification.requestPermission();
    localStorage.setItem(KEYS.alarms, 'on');
    setAlarmsOn(true);
    playChime();
    if (permission === 'granted') {
      showSystemNotification('Alarms on', 'This is how class alerts will look.');
      showToast('Alarms on', 'You should have heard the chime. Alerts ring while ClassFlow is open.');
    } else {
      showToast('Sound alarms on', 'Notifications are blocked, so you’ll get the chime and banner only.');
    }
  };

  const saveClass = (draft) => {
    setClasses(
      draft.id
        ? classes.map((c) => (c.id === draft.id ? draft : c))
        : [...classes, { ...draft, id: Date.now() }],
    );
    closeSheet();
  };

  const askDeleteClass = (id) =>
    setConfirm({
      title: 'Delete this class?',
      message: 'It will be removed from your timetable. This can’t be undone.',
      confirmLabel: 'Delete class',
      onConfirm: () => {
        setClasses((current) => current.filter((c) => c.id !== id));
        closeSheet();
      },
    });

  const askClearSchedule = () =>
    setConfirm({
      title: 'Clear your whole schedule?',
      message: 'Every class will be deleted. Your deadlines stay. This can’t be undone.',
      confirmLabel: 'Clear schedule',
      onConfirm: () => {
        setClasses([]);
        closeSheet();
      },
    });

  const saveDeadline = (draft) => {
    setDeadlines(
      draft.id
        ? deadlines.map((d) => (d.id === draft.id ? draft : d))
        : [...deadlines, { ...draft, id: Date.now() }],
    );
    closeSheet();
  };

  const askDeleteDeadline = (id) =>
    setConfirm({
      title: 'Delete this deadline?',
      message: 'Its countdown will be removed. This can’t be undone.',
      confirmLabel: 'Delete deadline',
      onConfirm: () => {
        setDeadlines((current) => current.filter((d) => d.id !== id));
        closeSheet();
      },
    });

  const newClass = () =>
    setSheet({
      kind: 'class',
      draft: {
        day: weekdayName(new Date()),
        startTime: '08:00',
        endTime: '10:00',
        courseCode: '',
        courseName: '',
        lecturer: '',
        venue: '',
      },
    });

  const newDeadline = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSheet({
      kind: 'deadline',
      draft: {
        title: '',
        courseCode: '',
        type: 'Midterm',
        date: localDateString(tomorrow),
        time: '09:00',
        venue: '',
      },
    });
  };

  // Home-screen shortcuts (long-press the app icon) arrive as ?action=add-class or ?tab=deadlines.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const requestedTab = params.get('tab');
    if (!action && !requestedTab) return;
    if (requestedTab === 'deadlines') setTab('deadlines');
    if (action === 'add-class') {
      setTab('classes');
      newClass();
    }
    params.delete('action');
    params.delete('tab');
    const rest = params.toString();
    window.history.replaceState({}, document.title, `${window.location.pathname}${rest ? `?${rest}` : ''}`);
    // Runs once on launch; newClass only reads the current date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openShare = () => {
    if (classes.length === 0) {
      showToast('Nothing to share yet', 'Add some classes before sharing your schedule.');
      return;
    }
    setSheet({ kind: 'share' });
  };

  // The phone's calendar can alert offline and with ClassFlow closed, which a web page can't.
  const exportCalendar = () => {
    const { text, count } = buildCalendar({ classes, deadlines, now: new Date() });
    if (count === 0) {
      showToast('Nothing to add yet', 'Add a class or deadline first.');
      return;
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'classflow-schedule.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    closeSheet();
    showToast(
      'Calendar file saved',
      `Open it to add ${count} ${count === 1 ? 'event' : 'events'} with reminders to your calendar.`,
      7000,
    );
  };

  const finishImport = (accepted) => {
    localStorage.setItem(KEYS.processedSync, incoming.raw);
    clearSyncParam();
    if (accepted) {
      setClasses(incoming.timetable.map((c, i) => ({ ...c, id: Date.now() + i })));
      showToast('Schedule imported', `You now have ${incoming.name}'s timetable.`);
    }
    setIncoming(null);
  };

  const saveProfile = (next) => {
    writeJson(KEYS.profile, next);
    setProfile(next);
    closeSheet();
  };

  if (!profile) {
    return (
      <>
        <Ambient />
        <Onboarding onSubmit={saveProfile} />
      </>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <Ambient />
      <Header
        profile={profile}
        now={now}
        alarmsOn={alarmsOn}
        onToggleAlarms={toggleAlarms}
        onMore={() => setSheet({ kind: 'more' })}
      />

      <Segmented
        label="View"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'classes', label: 'Classes', icon: CalendarDays },
          { value: 'deadlines', label: 'Deadlines', icon: Flag },
        ]}
      />

      {tab === 'classes' ? (
        <ClassesView
          classes={classes}
          now={now}
          onAdd={newClass}
          onEdit={(draft) => setSheet({ kind: 'class', draft })}
        />
      ) : (
        <DeadlinesView
          deadlines={deadlines}
          now={now}
          onAdd={newDeadline}
          onEdit={(draft) => setSheet({ kind: 'deadline', draft })}
          onDelete={askDeleteDeadline}
        />
      )}

      <button
        type="button"
        onClick={tab === 'classes' ? newClass : newDeadline}
        aria-label={tab === 'classes' ? 'Add class' : 'Add deadline'}
        data-tour="add"
        className="glass press fab fixed right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 grid size-15 place-items-center rounded-full text-tint sm:right-[max(1.25rem,calc(50vw-17rem))]"
      >
        <Plus size={28} strokeWidth={2.2} className="fab-icon" />
      </button>

      {sheet?.kind === 'class' && (
        <ClassForm
          initial={sheet.draft}
          classes={classes}
          onSave={saveClass}
          onDelete={askDeleteClass}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'deadline' && (
        <DeadlineForm
          initial={sheet.draft}
          onSave={saveDeadline}
          onDelete={askDeleteDeadline}
          onClose={closeSheet}
        />
      )}
      {sheet?.kind === 'share' && (
        <ShareSheet profile={profile} classes={classes} onToast={showToast} onClose={closeSheet} />
      )}
      {sheet?.kind === 'widget' && (
        <WidgetSheet profile={profile} classes={classes} deadlines={deadlines} now={now} onClose={closeSheet} />
      )}
      {sheet?.kind === 'feedback' && (
        <FeedbackSheet profile={profile} onToast={showToast} onClose={closeSheet} />
      )}
      {sheet?.kind === 'more' && (
        <MoreSheet
          profile={profile}
          hasClasses={classes.length > 0}
          onSaveProfile={saveProfile}
          onShare={openShare}
          onExportCalendar={exportCalendar}
          onWidget={() => setSheet({ kind: 'widget' })}
          onReplayTour={() => {
            closeSheet();
            setTab('classes');
            setTouring(true);
          }}
          onFeedback={() => setSheet({ kind: 'feedback' })}
          onClear={askClearSchedule}
          onClose={closeSheet}
        />
      )}

      {incoming && (
        <ImportDialog
          incoming={incoming}
          willReplace={classes.length > 0}
          onImport={() => finishImport(true)}
          onCancel={() => finishImport(false)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          {...confirm}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {touring && !sheet && !confirm && !incoming && <CoachMarks onClose={finishTour} />}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
