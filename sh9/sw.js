/* SH9 installable launcher: narrow, network-first shell only.
   No OAuth callbacks, Dropbox content, HealthHub patient data, or other modules
   are cached by this service worker. Scope is /berlet-app/sh9/ only. */
const CACHE='sh9-install-shell-v1';
const ROOT=new URL('./',self.registration.scope);
const ALLOWED=new Set([
  ROOT.href,
  new URL('index.html',ROOT).href,
  new URL('SH9_official_v21.css',ROOT).href,
  new URL('pwa-icon.svg',ROOT).href,
  new URL('manifest.webmanifest',ROOT).href,
  new URL('assets/sh9-icon.png',ROOT).href
]);
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([ROOT.href,
    new URL('manifest.webmanifest',ROOT).href])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys
    .filter(key=>key.startsWith('sh9-install-shell-')&&key!==CACHE)
    .map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.mode==='navigate'&&new URL(req.url).pathname!=='/berlet-app/sh9/')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||!ALLOWED.has(url.origin+url.pathname))return;
  if(url.searchParams.has('code')||url.searchParams.has('state')||url.searchParams.has('access_token'))return;
  event.respondWith(fetch(req).then(response=>{
    if(response.ok&&response.type==='basic'){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)));
    }
    return response;
  }).catch(()=>caches.match(req).then(hit=>hit||caches.match(ROOT.href))));
});
