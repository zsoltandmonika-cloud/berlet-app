/* SHO Local Storage Monitor V1 · browser-local, read-only diagnostic.
 * No network requests, no Supabase, no OneDrive or private content read.
 * navigator.storage.estimate(): entire SAME-ORIGIN usage, browser-specific.
 * Book Studio: count only known IndexedDB rows' size metadata; never read Blobs.
 * No cache eviction, quota modification or background polling.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document)api.mount(root,root.document);
})(typeof window==='object'?window:null,function(){
 'use strict';
 const MB=1000*1000,GB=1000*MB;
 const TARGET=2*GB,WARNING=4*GB;
 const NAMES=Object.freeze({
  phone:'sh9-book-studio-device-library-v22',
  cloud:'sh9-book-studio-covers-books-v3',
  cacheStore:'items',localStore:'books',catalog:'offline_catalog_v21'
 });
 const $=(doc,id)=>doc.getElementById(id);
 const safeSize=x=>Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<1e15?Number(x):0;
 const readable=bytes=>{
  if(bytes===null||bytes===undefined||!Number.isFinite(Number(bytes)))return 'Nem elérhető';
  const n=Math.max(0,Number(bytes));
  if(n>=GB)return (n/GB).toLocaleString('hu-HU',{maximumFractionDigits:2})+' GB';
  return (n/MB).toLocaleString('hu-HU',{maximumFractionDigits:1})+' MB';
 };
 const budgetLevel=bytes=>bytes>=WARNING?'danger':bytes>TARGET?'warn':'ok';
 const summary=usage=>!Number.isFinite(usage)?'A böngésző nem adja ki a helyi tárhelyadatokat.':
  usage>=WARNING?'⚠️ A becsült webhely-tárhely meghaladja a 4 GB-os figyelmeztetési küszöböt. Nincs automatikus törlés.':
  usage>TARGET?'🟠 A becsült webhely-tárhely a 2 GB-os cél fölött van, a 4 GB-os figyelmeztetési küszöb alatt.':
  '✅ A becsült webhely-tárhely a 2 GB-os cél alatt van.';
 function labelBrowser(nav){
  const ua=String(nav?.userAgent||'');
  const device=/Android/i.test(ua)?'Android telefon / táblagép':/Windows/i.test(ua)?'Windows számítógép':'Aktuális eszköz';
  const browser=/SamsungBrowser/i.test(ua)?'Samsung Internet':
   /Edg\//.test(ua)?'Microsoft Edge':/Chrome\//.test(ua)?'Chrome / Chromium':'Aktuális böngésző / WebView';
  return device+' · '+browser;
 }
 function openExisting(indexedDB,name){
  return new Promise((resolve,reject)=>{
   const request=indexedDB.open(name);
   request.onupgradeneeded=()=>{try{request.transaction.abort()}catch(_){}};
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||Error('IndexedDB megnyitási hiba'));
   request.onblocked=()=>reject(Error('Helyi adatbázis foglalt'));
  });
 }
 async function listNames(indexedDB){
  if(!indexedDB||typeof indexedDB.databases!=='function')return null;
  try{
   const all=await indexedDB.databases();
   return new Set(all.map(x=>x?.name).filter(Boolean));
  }catch(_){return null}
 }
 // Only read metadata fields from known stores. Never call blob.arrayBuffer(),
 // never enumerate unknown/medical databases, and never emit book titles.
 async function walkStore(indexedDB,known,name,store,accept){
  if(!known?.has(name))return {present:false,ok:known!==null};
  let db=null;
  try{
   db=await openExisting(indexedDB,name);
   if(!db.objectStoreNames.contains(store))return {present:true,ok:false};
   return await new Promise((resolve)=>{
    let settled=false,scanned=0,timeout=null;
    const finish=(ok)=>{
     if(settled)return;settled=true;
     if(timeout)clearTimeout(timeout);
     resolve({present:true,ok,scanned});
    };
    try{
     const tr=db.transaction(store,'readonly');
     const req=tr.objectStore(store).openCursor();
     timeout=setTimeout(()=>{try{tr.abort()}catch(_){}finish(false)},15000);
     req.onsuccess=()=>{
      const row=req.result;
      if(!row)return;
      scanned++;
      try{accept(row.value)}catch(_){}
      if(scanned>=20000){try{tr.abort()}catch(_){}finish(false);return}
      row.continue();
     };
     req.onerror=()=>finish(false);
     tr.oncomplete=()=>finish(true);
     tr.onerror=()=>finish(false);
     tr.onabort=()=>finish(false);
    }catch(_){finish(false)}
   });
  }catch(_){return {present:true,ok:false}}
  finally{try{db?.close()}catch(_){}}
 }
 async function measureBooks(indexedDB){
  const result={supported:false,localBytes:null,cloudBytes:null,localBooks:null,cloudBooks:null,
   covers:null,lastLocal:null,lastCatalogue:null,partial:false,missing:false};
  const known=await listNames(indexedDB);
  if(known===null)return result;
  result.supported=true;
  result.localBytes=0;result.cloudBytes=0;result.localBooks=0;result.cloudBooks=0;result.covers=0;
  const local=await walkStore(indexedDB,known,NAMES.phone,NAMES.localStore,row=>{
   if(row?.source!=='local')return;
   result.localBytes+=safeSize(row.size_bytes)+safeSize(row.cover?.size);
   result.localBooks++;
   const stamp=Date.parse(row.updated_at||'');
   if(Number.isFinite(stamp))result.lastLocal=Math.max(result.lastLocal||0,stamp);
  });
  const cloud=await walkStore(indexedDB,known,NAMES.cloud,NAMES.cacheStore,row=>{
   const kind=row?.kind;
   if(kind!=='file'&&kind!=='cover')return;
   result.cloudBytes+=safeSize(row.bytes);
   if(kind==='file')result.cloudBooks++;
   if(kind==='cover')result.covers++;
  });
  const cat=await walkStore(indexedDB,known,NAMES.cloud,NAMES.catalog,row=>{
   const stamp=Number(row?.synced);
   if(Number.isFinite(stamp)&&stamp>0)result.lastCatalogue=Math.max(result.lastCatalogue||0,stamp);
  });
  result.partial=![local,cloud,cat].every(x=>x.ok);
  result.missing=!local.present&&!cloud.present;
  return result;
 }
 function stamp(n){
  if(!n||!Number.isFinite(n))return 'nincs ismert időpont';
  try{return new Date(n).toLocaleString('hu-HU',{dateStyle:'short',timeStyle:'short'})}
  catch(_){return 'nincs ismert időpont'}
 }
 async function measureBrowser(win){
  try{
   if(!win.navigator?.storage?.estimate)throw Error('Unsupported storage estimate');
   const estimate=await win.navigator.storage.estimate();
   return {usage:Number.isFinite(estimate?.usage)?estimate.usage:null,
    quota:Number.isFinite(estimate?.quota)?estimate.quota:null};
  }catch(_){return {usage:null,quota:null}}
 }
 function mount(win,doc){
  const button=$(doc,'refreshStorage');
  if(!button)return null;
  const used=$(doc,'storageUsed'),quota=$(doc,'storageQuota');
  $(doc,'deviceKind').textContent=labelBrowser(win.navigator);
  let busy=false;
  async function refresh(){
   if(busy)return;
   busy=true;button.disabled=true;
   $(doc,'storageState').textContent='A böngésző aktuális tárhelyadatainak mérése…';
   $(doc,'bookStatus').textContent='Mérés…';
   const overall=await measureBrowser(win);
   used.textContent=readable(overall.usage);quota.textContent=readable(overall.quota);
   const meter=$(doc,'storageMeter'),bar=$(doc,'storageBar'),level=overall.usage===null?'unknown':budgetLevel(overall.usage);
   meter.dataset.level=level;
   const percent=overall.usage===null?0:Math.min(100,Math.round(overall.usage/WARNING*100));
   meter.setAttribute('aria-valuenow',String(percent));bar.style.width=percent+'%';
   const status=$(doc,'storageState');status.textContent=summary(overall.usage);
   status.dataset.error=level==='danger'||level==='unknown'?'1':'0';
   const info=await measureBooks(win.indexedDB);
   const local=$(doc,'localBooksUsage'),cloud=$(doc,'onedriveBooksUsage');
   const detail=$(doc,'bookDetail'),sync=$(doc,'bookSync');
   if(!info.supported){
    local.textContent='Nem mérhető';cloud.textContent='Nem mérhető';
    detail.textContent='A böngésző nem támogatja az IndexedDB-adatbázisok biztonságos felsorolását.';
    sync.textContent='Könyvszintű méréshez kompatibilis böngésző szükséges.';
    $(doc,'bookStatus').textContent='Nem mérhető';
   }else{
    local.textContent=readable(info.localBytes);
    cloud.textContent=readable(info.cloudBytes);
    detail.textContent=info.localBooks+' helyi könyv · '+info.cloudBooks+
     ' OneDrive-fájlmásolat · '+info.covers+' borító'+
     (info.partial?' · ⚠️ Egyes helyi tárolók nem olvashatók.':'');
    sync.textContent='Utolsó helyi módosítás: '+stamp(info.lastLocal)+
     ' · Offline katalógus helyi mentése: '+stamp(info.lastCatalogue)+
     ' (nem igazolja a felhő frissességét).';
    $(doc,'bookStatus').textContent=info.partial?'Részleges mérés':info.missing?'Még nincs adat':'Helyben mérve';
   }
   $(doc,'lastRead').textContent='Mérés: '+stamp(Date.now());
   busy=false;button.disabled=false;
  }
  button.addEventListener('click',()=>void refresh());
  void refresh().catch(()=>{
   busy=false;button.disabled=false;
   $(doc,'storageState').textContent='A mérés nem fejeződött be. Próbáld újra a gombbal.';
   $(doc,'storageState').dataset.error='1';
  });
  return Object.freeze({refresh});
 }
 return Object.freeze({readable,budgetLevel,labelBrowser,measureBrowser,measureBooks,mount});
});
