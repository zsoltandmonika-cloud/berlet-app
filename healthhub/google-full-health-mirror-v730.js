/* HealthHub -> ChatGPT Google Drive | private full-health mirror v730
 * Reads HealthHub Dropbox App Folder recursively, mirrors private health data
 * to app-created Google Drive files. No patient data, OAuth credentials, or tokens
 * are stored in the repository or sent to a public endpoint.
 * Explicit first-run authorization required; while browser is closed or Google
 * browser token has expired, background delivery is NOT guaranteed.
 */
(function(w,d){
 'use strict';
 const VERSION='730', STORE='hh-google-health-mirror-v730-state';
 const ROOT='/HealthHub', DEST='HealthHub AI Mirror', PREFIX='HHM__';
 const BLOCKED=/^(?:orchestrator|technical|secrets|credentials|tokens|auth|logs)(?:\/|$)/i;
 const SENSITIVE=/(^|[\/_.-])(token|secret|password|credential|oauth|session|apikey|api-key|private-key|refresh-token)([\/_.-]|$)/i;
 const MAX_BYTES=60*1024*1024, MAX_FILES=5000;
 const LEGACY_GOOGLE='hhGetGoogleDriveToken292';
 const LS=()=>{try{return JSON.parse(w.localStorage.getItem(STORE)||'null')||{}}catch(_){return {}}};
 let busy=false,stop=false,lastProgress={running:false},tick=0;
 function save(s){const out={...s};delete out.errors;try{w.localStorage.setItem(STORE,JSON.stringify(out))}catch(_){}}
 function safeName(s){return String(s||'').replace(/[<>&"']/g,'').slice(0,150)}
 function allowed(path){
  if(typeof path!=='string'||!path.startsWith(ROOT+'/'))return false;
  const tail=path.slice(ROOT.length+1);
  if(!tail||BLOCKED.test(tail)||SENSITIVE.test(tail)||tail.includes('/../'))return false;
  // Device registry and ephemeral sync controls are not clinical records.
  if(/^devices\//i.test(tail)&&!/^devices\/images\//i.test(tail))return false;
  if(/^sync\//i.test(tail)&&!/lena-health-context/i.test(tail))return false;
  return true;
 }
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const mime=p=>/\.pdf$/i.test(p)?'application/pdf':/\.json$/i.test(p)?'application/json':
  /\.txt$/i.test(p)?'text/plain':/\.csv$/i.test(p)?'text/csv':
  /\.jpe?g$/i.test(p)?'image/jpeg':/\.png$/i.test(p)?'image/png':
  /\.webp$/i.test(p)?'image/webp':'application/octet-stream';
 function filename(path){return PREFIX+path.slice(ROOT.length+1).replace(/\//g,'__').slice(0,210);}
 function need(cond,msg){if(!cond)throw Error(msg)}
 function dropVault(){
  const v=w.HH_DROPBOX_VAULT;
  need(v&&v.connected&&v.connected()&&typeof v.accessToken==='function',
   'A HealthHub privát Dropbox-tárhelye nincs csatlakoztatva.');
  return v;
 }
 async function dropFetch(endpoint,arg,binary){
  const token=await dropVault().accessToken();
  const url=(binary?'https://content.dropboxapi.com/2/':'https://api.dropboxapi.com/2/')+endpoint;
  const headers={Authorization:'Bearer '+token};
  if(binary)headers['Dropbox-API-Arg']=JSON.stringify(arg);
  else headers['Content-Type']='application/json';
  const res=await fetch(url,{method:'POST',headers,body:binary?undefined:JSON.stringify(arg)});
  if(!res.ok)throw Error('Dropbox '+endpoint+' HTTP '+res.status);
  return res;
 }
 async function listFiles(){
  const res=await dropFetch('files/list_folder',{path:ROOT,recursive:true,include_deleted:false,limit:250});
  let page=await res.json(),cursor=page.cursor,files=[],pages=0;
  for(;;){
   for(const e of page.entries||[]){
    if(e['.tag']!=='file'||!allowed(e.path_display||e.path_lower))continue;
    const p=e.path_display||e.path_lower;
    files.push({path:p,name:filename(p),hash:e.content_hash||'',size:Number(e.size)||0,mime:mime(p)});
    if(files.length>MAX_FILES)throw Error('A HealthHub archívum nagyobb a biztonságos egyben kezelhető fájlszámnál.');
   }
   if(!page.has_more)break;
   need(cursor,'A Dropbox nem adott folytatási azonosítót.');
   page=await(await dropFetch('files/list_folder/continue',{cursor})).json();
   cursor=page.cursor||cursor;
   if(++pages>500)throw Error('A Dropbox fájllista nem fejeződött be.');
  }
  files.sort((a,b)=>a.path.localeCompare(b.path,'hu'));
  return files;
 }
 async function token(interactive){
  need(typeof w[LEGACY_GOOGLE]==='function','A HealthHub Google Drive OAuth modulja nem töltődött be.');
  return w[LEGACY_GOOGLE](!!interactive);
 }
 async function google(url,opts,interactive){
  const access=await token(interactive);
  const o=opts||{};o.headers={...(o.headers||{}),Authorization:'Bearer '+access};
  const r=await fetch(url,o);
  if(!r.ok)throw Error('Google Drive HTTP '+r.status+
    (r.status===401?' · Google újracsatlakozás szükséges':''));
  return r;
 }
 function queryEscape(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
 async function find(name,parent){
  const q="name='"+queryEscape(name)+"' and trashed=false"+
   (parent?" and '"+queryEscape(parent)+"' in parents":"");
  const url='https://www.googleapis.com/drive/v3/files?spaces=drive&pageSize=100&'+
   'q='+encodeURIComponent(q)+'&fields='+encodeURIComponent('files(id,name,mimeType,size,parents),nextPageToken');
  const result=await(await google(url)).json();
  const matches=(result.files||[]).filter(f=>f.name===name);
  return matches[0]||null;
 }
 async function folder(){
  const exists=await find(DEST);
  if(exists){need(exists.mimeType==='application/vnd.google-apps.folder',
   'Az AI Mirror név már foglalt egy nem mappa fájlnál.');return exists.id}
  const res=await google('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    name:DEST,mimeType:'application/vnd.google-apps.folder',
    description:'HealthHub private medical mirror for user-authorized ChatGPT Drive connector'
   })
  });
  const v=await res.json();need(v.id,'A Drive mappa létrehozása nem igazolható.');return v.id;
 }
 async function readBlob(path){
  const r=await dropFetch('files/download',{path},true);return r.blob();
 }
 async function writeBlob(entry,blob,parent,id){
  const url='https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,mimeType';
  if(id){
   const r=await google('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+
    '?uploadType=media&fields=id,name,size,mimeType',{
     method:'PATCH',headers:{'Content-Type':entry.mime},body:blob
    }).catch(e=>{if(/HTTP 404/.test(e.message))return null;throw e});
   if(r)return r.json();
  }
  const boundary='hhmirror'+Date.now().toString(36);
  const meta={name:entry.name,mimeType:entry.mime,parents:[parent],
   description:'HealthHub privát forrásmásolat · '+entry.path,
   appProperties:{healthhub:'medical-mirror',mirrorVersion:VERSION}};
  const body=new Blob([
   '--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',
   JSON.stringify(meta),'\r\n--'+boundary+'\r\nContent-Type: '+entry.mime+'\r\n\r\n',
   blob,'\r\n--'+boundary+'--\r\n'
  ],{type:'multipart/related; boundary='+boundary});
  const r=await google(url,{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
  return r.json();
 }
 async function verifyFile(id,size){
  const u='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,size,trashed';
  const j=await(await google(u)).json();
  need(j.id===id&&!j.trashed&&Number(j.size)===size,
   'A Google Drive visszaellenőrzése nem egyezik a forrás méretével.');
 }
 async function mirrorFile(entry,parent,map){
  const prev=map[entry.path];
  if(prev&&prev.hash===entry.hash&&prev.size===entry.size&&prev.fileId)return {skipped:true,fileId:prev.fileId};
  need(entry.size<=MAX_BYTES,'Túl nagy fájl (>60 MB), külön szerveroldali átadás szükséges.');
  let existing=prev&&prev.fileId?{id:prev.fileId}:await find(entry.name,parent);
  const blob=await readBlob(entry.path);
  need(blob.size===entry.size,'Dropbox letöltés mérete eltér; nem továbbítjuk.');
  const uploaded=await writeBlob(entry,blob,parent,existing&&existing.id);
  need(uploaded&&uploaded.id,'A Google Drive nem adott fájlazonosítót.');
  await verifyFile(uploaded.id,entry.size);
  return {skipped:false,fileId:uploaded.id};
 }
 function status(message,progress){
  if(progress)lastProgress={...lastProgress,...progress};
  if(message)lastProgress.message=message;
  const out=d.getElementById('hhFullMirrorState730'),btn=d.getElementById('hhFullMirrorBtn730');
  if(btn){btn.disabled=busy;btn.textContent=busy?'⏳ Szinkronizálás folyamatban…':'🔄 Teljes egészségügyi Drive-szinkron';}
  if(out){
   const st=LS();
   out.textContent=(lastProgress.message||'Még nincs igazolt teljes Drive-szinkron.')+
    (busy?' · '+(lastProgress.done||0)+' / '+(lastProgress.total||'?'):'')+
    (st.lastSuccess?' · Utolsó teljes siker: '+new Date(st.lastSuccess).toLocaleString('hu-HU'):'');
  }
 }
 async function sync(interactive){
  if(busy)return false;
  busy=true;stop=false;status('Kapcsolatok és források ellenőrzése…',{done:0,total:0});
  let st=LS(),errors=[];
  try{
   // Interactive OAuth is performed before asynchronous Dropbox downloads.
   await token(!!interactive);
   dropVault();
   const parent=await folder();
   const files=await listFiles();
   need(files.length>0,'A HealthHub Dropboxban nincs tükrözhető egészségügyi fájl.');
   const map=st.map&&typeof st.map==='object'?{...st.map}:{};
   let done=0,uploaded=0,skipped=0,failed=0;
   status('Teljes forrásleltár kész.',{total:files.length,done:0});
   for(const entry of files){
    if(stop)throw Error('A szinkronizálás megszakítva, a korábbi sikeres másolatok megmaradnak.');
    status(safeName(entry.name)+' ellenőrzése…',{done,total:files.length});
    try{
     const result=await mirrorFile(entry,parent,map);
     map[entry.path]={fileId:result.fileId,hash:entry.hash,size:entry.size,
      source:'dropbox',mirroredAt:new Date().toISOString(),name:entry.name};
     result.skipped?skipped++:uploaded++;
    }catch(e){failed++;errors.push({path:entry.path,error:String(e.message||e).slice(0,160)});}
    done++;
    if(done%5===0||done===files.length)save({...st,map,updatedAt:new Date().toISOString()});
    status('Egészségügyi fájlok tükrözése…',{done,uploaded,skipped,failed});
   }
   st={...st,map,folderId:parent,updatedAt:new Date().toISOString(),
    lastResult:{total:files.length,uploaded,skipped,failed,errors:errors.slice(0,25)}};
   // Never mark incomplete runs green.
   if(!failed){
    const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    st.lastSuccess=new Date().toISOString();st.lastSuccessDay=day;
   }
   save(st);
   // Manifest itself is private and contains only source metadata, not credentials.
   const manifest={schema:'healthhub.google-drive.mirror/1',generatedAt:new Date().toISOString(),
    source:'HealthHub Dropbox App Folder',root:ROOT,driveFolder:DEST,
    counts:st.lastResult,success:failed===0,
    includedFiles:files.map(x=>({path:x.path,name:x.name,hash:x.hash,size:x.size,
     driveId:map[x.path]?.fileId||null,mirroredAt:map[x.path]?.mirroredAt||null}))};
   const m=JSON.stringify(manifest,null,2),mf={name:'HealthHub-AI-Mirror-Manifest.json',mime:'application/json'};
   const known=st.manifestId?{id:st.manifestId}:await find(mf.name,parent);
   const written=await writeBlob(mf,new Blob([m],{type:'application/json'}),parent,known?.id);
   await verifyFile(written.id,new Blob([m]).size);
   st.manifestId=written.id;save(st);
   status(failed?'⚠️ Részleges: '+uploaded+' feltöltve · '+failed+' hiba. Nem teljes szinkron.':
    '✓ Teljes Dropbox-egészségügyi állomány ellenőrizve: '+files.length+' fájl · '+uploaded+' frissítve · '+skipped+' változatlan.',
    {done:files.length,total:files.length,failed,uploaded,skipped});
   return !failed;
  }catch(e){
   status('⚠️ '+String(e.message||e).slice(0,200));return false;
  }finally{busy=false;status();}
 }
 function mount(){
  const host=d.getElementById('hhUnifiedCloudVaultCard')||d.getElementById('hhLenaCtx289');
  if(!host)return;
  if(d.getElementById('hhFullMirror730'))return;
  const box=d.createElement('section');box.id='hhFullMirror730';
  box.style.cssText='margin:13px 0;padding:13px;border:1px solid #668caf88;border-radius:15px;background:linear-gradient(120deg,#102942e8,#182f4be8);color:#e9f5ff;font:12px/1.55 system-ui';
  box.innerHTML='<strong style="font-size:14px;color:#e6f5ff">☁️ Google Drive · ChatGPT teljes egészségügyi tükör</strong>'+
   '<p style="margin:6px 0 9px;font-size:11px;color:#bfd4e7">A privát Dropbox /HealthHub egészségügyi fájljai, dokumentumai, fotói, naplói és profiladatai. Technikai tokenek és vezérlőfájlok kizárva. A Google Drive hozzáférésed szükséges.</p>'+
   '<button type="button" id="hhFullMirrorBtn730" style="border:1px solid #81b7d9;background:linear-gradient(110deg,#23799a,#3a6cad);color:white;border-radius:12px;padding:11px 12px;min-height:42px;font-weight:800;font-size:11px;cursor:pointer">🔄 Teljes egészségügyi Drive-szinkron</button>'+
   '<button type="button" id="hhFullMirrorStop730" style="border:1px solid #739ab3;background:#173047;color:#d9ebfc;border-radius:12px;padding:10px;min-height:42px;font-size:11px;margin-left:6px">Leállítás</button>'+
   '<p id="hhFullMirrorState730" role="status" aria-live="polite" style="font-size:10px;color:#b8d8eb;margin:8px 0 5px;overflow-wrap:anywhere"></p>'+
   '<small style="font-size:10px;color:#9fbcd2">Böngészőben futó delta-szinkron: offline, bezárt app vagy lejárt Google OAuth esetén nem fut automatikusan. Az igazi 24/7 napi frissítéshez külön szerveroldali hitelesítés és ütemezés szükséges. Privát Supabase-adatok külön bekötést igényelnek.</small>';
  host.append(box);
  d.getElementById('hhFullMirrorBtn730').onclick=()=>{void sync(true)};
  d.getElementById('hhFullMirrorStop730').onclick=()=>{stop=true};
  status();
 }
 function retryVisible(){if(!d.hidden)mount();}
 function auto(){
  const st=LS(),current=w.hhGoogleDriveConnectionStatus292?.();
  if(!st.lastSuccess||busy||!current?.connected)return;
  const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(st.lastSuccessDay!==day)void sync(false);
 }
 function start(){
  mount();w.setInterval(retryVisible,12000);
  w.addEventListener('focus',()=>{mount();auto()});
  d.addEventListener('visibilitychange',()=>{if(!d.hidden){mount();auto()}});
  w.setTimeout(()=>{mount();auto()},2500);
  w.HH_FULL_HEALTH_MIRROR_V730={version:VERSION,run:()=>sync(true),status:()=>({...LS().lastResult,lastSuccess:LS().lastSuccess||null}),
   model:{allowed,filename,mime}};
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window,document);
