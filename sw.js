/* eBayクエスト Service Worker — offline caching + push reminders */
const CACHE = 'ebay-quest-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for our own assets, network fallback.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

/* ---- Push reminders ---- */
function idbGet(key){
  return new Promise(res => {
    const r = indexedDB.open('ebayQuest', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv'); };
    r.onsuccess = () => { try { const g = r.result.transaction('kv','readonly').objectStore('kv').get(key); g.onsuccess = () => res(g.result); g.onerror = () => res(undefined); } catch(e){ res(undefined); } };
    r.onerror = () => res(undefined);
  });
}
function swToday(){ const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let data = {};
    try { data = e.data ? e.data.json() : {}; } catch(_) {}
    const rec = await idbGet('lastRecordDate');
    // Conditional: if today already has a record, don't nag.
    if (rec === swToday()) return;
    await self.registration.showNotification(data.title || 'eBayクエスト', {
      body: data.body || '今日のクエストがまだです！ボスが待ってるよ ⚔️',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { url: data.url || './index.html' }
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(cs => {
    for (const c of cs) { if ('focus' in c) return c.focus(); }
    return clients.openWindow((e.notification.data && e.notification.data.url) || './index.html');
  }));
});
