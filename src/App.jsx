import { useCallback, useEffect, useRef, useState } from 'react';
import {
  notificationsSupported,
  playChime,
  registerServiceWorker,
  showSystemNotification,
  unlockAudio,
} from './lib/alerts.js';
import { buildCalendar } from './lib/calendar.js';
import { buildSampleData } from './lib/sample.js';
import {
  classesOn,
  DEFAULT_TITLE,
  getDayStatus,
  getDueAlerts,
  localDateString,
  tabTitle,
  toMinutes,
  weekdayName,
} from './lib/schedule.js';
import Confetti from './components/Confetti.jsx';
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
import PreviewBanner from './components/PreviewBanner.jsx';
import CalendarSheet from './components/CalendarSheet.jsx';
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

/** The semester last used for calendar export, or today plus about three months. */
const savedSemester = () => {
  const saved = readJson(KEYS.semester, null);
  if (saved?.start && saved?.end) return saved;
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
  return { start: localDateString(today), end: localDateString(end) };
};

const clearSyncParam = () =>
  window.history.replaceState({}, document.title, window.location.pathname);

export default function App() {
  const [profile, setProfile] = useState(readProfile);
  const [savedClasses, setSavedClasses] = useState(() => readJson(KEYS.classes, []));
  const [savedDeadlines, setSavedDeadlines] = useState(() => readJson(KEYS.deadlines, []));

  // Preview mode shows a sample timetable held in memory only. Nothing in it is ever saved,
  // and switching it off brings the student's own data straight back.
  const [preview, setPreview] = useState(null);
  const classes = preview ? preview.classes : savedClasses;
  const deadlines = preview ? preview.deadlines : savedDeadlines;
  const updater = (key, setSaved) => (next) => {
    if (!preview) return setSaved(next);
    return setPreview((current) => ({
      ...current,
      [key]: typeof next === 'function' ? next(current[key]) : next,
    }));
  };
  const setClasses = updater('classes', setSavedClasses);
  const setDeadlines = updater('deadlines', setSavedDeadlines);
  const [tab, setTab] = useState('classes');
  const [alarmsOn, setAlarmsOn] = useState(initialAlarms);
  const [now, setNow] = useState(() => new Date());
  const [sheet, setSheet] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [toast, setToast] = useState(null);
  const [touring, setTouring] = useState(() => !localStorage.getItem(KEYS.tourDone));
  const [confetti, setConfetti] = useState(0);

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

  useEffect(() => writeJson(KEYS.classes, savedClasses), [savedClasses]);
  useEffect(() => writeJson(KEYS.deadlines, savedDeadlines), [savedDeadlines]);

  // Browser tab title shows what's on, so desktop users can see it from any tab.
  // Minute-level, so it doesn't flicker every second.
  const pageTitle = profile ? tabTitle(savedClasses, now) : DEFAULT_TITLE;
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  // Celebrate once a day when the last class is over, even if the app is opened later.
  const dayType = profile ? getDayStatus(savedClasses, now).type : null;
  useEffect(() => {
    if (dayType !== 'done' || preview) return;
    const today = new Date().toDateString();
    if (localStorage.getItem(KEYS.celebrated) === today) return;
    localStorage.setItem(KEYS.celebrated, today);
    setConfetti((n) => n + 1);
    showToast('Done for today', 'That was your last class. Nice work.');
  }, [dayType, preview, showToast]);

  // An earlier version kept a copy of the schedule in IndexedDB for a desktop widget that has
  // since been removed. Delete that copy from devices that still have it.
  useEffect(() => {
    if ('indexedDB' in window) indexedDB.deleteDatabase('classflow-widget');
  }, []);

  // App icon badge: classes in progress or still to come today, so the icon itself signals
  // that something is on. Installed apps only, where the device supports badges. Always from
  // the student's own timetable, never the preview.
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const leftToday = profile
    ? classesOn(savedClasses, weekdayName(now)).filter((c) => toMinutes(c.endTime) > nowMinutes).length
    : 0;
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
    // Alarms always follow the student's own timetable, even while previewing the sample.
    for (const alert of getDueAlerts(savedClasses, now)) {
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
  }, [now, savedClasses, alarmsOn, showToast]);

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

  const startPreview = () => {
    setPreview(buildSampleData(new Date()));
    setTab('classes');
    closeSheet();
    window.scrollTo({ top: 0 });
    showToast('Previewing sample data', 'Look around and try things. Nothing here is saved.', 5000);
  };

  const endPreview = () => {
    setPreview(null);
    window.scrollTo({ top: 0 });
    showToast('Preview ended', 'You’re back to your own timetable.');
  };

  // Sharing or exporting the sample would send made-up classes to real people or calendars.
  const blockedInPreview = () => {
    if (!preview) return false;
    showToast('Exit the preview first', 'Sharing and calendar export use your own timetable.');
    return true;
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
    if (blockedInPreview()) return;
    if (classes.length === 0) {
      showToast('Nothing to share yet', 'Add some classes before sharing your schedule.');
      return;
    }
    setSheet({ kind: 'share' });
  };

  // The phone's calendar can alert offline and with ClassFlow closed, which a web page can't.
  const openCalendar = () => {
    if (blockedInPreview()) return;
    if (classes.length === 0 && deadlines.length === 0) {
      showToast('Nothing to add yet', 'Add a class or deadline first.');
      return;
    }
    setSheet({ kind: 'calendar' });
  };

  const exportCalendar = (semester) => {
    writeJson(KEYS.semester, semester);
    const { text, count } = buildCalendar({ classes, deadlines, now: new Date(), semester });
    if (count === 0) {
      showToast('Nothing to add', 'None of your classes meet before that semester ends.');
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
      setPreview(null);
      setSavedClasses(incoming.timetable.map((c, i) => ({ ...c, id: Date.now() + i })));
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
      {preview && <PreviewBanner onExit={endPreview} />}
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
          onSample={startPreview}
          onCelebrate={() => setConfetti((n) => n + 1)}
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
      {sheet?.kind === 'calendar' && (
        <CalendarSheet semester={savedSemester()} onSave={exportCalendar} onClose={closeSheet} />
      )}
      {sheet?.kind === 'share' && (
        <ShareSheet profile={profile} classes={classes} onToast={showToast} onClose={closeSheet} />
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
          onExportCalendar={openCalendar}
          previewing={Boolean(preview)}
          onTogglePreview={() => (preview ? (closeSheet(), endPreview()) : startPreview())}
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

      <Confetti burst={confetti} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
