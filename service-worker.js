const CACHE='g2r2-academy-v17-route-restore';
const SHELL=['./','./index.html','./styles.css','./app.js','./api.js','./my-courses.js','./config.js','./assets/icon-192.png','./assets/academy-logo.webp','./assets/rocket.webp','./assets/academy-campus-hero.webp'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.includes('/content/'))return; e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});