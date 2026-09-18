
const C="lena-recepttar-21-shell";
const SHELL=["./","./index.html","./styles.css","./app.js","./data.js","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{if(x.ok){const y=x.clone();caches.open(C).then(c=>c.put(e.request,y))}return x})))});
