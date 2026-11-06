// These keys date back to earlier versions of the app. Renaming any of them would
// wipe the timetable of everyone already using it.
export const KEYS = {
  profile: 'classflow_profile',
  legacyProfile: 'campusgrid_profile',
  classes: 'gctu_timetable',
  deadlines: 'gctu_exams',
  processedSync: 'processed_sync',
  alarms: 'classflow_alarms',
  tourDone: 'classflow_tour_done',
  celebrated: 'classflow_celebrated',
};

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const readProfile = () => readJson(KEYS.profile, null) ?? readJson(KEYS.legacyProfile, null);
