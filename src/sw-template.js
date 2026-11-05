// Service worker template. vite.config.js fills in the version and file list at build time
// and writes the result to dist/sw.js. Every deploy changes the version, which makes phones
// download the new files in the background; the new version shows on the next launch.
const CACHE = 'classflow-__VERSION__';
const FILES = __FILES__;

// ---- Widget core (src/widget/core.js, inlined at build time) ----
__WIDGET_CORE__
// ---- end widget core ----

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('classflow-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Servers send `Vary` headers (Origin, Accept-Encoding) that would stop the module script,
  // which is requested with an Origin header, matching its saved copy. Every file here is
  // fixed for this version, so the variation they describe doesn't apply.
  const options = { ignoreVary: true };

  // A local "endpoint" for widgets: the stored schedule copy, worked out for this moment.
  if (new URL(request.url).pathname === '/widget/data.json') {
    event.respondWith(currentWidgetData().then((data) => jsonResponse(data)));
    return;
  }

  // Every page, including share links with ?sync=, is the same single-page app.
  if (request.mode === 'navigate') {
    event.respondWith(caches.match('/index.html', options).then((cached) => cached || fetch(request)));
    return;
  }
  event.respondWith(caches.match(request, options).then((cached) => cached || fetch(request)));
});

// ---- Home-screen widget (Windows 11 Widgets board, installed from Microsoft Edge) ----

const jsonResponse = (data) =>
  new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const currentWidgetData = () =>
  loadSnapshot()
    .catch(() => null)
    .then((snapshot) => widgetData(snapshot, new Date()));

async function renderWidget(tag) {
  const template = await caches
    .match('/widget/template.json', { ignoreVary: true })
    .then((cached) => (cached ? cached.text() : JSON.stringify(WIDGET_TEMPLATE)));
  await self.widgets.updateByTag(tag, { template, data: JSON.stringify(await currentWidgetData()) });
}

async function refreshWidgets() {
  if (!self.widgets) return;
  const widget = await self.widgets.getByTag(WIDGET_TAG);
  if (widget) await renderWidget(WIDGET_TAG);
}

self.addEventListener('widgetinstall', (event) => event.waitUntil(renderWidget(event.widget.definition.tag)));
self.addEventListener('widgetresume', (event) => event.waitUntil(renderWidget(event.widget.definition.tag)));
self.addEventListener('widgetclick', (event) => {
  if (event.action === 'open') event.waitUntil(self.clients.openWindow('/'));
});

// The app posts this after every schedule change; periodic sync keeps the "next class" current.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'widget-refresh') event.waitUntil(refreshWidgets());
});
self.addEventListener('periodicsync', (event) => {
  if (event.tag === WIDGET_TAG) event.waitUntil(refreshWidgets());
});

// Tapping a class alert opens ClassFlow.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      if (windows.length > 0) return windows[0].focus();
      return self.clients.openWindow('/');
    }),
  );
});
