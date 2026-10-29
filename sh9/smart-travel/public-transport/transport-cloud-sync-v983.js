/* SH9 v983 · common private transport dataset sync, MÁV first; Volán-ready.
 * Reuses EXISTING HealthHub Dropbox browser OAuth token and app-folder scope.
 * Never creates OAuth credentials, uploads without a click, polls, or touches
 * Supabase/GitHub/private family health records. Automatic check is manifest-
 * only, opt-in and at most once per 24h when the document becomes visible.
 * Blob is named by SHA-256; manifest writes use Dropbox revision CAS.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_TRANSPORT_CLOUD_SYNC_V983=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const APP_KEY='t68rmhh5f1l8d85',TOKEN='hh-dropbox-token-v2';
 const ROOT='/HealthHub/transport/gtfs',EVERY=24*3600000,MAX=24*1024*1024;
 const MODULES=Object.freeze({mav:'MÁV',volan:'Volán'});
 const MANIFEST_SCHEMA='sh9.transport.manifest/1';
 const bounded=x=>typeof x==='string'?x.slice(0,160):'';
 function paths(module){
  if(!Object.prototype.hasOwnProperty.call(MODULES,module))throw Error('Nem támogatott közlekedési modul.');
  const dir=ROOT+'/'+module;
  return {dir,manifest:dir+'/latest.json',blob:hash=>dir+'/dataset-'+hash+'.json'};
 }
 const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 async function digest(bytes,crypto){if(!crypto?.subtle?.digest)throw Error('Biztonságos SHA-256 kapcsolat szükséges.');return hex(await crypto.subtle.digest('SHA-256',bytes));}
 function verifyManifest(m,module){
  const p=paths(module);
  return !!(m&&m.schema===MANIFEST_SCHEMA&&m.module===module&&m.path===p.blob(m.sha256)&&
   /^[a-f0-9]{64}$/.test(m.sha256||'')&&Number.isInteger(m.bytes)&&m.bytes>0&&m.bytes<=MAX&&
   typeof m.feedGeneratedAt==='string'&&m.feedGeneratedAt.length<45&&
   Number.isFinite(Date.parse(m.publishedAt||''))&&m.publishedAt.length<45);
 }
 function isMissing(error){return Number(error?.status)===409&&/not_found/i.test(String(error?.summary||''));}
 function createClient(w){
  const vault=()=>w.HH_DROPBOX_VAULT;
  function readToken(){
   try{const t=JSON.parse(w.localStorage.getItem(TOKEN)||'null');
    return t&&typeof t.refresh_token==='string'&&t.refresh_token.length>10?t:null}
   catch(_){return null}
  }
  function connected(){
   try{return !!(vault()?.connected?.()||readToken())}catch(_){return false}
  }
  async function token(){
   const existing=vault();
   if(existing?.connected?.()&&typeof existing.accessToken==='function')return existing.accessToken();
   const t=readToken();
   if(!t)throw Error('A HealthHub webes Dropbox-kapcsolata nincs engedélyezve ezen a telefonon.');
   if(t.access_token&&Number(t.expires_at)>Date.now()+60000)return t.access_token;
   const req=await w.fetch('https://api.dropboxapi.com/oauth2/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP_KEY})
   });
   if(!req.ok)throw Error('HealthHub Dropbox-kapcsolat megújítása sikertelen (HTTP '+req.status+').');
   const fresh=await req.json();if(typeof fresh.access_token!=='string')throw Error('Érvénytelen Dropbox kapcsolat.');
   // Do not overwrite a token already refreshed by the main HealthHub page.
   const same=readToken();
   if(same&&same.refresh_token===t.refresh_token){
    same.access_token=fresh.access_token;
    same.expires_at=Date.now()+(Number(fresh.expires_in)||14400)*1000-60000;
    w.localStorage.setItem(TOKEN,JSON.stringify(same));
   }
   return fresh.access_token;
  }
  async function api(endpoint,params){
   const t=await token();
   const r=await w.fetch('https://api.dropboxapi.com/2/'+endpoint,{
    method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},
    body:JSON.stringify(params)
   });
   if(r.ok)return r.json();
   let summary='';try{summary=bounded((await r.json()).error_summary)}catch(_){}
   const error=Error('Dropbox '+endpoint+': HTTP '+r.status);
   error.status=r.status;error.summary=summary;throw error;
  }
  async function meta(path){
   try{return await api('files/get_metadata',{path,include_deleted:false})}
   catch(e){if(isMissing(e))return null;throw e}
  }
  async function ensureDir(dir){
   const segments=dir.split('/').filter(Boolean);let sofar='';
   for(const part of segments){
    sofar+='/'+part;
    const m=await meta(sofar);
    if(m){if(m['.tag']!=='folder')throw Error('Dropbox-ütközés: a célútvonal nem mappa.');continue}
    try{await api('files/create_folder_v2',{path:sofar,autorename:false})}
    catch(e){if(!isMissing(e)){
      const check=await meta(sofar).catch(()=>null);
      if(check?.['.tag']!=='folder')throw e;
    }}
   }
  }
  async function download(path,maxBytes=MAX){
   const t=await token();
   const r=await w.fetch('https://content.dropboxapi.com/2/files/download',{
    method:'POST',headers:{Authorization:'Bearer '+t,'Dropbox-API-Arg':JSON.stringify({path})}
   });
   if(!r.ok){
    let summary='';try{summary=bounded((await r.json()).error_summary)}catch(_){}
    const e=Error('Dropbox letöltés: HTTP '+r.status);e.status=r.status;e.summary=summary;throw e;
   }
   const size=Number(r.headers?.get?.('content-length')||0);
   if(size>maxBytes)throw Error('A Dropbox-fájl túl nagy, letöltés letiltva.');
   const bytes=new Uint8Array(await r.arrayBuffer());
   if(!bytes.length||bytes.byteLength>maxBytes)throw Error('A Dropbox-fájl mérete érvénytelen.');
   return bytes;
  }
  async function upload(path,bytes,mode='add'){
   if(!bytes||bytes.byteLength>MAX||!bytes.byteLength)throw Error('Érvénytelen vagy túl nagy szinkroncsomag.');
   const t=await token();
   const r=await w.fetch('https://content.dropboxapi.com/2/files/upload',{
    method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/octet-stream',
     'Dropbox-API-Arg':JSON.stringify({path,mode,autorename:false,mute:true})},
    body:bytes
   });
   if(!r.ok){
    let summary='';try{summary=bounded((await r.json()).error_summary)}catch(_){}
    const e=Error('Dropbox feltöltés: HTTP '+r.status);e.status=r.status;e.summary=summary;throw e;
   }
   const info=await r.json();
   if(String(info.path_lower||'').toLowerCase()!==path.toLowerCase()||
      Number(info.size)!==bytes.byteLength)throw Error('Dropbox visszaigazolás nem egyezik a küldött fájllal.');
   return info;
  }
  return {connected,meta,ensureDir,download,upload};
 }
 const encode=(value)=>new TextEncoder().encode(JSON.stringify(value));
 const decode=(bytes)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 function createSync(w,config){
  if(!w||!MODULES[config?.module]||typeof config.readLocal!=='function'||
   typeof config.importLocal!=='function'||typeof config.validate!=='function')
   throw Error('Hiányzó közlekedési adapter.');
  const module=config.module,p=paths(module),client=config.client||createClient(w);
  const key='sh9-transport-cloud-v983-'+module;
  const readState=()=>{try{return JSON.parse(w.localStorage.getItem(key)||'null')||{}}
   catch(_){return{}}};
  const writeState=x=>{try{w.localStorage.setItem(key,JSON.stringify(x))}catch(_){}};
  let busy=false;
  async function local(){
   const data=config.readLocal();
   if(!data)return null;
   if(!config.validate(data))throw Error('A helyi menetrend ellenőrzése sikertelen.');
   const bytes=encode(data);
   if(bytes.byteLength>MAX)throw Error('A helyi GTFS mérete meghaladja a 24 MB-os biztonsági korlátot.');
   return {data,bytes,sha256:await digest(bytes,w.crypto)};
  }
  async function readManifest(){
   const metadata=await client.meta(p.manifest);
   if(!metadata)return {manifest:null,metadata:null};
   if(metadata['.tag']!=='file'||metadata.size>4096)throw Error('A Dropbox manifest nem érvényes.');
   const bytes=await client.download(p.manifest,4096);
   const manifest=decode(bytes);
   if(!verifyManifest(manifest,module))throw Error('A felhőben tárolt menetrend-verzió sérült.');
   return {manifest,metadata};
  }
  async function status(){
   const current=await local();
   return {connected:client.connected(),enabled:readState().enabled===true,
    local:current?{sha256:current.sha256,bytes:current.bytes.length,
     version:bounded(current.data.feedVersion||current.data.generatedAt)}:null};
  }
  async function push(confirmed=false){
   if(busy)throw Error('Már folyamatban van közlekedési szinkron.');
   if(!confirmed)throw Error('Felhőmentés csak külön felhasználói jóváhagyással engedélyezett.');
   busy=true;
   try{
    if(!client.connected())throw Error('Nincs webes HealthHub Dropbox-kapcsolat.');
    const current=await local();
    if(!current)throw Error('Előbb töltsd be a saját menetrendet.');
    await client.ensureDir(p.dir);
    const {manifest:remote,metadata}=await readManifest();
    if(remote?.sha256===current.sha256)return {action:'unchanged',sha256:current.sha256,bytes:current.bytes.length};
    if(remote&&remote.sha256!==current.sha256&&
      Number.isFinite(Date.parse(remote.feedGeneratedAt))&&
      Number.isFinite(Date.parse(current.data.generatedAt))&&
      Date.parse(remote.feedGeneratedAt)>Date.parse(current.data.generatedAt))
     throw Error('A Dropboxban újabb menetrend található. Töltsd le, ne írd felül.');
    const file=p.blob(current.sha256),existing=await client.meta(file);
    if(existing){
     if(existing['.tag']!=='file'||Number(existing.size)!==current.bytes.length)
      throw Error('Hash-azonosító ütközés a Dropboxban; mentés letiltva.');
    }else await client.upload(file,current.bytes,'add');
    const m={schema:MANIFEST_SCHEMA,module,sha256:current.sha256,
      path:file,bytes:current.bytes.length,
      feedVersion:bounded(current.data.feedVersion||''),
      feedGeneratedAt:bounded(current.data.generatedAt||''),
      publishedAt:new Date().toISOString()};
    const body=encode(m);
    // First write must not overwrite; later revisions are optimistic CAS.
    const revision=metadata?.rev;
    await client.upload(p.manifest,body,revision?{'.tag':'update',update:revision}:'add');
    const checked=await readManifest();
    if(checked.manifest?.sha256!==current.sha256)
     throw Error('A Dropbox verzió-visszaellenőrzése nem sikerült.');
    const prior=readState();writeState({...prior,lastUploadAt:Date.now(),lastHash:current.sha256});
    return {action:'uploaded',sha256:current.sha256,bytes:current.bytes.length};
   }finally{busy=false}
  }
  async function pull({allowReplace=false,automatic=false}={}){
   if(busy)throw Error('Már folyamatban van közlekedési szinkron.');
   busy=true;
   try{
    if(!client.connected())throw Error('Nincs webes HealthHub Dropbox-kapcsolat.');
    const {manifest}=await readManifest();
    if(!manifest)return {action:'empty'};
    const current=await local();
    if(current?.sha256===manifest.sha256)return {action:'unchanged'};
    if(current&&automatic)return {action:'different',manifest};
    if(current&&!allowReplace)return {action:'confirmation-required',manifest};
    const bytes=await client.download(manifest.path,MAX);
    if(bytes.length!==manifest.bytes||await digest(bytes,w.crypto)!==manifest.sha256)
     throw Error('A felhőadat ellenőrzőösszege nem egyezik. Helyi menetrend érintetlen.');
    const raw=decode(bytes);
    if(!config.validate(raw))throw Error('A felhőből érkező menetrend nem felel meg a helyi ellenőrzésnek.');
    await config.importLocal(raw);
    const prior=readState();writeState({...prior,lastDownloadAt:Date.now(),lastHash:manifest.sha256});
    return {action:'downloaded',sha256:manifest.sha256,bytes:bytes.length};
   }finally{busy=false}
  }
  async function check(){
   if(busy)return {action:'busy'};
   const state=readState();
   if(state.enabled!==true)return {action:'disabled'};
   if(Number.isFinite(state.lastCheckAt)&&Date.now()-state.lastCheckAt<EVERY)return {action:'throttled'};
   // Avoid constant failed retries: record check even if Dropbox is offline.
   writeState({...state,lastCheckAt:Date.now()});
   if(!client.connected())return {action:'not-connected'};
   return pull({automatic:true});
  }
  function enable(allowed){
   const state=readState();writeState({...state,enabled:allowed===true,lastCheckAt:0});
  }
  return Object.freeze({push,pull,check,enable,status,readState,connected:client.connected,
   module,paths:p,version:'983'});
 }
 function mount(w,d,config){
  const sync=createSync(w,config),parent=d.getElementById(config?.mountId);
  if(!parent)return sync;
  const panel=d.createElement('div');panel.className='sh9-transport-sync-v983';
  panel.setAttribute('role','group');panel.setAttribute('aria-label','Privát közlekedési menetrend szinkronizálás');
  const title=d.createElement('strong');title.textContent='☁️ Közös HealthHub · Dropbox szinkron';
  const description=d.createElement('p');description.textContent=
   'A privát családi Dropboxban csak jóváhagyás után készül menetrendi másolat. MÁV és később Volán ugyanazt a motort használja.';
  const buttons=d.createElement('div');buttons.className='sh9-transport-sync-actions-v983';
  function action(label,fn){const b=d.createElement('button');b.type='button';b.textContent=label;
   b.addEventListener('click',async()=>{
    b.disabled=true;setStatus('Feldolgozás…');
    try{await fn()}catch(e){setStatus('⚠️ '+String(e?.message||'Szinkronhiba').slice(0,180))}
    finally{b.disabled=false}
   });buttons.append(b);return b}
  const note=d.createElement('p');note.className='sh9-transport-sync-status-v983';
  note.setAttribute('role','status');note.setAttribute('aria-live','polite');
  const setStatus=text=>{note.textContent=text};
  const confirm=w.confirm?.bind(w)||(()=>false);
  action('☁️ Mentés privát Dropboxba',async()=>{
   if(!sync.connected())throw Error('Csatlakoztasd a HealthHub webes Dropbox-kapcsolatát.');
   if(!confirm('A saját MÁV GTFS menetrend jelenleg csak helyi használatra van megjelölve. Kifejezetten jóváhagyod, hogy egy privát családi Dropbox-másolat készüljön róla? Nem kerül nyilvános tárhelyre.'))return;
   const result=await sync.push(true);
   setStatus(result.action==='unchanged'?'✅ Már ugyanez a menetrend van a felhőben.':
    '✅ Privát Dropbox-másolat ellenőrizve · '+Math.round(result.bytes/1024)+' KB.');
  });
  action('⬇️ Letöltés a Dropboxból',async()=>{
   let r=await sync.pull();
   if(r.action==='confirmation-required'){
    if(!confirm('A telefonon másik menetrend van. Felülírod a helyi példányt a Dropboxban tárolt változattal?'))return;
    r=await sync.pull({allowReplace:true});
   }
   setStatus(r.action==='downloaded'?'✅ A felhőmenetrend helyben ellenőrizve és betöltve.':
    r.action==='unchanged'?'✅ A helyi menetrend már naprakész.':
    'A Dropboxban még nincs közlekedési menetrend.');
  });
  const label=d.createElement('label');label.className='sh9-transport-sync-option-v983';
  const toggle=d.createElement('input');toggle.type='checkbox';toggle.checked=sync.readState().enabled===true;
  label.append(toggle,d.createTextNode(' Napi, kímélő automatikus verzióellenőrzés'));
  toggle.addEventListener('change',()=>{
   sync.enable(toggle.checked);
   setStatus(toggle.checked?'✅ Bekapcsolva: legfeljebb napi egy verzióellenőrzés, csak megnyitott oldalon.':
    'Automatikus ellenőrzés kikapcsolva.');
   if(toggle.checked)void runCheck();
  });
  async function runCheck(){
   try{
    const r=await sync.check();
    if(r.action==='downloaded')setStatus('✅ Új menetrend letöltve és ellenőrizve a Dropboxból.');
    if(r.action==='different')setStatus('☁️ Másik menetrend van a felhőben. Kézi jóváhagyással frissíthető.');
    if(r.action==='not-connected')setStatus('A webes Dropbox-kapcsolat nincs csatlakoztatva.');
   }catch(e){setStatus('⚠️ Dropbox-ellenőrzés: '+String(e?.message||e).slice(0,140))}
  }
  w.addEventListener('focus',()=>{if(!d.hidden)void runCheck()});
  d.addEventListener('visibilitychange',()=>{if(!d.hidden)void runCheck()});
  const pathHint=d.createElement('small');pathHint.textContent=
   'Privát mentés: '+sync.paths.dir+' · nagy GTFS-fájl csak kézi jóváhagyás után; nincs háttérfeltöltés vagy Supabase.';
  panel.append(title,description,buttons,label,note,pathHint);
  parent.append(panel);
  setStatus(sync.connected()?'Dropbox-kapcsolat elérhető · privát mentés még nem indult.':
   'A HealthHub webes Dropbox-kapcsolata ezen a böngészőn még nincs csatlakoztatva.');
  if(toggle.checked)w.setTimeout(()=>{if(!d.hidden)void runCheck()},1000);
  return sync;
 }
 return Object.freeze({paths,verifyManifest,createClient,createSync,mount,version:'983'});
});
