let audioContext = null;

const getContext = () => {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioContext = new Ctx();
  }
  return audioContext;
};

/** Mobile browsers only allow sound after a user gesture, so call this from one. */
export function unlockAudio() {
  try {
    const ctx = getContext();
    if (ctx?.state !== 'suspended') return;
    ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(0);
    oscillator.stop(0.01);
  } catch (error) {
    console.error('Audio unlock failed:', error);
  }
}

/** The three-note ClassFlow chime (B4, E5, B5). */
export function playChime() {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const note = (frequency, at, length) => {
      const sine = ctx.createOscillator();
      sine.type = 'sine';
      sine.frequency.setValueAtTime(frequency, at);
      const triangle = ctx.createOscillator();
      triangle.type = 'triangle';
      triangle.frequency.setValueAtTime(frequency * 2.01, at);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.4, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, at + length);
      sine.connect(gain);
      triangle.connect(gain);
      gain.connect(ctx.destination);
      sine.start(at);
      triangle.start(at);
      sine.stop(at + length);
      triangle.stop(at + length);
    };
    const start = ctx.currentTime;
    note(493.88, start, 0.4);
    note(659.25, start + 0.15, 0.4);
    note(987.77, start + 0.3, 0.8);
  } catch (error) {
    console.error('Audio playback failed:', error);
  }
}

export const notificationsSupported = () => 'Notification' in window;

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => navigator.serviceWorker.ready)
    // Keeps the home-screen widget's "next class" current. Only installed apps in Chromium
    // browsers get this, and the browser decides the real interval, so failures are expected.
    .then((registration) => registration.periodicSync?.register('classflow-next', { minInterval: 15 * 60 * 1000 }))
    .catch(() => {});
}

/** Shows a system notification. Android Chrome only allows this through a service worker. */
export async function showSystemNotification(title, body) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const options = { body, icon: '/icon-192.png', badge: '/icon-192.png' };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    // The in-app banner and chime still fire, so a blocked notification loses nothing.
  }
}
