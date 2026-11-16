/* SHO Book Studio V21 · narrow, opt-in offline book reader shell.
 * Scope: only /sh9/entertainment/book-studio/.
 * Do not intercept or cache Microsoft Graph, OAuth, Supabase, personal files
 * or authenticated response bodies. EPUB/PDF book blobs are in IndexedDB.
 */
'use strict';
const VERSION='sho-book-studio-offline-shell-v22';
const ROOT=new URL('./',self.registration.scope);
const local=[
 './','./index.html',
 './book-studio.css?v=2',
 './onedrive-books-v2.css?v=3',
 './book-studio-golden-v3.css?v=3',
 './book-studio-tuning-v4.css?v=4',
 './book-studio-wood-shelf-v10.css?v=12-cover-display-fix',
 './book-studio-library-manage-v13.css?v=13',
 './book-studio-reader-compact-v14.css?v=14-s24-more-reading-space',
 './book-studio-shelf-sort-v17.css?v=17-sort-custom',
 './book-studio-page-curl-v19.css?v=19-3d-sheet',
 './book-studio-offline-v21.css?v=21',
 './book-local-v22.css?v=22',
 './onedrive-session-v3.js?v=3',
 './book-cache-v3.js?v=21-offline-catalog',
 '../book-studio-preview-v4.js?v=4',
 './book-metadata-v4.js?v=4',
 './book-studio.js?v=20-sepia-explicit-bookmarks',
 './book-studio-wood-shelf-v10.js?v=21-offline-controls',
 './book-studio-offline-v21.js?v=21',
 './book-local-v22.js?v=22',
 './onedrive-books-v2.js?v=21-offline-first',
 './assets/wood-shelf-v10.webp',
 '../../sho-preview/favicon.svg'
].map(s=>new URL(s,ROOT).href);
const libraries=[
 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
 'https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js',
 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.2/dist/umd/supabase.min.js'
];
const allowed=new Set([...local,...libraries]);
const isOAuth=url=>['code','state','access_token','refresh_token','id_token',
 'session_state','error_description'].some(k=>url.searchParams.has(k));
function shellKey(request){
 const url=new URL(request.url);
 // HTML navigations with unrelated query parameters still reuse the
 // pre-cached page; OAuth redirects are never intercepted.
 if(request.mode==='navigate'&&url.origin===ROOT.origin&&url.pathname===ROOT.pathname)
  return ROOT.href;
 return request.url;
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(VERSION);
  // Keep installation possible on intermittent Wi-Fi. UI separately checks
  // that all essential EPUB/PDF engine files were successfully cached.
  await Promise.allSettled([...allowed].map(async url=>{
   const response=await fetch(url,{cache:'reload',credentials:'omit'});
   if(response.ok&&(response.type==='basic'||response.type==='cors'))
    await cache.put(url,response);
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const all=await caches.keys();
  await Promise.all(all.filter(k=>k.startsWith('sho-book-studio-offline-shell-')&&k!==VERSION)
   .map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(isOAuth(url))return;
 const key=shellKey(request);
 if(!allowed.has(key))return;
 event.respondWith((async()=>{
  const cache=await caches.open(VERSION);
  const saved=await cache.match(key);
  if(saved)return saved;
  // A not-yet-cached static dependency is fetched once and cached.
  try{
   const response=await fetch(request);
   if(response.ok&&(response.type==='basic'||response.type==='cors'))
    event.waitUntil(cache.put(key,response.clone()));
   return response;
  }catch(_){
   if(request.mode==='navigate'){
    const fallback=await cache.match(ROOT.href);
    if(fallback)return fallback;
   }
   return Response.error();
  }
 })());
});
