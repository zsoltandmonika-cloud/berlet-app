const C="lena-recepttar-studio-54-shell";
const SHELL=["./","./index.html","./styles.css?v=34","./app.js?v=45","./data.js?v=24","./readable-data.js?v=34","./manifest.webmanifest","./icon-192.png","./icon-512.png","./assets/lena-chef-avatar.jpg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(C).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request)))})