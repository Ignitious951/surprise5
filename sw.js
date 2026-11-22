/* Service worker: lets the site install as an app, open with a weak connection,
   and show notifications from your partner even when the app is closed.
   It always tries the network first, so updates show up as soon as you re-upload the site. */
const CACHE = 'our-universe-v2';
const SHELL = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;          // Supabase, fonts, etc. go straight to the network
  if (r.headers.has('range') || /\.(mp3|m4a|wav|ogg|mp4)$/i.test(u.pathname)) return;  // never cache songs (seeking needs ranges)
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});

/* ---- Push: a message from the server arrives even when the app is closed ---- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch (_) { d = { title: 'Our Little Universe', body: e.data ? e.data.text() : '' }; }
  const tag = d.tag || 'universe';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.some(c => c.visibilityState === 'visible');
    // Browsers require every push to show something. If the app is already open on screen,
    // show it silently and tidy it away (the in-app banner and sound already handled it).
    await self.registration.showNotification(d.title || 'Our Little Universe', {
      body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
      tag, renotify: !open, silent: open, data: { url: d.url || './' }
    });
    if (open) {
      await new Promise(r => setTimeout(r, 1500));
      (await self.registration.getNotifications({ tag })).forEach(n => n.close());
    }
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.postMessage({ go: url }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
