/* Book Studio Golden V21 · opt-in on-device reading.
 * Sensitive Microsoft tokens and preauthenticated URLs are NEVER written
 * into this cache. IndexedDB books are browser-private but not encrypted.
 */
(function(w,d){
 'use strict';
 const $=id=>d.getElementById(id),CACHE=w.SH9_BOOK_CACHE_V3;
 const STORE='sh9-book-offline-opt-in-v21:',CFG='sh9-book-ms-config-v2';
 const profile=()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
  catch(_){return'zsolt'}};
 const config=()=>{try{return JSON.parse(w.localStorage.getItem(CFG)||'null')}catch(_){return null}};
 const key=(account,p)=>STORE+encodeURIComponent(String(account||'').toLowerCase())+'|'+encodeURIComponent(p||'');
 const isEnabled=(account,p)=>{try{return !!account&&w.localStorage.getItem(key(account,p))==='on'}catch(_){return false}};
 let busy=false,stopping=false,message='',error=false,progressPct=0;
 const mb=n=>((Number(n)||0)/1048576).toFixed(1)+' MB';
 function say(s,bad=false,pct=null){
  message=s;error=bad;
  const el=$('bshelfOfflineState');
  if(el){el.textContent=message;el.dataset.error=error?'1':'0'}
  if(pct!==null)progressPct=Math.max(0,Math.min(100,pct));
  const bar=$('bshelfOfflineBar');if(bar)bar.style.width=progressPct+'%';
 }
 function configAccount(){return String(config()?.account||'').toLowerCase()}
 async function getSnapshot(account,p){
  if(!CACHE||!isEnabled(account,p))return null;
  const data=await CACHE.catalogueGet(account,p);
  return data&&data.books?.length?data:null;
 }
 async function publish(account,p,books,folderId,driveId){
  if(!isEnabled(account,p)||!CACHE)return false;
  const ok=await CACHE.cataloguePut(account,p,books,folderId,driveId);
  if(ok)void inspect();
  return ok;
 }
 async function queueProgress(account,p,book,patch){
  if(!isEnabled(account,p)||!CACHE)return null;
  const ok=await CACHE.pendingPut(account,p,book,patch);
  if(!ok)return null;
  // Capture the revision id so a slow online sync cannot discard a later turn.
  const all=await CACHE.pendingList(account,p);
  return all.find(x=>x.drive_item_id===book.drive_item_id)||null;
 }
 const listPending=(account,p)=>CACHE?.pendingList(account,p)||Promise.resolve([]);
 const ackPending=(account,p,id,at)=>CACHE?.pendingDelete(account,p,id,at)||Promise.resolve(false);
 async function registerShell(){
  if(!('serviceWorker' in navigator)||!('caches' in w))
   return {ok:false,reason:'Ebben a böngészőben az offline webes olvasó nem támogatott.'};
  try{
   const reg=await navigator.serviceWorker.register('./offline-reader-sw-v21.js',{scope:'./'});
   if(reg.installing)await new Promise(resolve=>{
    const worker=reg.installing;
    if(worker.state==='activated'||worker.state==='redundant')return resolve();
    worker.addEventListener('statechange',()=>{
     if(worker.state==='activated'||worker.state==='redundant')resolve();
    });
    w.setTimeout(resolve,13000);
   });
   const core=[
    './','./book-studio.js?v=20-sepia-explicit-bookmarks',
    './book-studio-wood-shelf-v10.js?v=21-offline-controls',
    './book-studio-offline-v21.js?v=21',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js',
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
   ];
   const base=new URL('./',w.location.href);
   const result=await Promise.all(core.map(async path=>{
    try{return !!(await w.caches.match(new URL(path,base).href))}catch(_){return false}
   }));
   if(result.every(Boolean))return {ok:true};
   return {ok:false,reason:'Az olvasó egyes fájljai még nem töltődtek le. Ellenőrizd a Wi-Fi-t, majd próbáld újra.'};
  }catch(e){return {ok:false,reason:'Offline motor telepítési hiba: '+(e.message||'ismeretlen')}}
 }
 async function inspect(){
  const account=configAccount(),p=profile(),on=isEnabled(account,p);
  const count=account&&CACHE?await CACHE.count(account):null;
  const snapshot=account&&CACHE?await CACHE.catalogueGet(account,p):null;
  const total=snapshot?.books?.length||0;
  const pinned=count?.offlineBooks||0;
  const percent=total?Math.round(100*Math.min(total,pinned)/total):0;
  const active=$('bshelfOfflineEnable'),download=$('bshelfOfflineDownload'),
   refresh=$('bshelfOfflineRefresh'),disable=$('bshelfOfflineDisable'),cancel=$('bshelfOfflineCancel');
  if(active){active.hidden=on;active.disabled=busy}
  if(disable){disable.hidden=!on;disable.disabled=busy}
  if(download){download.disabled=busy||!on||!w.SH9_BOOK_STUDIO_DRIVE_V2?.isReady?.()}
  if(refresh){refresh.disabled=busy||!w.SH9_BOOK_STUDIO_DRIVE_V2?.isReady?.()}
  if(cancel)cancel.hidden=!busy;
  if(!busy&&!error){
   say(!account?'☁️ Előbb állítsd be a OneDrive-kapcsolatot.':
    on?('📱 Offline mód BE · '+total+' könyv a polcon · '+pinned+' fájl letöltve'):
    '☁️ Offline mód KI · a könyvek a OneDrive-ról töltődnek.',false,on?percent:0);
  }
  const storage=$('bshelfOfflineStorage');
  if(storage){
   let used='Tárhelyinformáció nem elérhető.';
   try{
    const info=await navigator.storage?.estimate?.();
    if(info)used='Webhely tárhelye: '+mb(info.usage)+' / '+mb(info.quota)+' (becsült kvóta). ';
    const persist=await navigator.storage?.persisted?.();
    used+=' Tartós tárhely: '+(persist?'engedélyezett':'nem garantált')+'.';
   }catch(_){}
   storage.textContent='📦 '+(count?.books||0)+' helyi könyv · '+(count?.covers||0)+
    ' borító · '+mb(count?.bytes||0)+' helyi adat. '+used;
  }
  return {on,total,pinned};
 }
 async function enable(){
  const account=configAccount(),p=profile();
  if(!account||!CACHE||!w.SH9_BOOK_STUDIO_DRIVE_V2?.isReady?.()){
   say('Először csatlakozz a Microsoft OneDrive-hoz, hogy a saját könyveidet készítsük elő.',true);
   return false;
  }
  const consent='Az offline könyvek a telefon böngészőjének tárhelyére kerülnek, külön titkosítás nélkül. '+
   'Más, a készülékhez hozzáférő személy is elérheti őket. A OneDrive-on semmi nem módosul. Bekapcsolod?';
  if(!w.confirm(consent))return false;
  busy=true;error=false;say('📱 Helyi olvasó előkészítése…');
  try{
   try{await navigator.storage?.persist?.()}catch(_){}
   const shell=await registerShell();
   if(!shell.ok){say(shell.reason,true);return false}
   w.localStorage.setItem(key(account,p),'on');
   const ok=await w.SH9_BOOK_STUDIO_DRIVE_V2?.saveOfflineCatalog?.();
   if(!ok)throw Error('A könyvkatalógus helyi mentése nem sikerült.');
   w.SH9_BOOKSHELF_V10?.setOffline(true);
   say('✓ Offline mód bekapcsolva. Az összes EPUB/PDF letöltéséhez használd az alábbi gombot.',false,0);
   return true;
  }catch(e){
   try{w.localStorage.removeItem(key(account,p))}catch(_){}
   say('Nem sikerült bekapcsolni: '+e.message,true);
   return false;
  }finally{busy=false;await inspect()}
 }
 async function downloadAll(){
  const account=configAccount(),p=profile();
  if(busy||!isEnabled(account,p)||!w.SH9_BOOK_STUDIO_DRIVE_V2?.isReady?.()){
   say('A teljes letöltéshez online, hitelesített OneDrive-kapcsolat kell.',true);return
  }
  busy=true;stopping=false;error=false;progressPct=0;
  say('⬇ Könyvek letöltése a telefonra…',false,0);
  await inspect();
  try{
   const summary=await w.SH9_BOOK_STUDIO_DRIVE_V2.prepareOffline({
    cancelled:()=>stopping,
    onProgress:({done,total,failed})=>{
     say('⬇ '+done+'/'+total+' könyv ellenőrizve · '+failed+
      ' sikertelen · telefonra mentés folyamatban',false,total?100*done/total:0);
    }
   });
   const note=summary.cancelled?'A letöltés megszakadt. A már lementett könyvek megmaradnak.':
    'Offline letöltés kész: '+summary.cached+'/'+summary.total+
    ' fájl helyben'+(summary.failed?' · '+summary.failed+' hiba':'')+'.';
   say(note,!!summary.failed,summary.total?100*summary.cached/summary.total:0);
  }catch(e){say('Offline letöltési hiba: '+e.message,true)}
  finally{busy=false;stopping=false;await inspect()}
 }
 function cancel(){stopping=true;say('⏹ Letöltés leállítása a folyamatban lévő könyv után…')}
 async function disable(){
  const account=configAccount(),p=profile();
  try{w.localStorage.removeItem(key(account,p))}catch(_){}
  w.SH9_BOOKSHELF_V10?.setOffline(false);
  w.SH9_BOOK_STUDIO_DRIVE_V2?.disableOfflineView?.();
  say('☁️ Offline mód KI. A már lementett könyvek gyorsítótárként megmaradnak.',false,0);
  await inspect();
 }
 async function reload(){
  if(!w.SH9_BOOK_STUDIO_DRIVE_V2?.isReady?.()){
   say('A könyvtár frissítéséhez Microsoft-kapcsolat szükséges.',true);return
  }
  say('↻ OneDrive-könyvtár frissítése…');error=false;
  try{await w.SH9_BOOK_STUDIO_DRIVE_V2.reload();await inspect()}
  catch(e){say('Frissítési hiba: '+e.message,true)}
 }
 if($('bshelfOfflineEnable')){
  $('bshelfOfflineEnable').addEventListener('click',()=>void enable());
  $('bshelfOfflineDownload').addEventListener('click',()=>void downloadAll());
  $('bshelfOfflineCancel').addEventListener('click',cancel);
  $('bshelfOfflineDisable').addEventListener('click',()=>void disable());
  $('bshelfOfflineRefresh').addEventListener('click',()=>void reload());
  d.addEventListener('visibilitychange',()=>{if(!d.hidden&&!busy)void inspect()});
  w.addEventListener('online',()=>{if(!busy)void inspect()});
  w.addEventListener('offline',()=>{if(!busy)void inspect()});
 }
 w.SH9_BOOK_OFFLINE_V21=Object.freeze({
  isEnabled,getSnapshot,publish,queueProgress,listPending,ackPending,
  inspect,registerShell
 });
 // Never activate offline content for the household without opt-in.
 if(isEnabled(configAccount(),profile())){
  void registerShell().then(()=>inspect());
 }else void inspect();
})(window,document);
