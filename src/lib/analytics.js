// Visit counting with Google Analytics 4. Off unless a measurement ID is set at build time,
// for example VITE_GA_MEASUREMENT_ID=G-ABC123XYZ in Vercel's environment variables.
//
// Privacy: Google Analytics records the page address (share links carry a whole timetable in
// ?sync=) and the tab title (which names the current class). So:
//  - it only loads once any share link has been handled and removed from the address;
//  - every event is sent with a fixed address and title ("/browser", "Opened in browser");
//  - real Google tags also send their own page view the moment they load, using the live tab
//    title and ignoring the settings above, so the tab title is held at that same label until
//    Google confirms the visit was sent.
const ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export const analyticsEnabled = Boolean(ID && /^G-[A-Z0-9]{4,}$/.test(ID));

let started = false;
let heldTitle = null;
const titleListeners = new Set();

const setHeldTitle = (title) => {
  heldTitle = title;
  if (title) document.title = title;
  for (const listener of titleListeners) listener(title);
};

/** The tab title to show while Google Analytics starts up, or null when the app may use its own. */
export const getHeldTitle = () => heldTitle;

/** Calls `listener` with the held title (or null on release). Returns an unsubscribe function. */
export function subscribeHeldTitle(listener) {
  titleListeners.add(listener);
  return () => titleListeners.delete(listener);
}

export function countVisit() {
  if (!analyticsEnabled || started) return;
  if (new URLSearchParams(window.location.search).has('sync')) return; // called again once handled
  started = true;

  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const label = installed ? 'installed-app' : 'browser';
  const page = {
    page_title: installed ? 'Opened as installed app' : 'Opened in browser',
    page_location: `${window.location.origin}/${label}`,
  };

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    setHeldTitle(null);
  };
  setHeldTitle(page.page_title);
  setTimeout(release, 8000); // never hold the real title back for long

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('set', page); // applies to every later event, such as scrolls and engagement
  window.gtag('config', ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...page,
  });
  // Google's own load-time page view goes out before this one, so once this is sent the
  // live title is safe to show again.
  window.gtag('event', 'page_view', { ...page, event_callback: release, event_timeout: 5000 });

  // Offline or blocked: nothing is counted and the title is released straight away.
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
  script.onerror = release;
  document.head.appendChild(script);
}
