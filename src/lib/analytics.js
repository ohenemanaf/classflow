// Visit counting with Google Analytics 4. Off unless a measurement ID is set at build time,
// for example VITE_GA_MEASUREMENT_ID=G-ABC123XYZ in Netlify's environment variables.
//
// Privacy: by default Google Analytics records the full address (share links carry a whole
// timetable in ?sync=) and the tab title (which names the current class). So automatic page
// views are off, every visit is sent with a fixed address and title, and Google Analytics is
// only loaded once any share link has been dealt with and removed from the address.
const ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export const analyticsEnabled = Boolean(ID && /^G-[A-Z0-9]{4,}$/.test(ID));

let started = false;

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

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...page,
  });
  window.gtag('event', 'page_view', page);

  // Offline launches simply aren't counted; the app never waits on this.
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
  document.head.appendChild(script);
}
