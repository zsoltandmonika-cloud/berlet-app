/* SH9 installable launcher: narrow, network-first shell only.
   No OAuth callbacks, Dropbox content, HealthHub patient data, or other modules
   are cached by this service worker. Scope is /berlet-app/sh9/ only. */
const CACHE='sh9-install-shell-v2-sho-fancy';
const ROOT=new URL('./',self.registration.scope);
const ALLOWED=new Set([
  ROOT.href,
  new URL('index.html',ROOT).href,
  new URL('SH9_official_v21.css',ROOT).href,
  new URL('pwa-icon.svg',ROOT).href,
  new URL('sho-preview/favicon.svg',ROOT).href,
  new URL('assets/sho-fancy-install-192-v1.png',ROOT).href,
  new URL('assets/sho-fancy-install-512-v1.png',ROOT).href,
  new URL('assets/sho-fancy-maskable-512-v1.png',ROOT).href,
  new URL('assets/sho-fancy-touch-180-v1.png',ROOT).href,
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

/* SHO v3 opt-in Web Push pilot. Does not change the existing offline shell cache.
   Browsers wake this worker for a push after the page closes. Only generic payloads. */
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let data=null;
  try{data=event.data?.json()}catch(_){return}
  if(data?.kind!=='sho-test-v3')return;
  const notificationUrl=new URL('notification-center/',ROOT).href;
  await self.registration.showNotification('SHO · Smart Hub One',{
   body:'Próbaértesítés: a SHO háttérben működő push csatornája.',
   icon:new URL('assets/sho-fancy-install-192-v1.png',ROOT).href,
   badge:new URL('assets/sho-fancy-install-192-v1.png',ROOT).href,
   tag:'sho-webpush-v3',
   renotify:false,
   requireInteraction:false,
   data:{url:notificationUrl,kind:'sho-test-v3'}
  });
 })());
});
self.addEventListener('notificationclick',event=>{
 if(!['sho-test-v3','sho-buddy-place-foreground-v2'].includes(event.notification?.data?.kind))return;
 event.notification.close();
 event.waitUntil((async()=>{
  const safeTarget=new URL('notification-center/',ROOT).href;
  const openClients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const open=openClients.find(client=>{
   try{return new URL(client.url).origin===self.location.origin&&new URL(client.url).pathname.startsWith('/berlet-app/sh9/')}catch(_){return false}
  });
  if(open){await open.focus();if(typeof open.navigate==='function')await open.navigate(safeTarget)}
  else await self.clients.openWindow(safeTarget);
 })());
});
