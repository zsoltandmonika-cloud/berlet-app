/* SHO Media Center · UI-only offline shell v1.
 * Persistent cache: local HTML/CSS/JavaScript ONLY, exact allowlist.
 * NEVER cache images, thumbnails, artwork, photos, music, video, posters,
 * OneDrive/Graph content, signed download URLs, media bytes or OAuth responses.
 * Media streaming remains native/network-driven; its transient browser playback
 * buffer is not an application-managed persistent media cache.
 * Separate scope prevents changes to Book Studio and the main SHO shell.
 */
'use strict';
const CACHE='sho-media-center-ui-shell-v1';
const PREFIX='sho-media-center-ui-shell-';
const ROOT=new URL('./',self.registration.scope);
const STATIC=[
 './',
 './index.html',
 './onedrive-media-v2.css?v=5-no-legacy-flash',
 './golden-six-glass-v1.css?v=20261121-six-golden-glass',
 './reference-art-v1.css?v=20261121-crop-fix-v2',
 './onedrive-media-v2.js?v=5-no-legacy-flash',
 './ui-shell-register-v1.js?v=1',
 '../book-studio/onedrive-session-v3.js'
].map(x=>new URL(x,ROOT).href);
const ALLOWED=new Set(STATIC);
const ROOT_DOC=ROOT.href;
const INDEX_DOC=new URL('index.html',ROOT).href;
function keyOf(request){
 if(request.method!=='GET')return null;
 const url=new URL(request.url);
 if(url.origin!==ROOT.origin)return null;
 // A navigation may reuse one canonical shell. Never cache auth redirect
 // parameters, media query URLs or arbitrary URL variants.
 if(request.mode==='navigate'){
  if(url.search||url.hash)return null;
  return url.href===ROOT_DOC||url.href===INDEX_DOC?ROOT_DOC:null;
 }
 return ALLOWED.has(url.href)?url.href:null;
}
async function updateStatic(key,request,cache){
 const response=await fetch(new Request(request,{cache:'no-store'}));
 if(response.ok&&response.type==='basic'&&
   /^(text\/html|text\/css|application\/javascript|text\/javascript)/i.test(response.headers.get('content-type')||'')){
  await cache.put(key,response.clone());
 }
 return response;
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // No images/audio/video here, including decorative OneDrive artwork.
  // Missing static dependencies abort installation instead of a partial shell.
  await Promise.all(STATIC.filter(x=>x!==INDEX_DOC).map(async key=>{
   const result=await fetch(key,{cache:'no-store',credentials:'omit'});
   if(!result.ok||result.type!=='basic'||!/^(text\/html|text\/css|application\/javascript|text\/javascript)/i.test(result.headers.get('content-type')||'')){
    throw Error('Media Center UI shell file unavailable: '+new URL(key).pathname);
   }
   await cache.put(key,result);
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(x=>x.startsWith(PREFIX)&&x!==CACHE).map(x=>caches.delete(x)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 const key=keyOf(request);
 if(!key)return; // Media, Graph, signed URLs, thumbnails: untouched.
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const hit=await cache.match(key);
  if(hit){
   // Cache First: return UI immediately; only THIS approved source file updates.
   event.waitUntil(updateStatic(key,request,cache).catch(()=>{}));
   return hit;
  }
  try{return await updateStatic(key,request,cache)}
  catch(_){return Response.error()}
 })());
});
