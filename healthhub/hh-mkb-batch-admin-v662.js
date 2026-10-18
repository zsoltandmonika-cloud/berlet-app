(function(){
'use strict';
/* Admin-only, authorized, sequential, resumable browser PDF ingestion.
 * File text remains in the private Vault, never in code or telemetry.
 */
var ID='hhMkbBatch662', STYLE='hhMkbBatchCss662', loading=null, busy=false, current='';
function el(id){return document.getElementById(id)}
function p(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return p()==='monika'?'Mónika':'Zsolt'}
function engine(){return window.HH_KB_INGEST_V407}
function permitted(who){
 var a=window.HH_DAILY_HEALTH_SYNC_V319,st=a&&a.getStatus&&a.getStatus();
 return !!(a&&st&&st.authenticated&&Array.isArray(st.authorizedProfiles)&&st.authorizedProfiles.includes(who));
}
function assertActive(who){
 if(p()!==who)throw Error('Profilváltás: a feldolgozás megszakadt.');
 if(!permitted(who))throw Error('A Központi Health Vault hitelesített kapcsolata szükséges.');
}
function vaultLogin(){
 var service=window.HH_DAILY_HEALTH_SYNC_V319;
 if(service&&typeof service.openLogin==='function')service.openLogin();
 else show('⚠ A Health Vault bejelentkezés jelenleg nem érhető el. Frissítsd a HealthHubot.');
}
function beforeAction(who){
 if(who!==p()){show('⚠ A profil megváltozott.');return false}
 if(permitted(who))return true;
 show('🔐 Előbb jelentkezz be a Központi Health Vaultba. Sikeres belépés után nyomd meg ismét az eredeti művelet gombját.');
 vaultLogin();
 return false;
}
async function requireDrive(who){
 assertActive(who);
 var get=window.hhGetGoogleDriveToken292;
 if(typeof get!=='function')throw Error('A Google Drive modul hiányzik. Frissítsd a HealthHubot.');
 try{if(!await get(false))throw Error('missing')}
 catch(_){throw Error('Drive-engedélyezés szükséges. Használd a „Drive csatlakozás” gombot, majd indítsd újra az importot.')}
 assertActive(who);
}
async function reconnectDrive(){
 var button=el('hhMkbDrive662');
 if(button)button.disabled=true;
 try{
  var get=window.hhGetGoogleDriveToken292;
  if(typeof get!=='function')throw Error('A Google Drive modul hiányzik. Frissítsd a HealthHubot.');
  if(!await get(true))throw Error('Nem sikerült hozzáférést kérni.');
  show('✅ Google Drive kapcsolat aktív. Indítsd el újra a kívánt PDF-műveletet.');
 }catch(e){show('⚠ Drive-csatlakozás: '+String(e.message||e).slice(0,180))}
 finally{if(button)button.disabled=false;refreshConnections()}
}
async function refreshConnections(){
 var service=window.HH_DAILY_HEALTH_SYNC_V319,s=service&&service.getStatus&&service.getStatus();
 var va=el('hhMkbVaultState662'),dr=el('hhMkbDriveState662');
 if(va)va.textContent=!s||!s.configured?'⚠ Health Vault nincs konfigurálva':
  !s.authenticated?'🔒 Health Vault: bejelentkezés szükséges':
  permitted(p())?'✅ Health Vault: '+pname()+' jogosult':
  '⏳ Health Vault: profiljogosultság ellenőrzése szükséges';
 if(!dr)return;
 dr.textContent='⏳ Drive hozzáférés ellenőrzése…';
 try{
  var fn=window.hhGetGoogleDriveToken292;
  if(typeof fn!=='function')throw Error('not available');
  var token=await fn(false);
  if(el('hhMkbDriveState662')===dr)
   dr.textContent=token?'✅ Google Drive: kapcsolat aktív':'🔒 Google Drive: csatlakozás szükséges';
 }catch(_){if(el('hhMkbDriveState662')===dr)dr.textContent='🔒 Google Drive: csatlakozás szükséges'}
}
function styles(){
 if(el(STYLE))return;
 var tag=document.createElement('style');tag.id=STYLE;
 tag.textContent='#'+ID+'{border:1px solid rgba(166,216,235,.27);padding:14px;margin:0 0 13px;border-radius:18px;'+
 'background:linear-gradient(135deg,#102842,#1d4158);color:#e6f4fd;font:12px/1.5 system-ui}'+
 '#'+ID+' h3{font-size:15px;color:#fff;margin:0 0 5px}#'+ID+' p{font-size:11px;color:#bbd6e9;margin:6px 0 10px}'+
 '#'+ID+' button{min-height:38px;border:1px solid rgba(133,202,227,.45);border-radius:10px;padding:8px 11px;'+
 'background:#1b7190;color:#fff;font-size:11px;font-weight:800;cursor:pointer}'+
 '#'+ID+' button.secondary{background:#274459}#'+ID+' button:disabled{opacity:.48;cursor:default}'+
 '#'+ID+' .actions{display:flex;gap:7px;flex-wrap:wrap}#'+ID+' progress{width:100%;height:9px;margin:9px 0;accent-color:#53c8af}'+
 '#'+ID+' .report{white-space:pre-line;overflow-wrap:anywhere;font-size:11px;color:#d6e8f5;line-height:1.6}';
 document.head.appendChild(tag);
}
function show(s){var target=el('hhMkbReport662');if(target)target.textContent=s}
function draw(){
 var s=engine()&&engine().getState(),running=busy||!!(s&&s.running);
 for(const id of ['hhMkbStart662','hhMkbAudit662','hhMkbChars662']){
  var b=el(id);if(b)b.disabled=running;
 }
 var stop=el('hhMkbStop662');if(stop)stop.disabled=!(s&&s.running);
 var progress=el('hhMkbProgress662');
 if(progress){progress.max=Math.max(1,Number(s&&s.total)||1);progress.value=Number(s&&s.done)||0}
 var badge=el('hhMkbBadge662');if(badge)badge.textContent='Aktív profil: '+pname();
 if(s&&s.running)show('⏳ '+s.done+'/'+s.total+' · '+(s.current||'Feldolgozás folyamatban…')+
  (s.error?'\n⚠ '+s.error:'')+'\nA böngészőlap nyitva tartása szükséges. Újraindításkor a teljes dokumentumok kimaradnak.');
}
function mount(){
 var admin=el('haOv'),body=el('haBody');
 if(!admin||!body||!admin.classList.contains('on')||el(ID))return;
 styles();
 var panel=document.createElement('section');panel.id=ID;
 panel.innerHTML='<h3>📚 Medical Knowledge Base 2.0 · Feldolgozás és adatminőség</h3>'+
  '<p id="hhMkbBadge662">Aktív profil: '+pname()+'</p>'+
  '<p>Google Drive eredeti → SHA-256 → teljes PDF oldalszöveg és képek → privát Supabase → oldalszintű karakter- és SHA-256-visszaellenőrzés.</p>'+
  '<div class="connections" style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:12px 0;padding:10px;border-radius:12px;background:rgba(7,22,38,.26)">'+
  '<span id="hhMkbVaultState662">🔒 Health Vault ellenőrzése…</span><button class="secondary" id="hhMkbVault662" type="button">🔐 Vault belépés</button>'+
  '<span id="hhMkbDriveState662">🔒 Google Drive ellenőrzése…</span><button class="secondary" id="hhMkbDrive662" type="button">🔗 Drive csatlakozás</button></div>'+
  '<div class="actions"><button id="hhMkbStart662" type="button">▶ Összes PDF feldolgozása</button>'+
  '<button id="hhMkbAudit662" class="secondary" type="button">🔍 Forrásaudit</button>'+
  '<button id="hhMkbChars662" class="secondary" type="button">🔢 Character Count QA</button>'+
  '<button id="hhMkbStop662" class="secondary" type="button" disabled>⏸ Megállítás</button></div>'+
  '<progress id="hhMkbProgress662" value="0" max="1"></progress>'+
  '<div class="report" id="hhMkbReport662" role="status" aria-live="polite">Feldolgozás még nem indult. A Vault- és Drive-bejelentkezés szükséges. A folyamat kizárólag az aktív profil engedélyezett archívumából olvas.</div>';
 body.insertBefore(panel,body.firstChild);
 el('hhMkbVault662').addEventListener('click',vaultLogin);
 el('hhMkbDrive662').addEventListener('click',reconnectDrive);
 el('hhMkbStart662').addEventListener('click',start);
 el('hhMkbAudit662').addEventListener('click',audit);
 el('hhMkbChars662').addEventListener('click',count);
 el('hhMkbStop662').addEventListener('click',()=>{if(engine())engine().stop();show('⏸ Megállítás kérve. Az aktuális fájl biztonságos lezárása folyamatban.');});
 draw();refreshConnections();
}
function script(src){
 return new Promise((resolve,reject)=>{
  var tag=document.createElement('script');tag.src=src;tag.async=false;
  tag.onload=resolve;tag.onerror=()=>reject(Error('A privát PDF modul nem tölthető be.'));
  document.head.appendChild(tag);
 });
}
function load(){
 if(engine())return Promise.resolve(engine());
 if(loading)return loading;
 loading=Promise.resolve().then(()=>window.HH_KB_CORE_V407?null:script('./knowledge-v407-core.js?v=662'))
 .then(()=>engine()?null:script('./knowledge-v407-ingest.js?v=667-descope'))
 .then(()=>{if(!engine())throw Error('A feldolgozómotor nem indult.');return engine()})
 .catch(e=>{loading=null;throw e});
 return loading;
}
async function audit(){
 if(busy)return;
 var who=p();if(!beforeAction(who))return;
 busy=true;draw();
 try{
  await requireDrive(who);await load();assertActive(who);
  show('A privát archívum egyeztetése…');
  var x=await engine().audit(who);
  if(p()!==who)throw Error('Profilváltozás.');
  show('Profil: '+pname()+'\nDrive PDF: '+x.drive+'\nOpcionálisan kihagyva: '+x.excluded+'\nKötelező PDF: '+x.eligible+'\nTeljesnek jelölt: '+x.complete+
   '\nÚj: '+x.new+'\nRészleges / ellenőrizendő: '+x.partial+
   '\nDuplikátum-hivatkozások: '+x.duplicates);
 }catch(e){show('⚠ '+String(e.message||e).slice(0,200))}
 finally{busy=false;draw()}
}
async function start(){
 if(busy||engine()&&engine().getState().running)return;
 var who=p();if(!beforeAction(who))return;
 busy=true;draw();
 try{
  await requireDrive(who);await load();assertActive(who);
  show('A feldolgozandó PDF-ek listájának ellenőrzése…');
  var x=await engine().run(who,{maxDocs:1000});
  if(p()!==who)throw Error('Profilváltozás.');
  show('Feldolgozási kör lezárult · '+pname()+'\nForrások: '+x.drive+'\nKihagyva: '+x.excluded+'\nKötelező: '+x.eligible+
   '\nTeljesnek jelölt: '+x.complete+'\nÚj: '+x.new+
   '\nRészleges / hibás: '+x.partial+
   '\nA tényleges szöveg-integ­ritást a Character Count QA mutatja. A másik profilt külön, profilváltás után lehet ellenőrizni.');
 }catch(e){show('⚠ Feldolgozás nem fejeződött be: '+String(e.message||e).slice(0,200))}
 finally{busy=false;draw()}
}
async function count(){
 if(busy)return;
 var who=p();if(!beforeAction(who))return;
 busy=true;draw();
 try{
  assertActive(who);
  var api=window.HH_DAILY_HEALTH_SYNC_V319,st=api.getStatus();
  var accessible=['monika','zsolt'].filter(x=>st.authorizedProfiles.includes(x));
  async function all(table,cols,key,extra){
   var rows=[],offset=0;
   while(offset<20000){
    if(!permitted(who)||p()!==who)throw Error('A hozzáférés időközben megváltozott.');
    var url='/rest/v1/'+table+'?select='+cols+'&profile_key=eq.'+encodeURIComponent(key)+
      (extra||'')+'&limit=500&offset='+offset;
    var part=await api.request(url,{method:'GET'});
    if(!Array.isArray(part))throw Error('Nem ellenőrizhető a lekérdezés.');
    rows.push(...part);offset+=500;
    if(part.length<500)break;
   }
   return rows;
  }
  var sections=[],grand={files:0,originals:0,excluded:0,indexed:0,canonical:0,verified:0,expected:0,stored:0,pages:0,pagesVerified:0,unverified:0};
  for(const key of accessible){
   var pair=await Promise.all([
     all('hh_mkb_sources','id,source_metadata',key,'&source_kind=eq.pdf&origin=eq.google_drive'),
     all('hh_kb_documents','id,mkb_source_id,duplicate_of,status,total_pages,pages_verified,extracted_characters,stored_characters,text_integrity_status',key)
   ]);
   var sources=pair[0],skipped=new Set(sources.filter(x=>x.source_metadata&&
     x.source_metadata.ingest_scope==='excluded').map(x=>x.id));
    var covered=new Set(sources.map(x=>x.id));
    var sourceCount=sources.length-skipped.size;
    var docs=pair[1].filter(x=>covered.has(x.mkb_source_id)&&!skipped.has(x.mkb_source_id));
    var canonical=docs.filter(x=>!x.duplicate_of);
   var verified=canonical.filter(x=>x.status==='complete'&&
      x.text_integrity_status==='verified'&&x.total_pages>0&&x.pages_verified===x.total_pages).length;
   var expected=canonical.reduce((n,x)=>n+Number(x.extracted_characters||0),0);
   var stored=canonical.reduce((n,x)=>n+Number(x.stored_characters||0),0);
   var pages=canonical.reduce((n,x)=>n+Number(x.total_pages||0),0);
   var pageOK=canonical.reduce((n,x)=>n+Number(x.pages_verified||0),0);
   var unverified=docs.filter(x=>x.status!=='complete').length;
   var good=sourceCount>0&&sourceCount===docs.length&&verified===canonical.length&&
       unverified===0&&pageOK===pages&&stored===expected;
   sections.push((key==='monika'?'MÓNIKA':'ZSOLT')+
    ' · kötelező PDF: '+docs.length+'/'+sourceCount+' · kihagyva: '+skipped.size+
    ' · canonical: '+canonical.length+' · QA: '+verified+
    '\nEredeti: '+expected.toLocaleString('hu-HU')+
    ' · Supabase: '+stored.toLocaleString('hu-HU')+
    ' · Δ '+(stored-expected).toLocaleString('hu-HU')+
    ' · oldalak: '+pageOK+'/'+pages+
    '\n'+(good?'✓ Teljes szöveg-ellenőrzés':'⚠ Feldolgozás vagy review hiányos'));
   grand.files+=sourceCount;grand.originals+=sources.length;grand.excluded+=skipped.size;grand.indexed+=docs.length;grand.canonical+=canonical.length;
   grand.verified+=verified;grand.expected+=expected;grand.stored+=stored;
   grand.pages+=pages;grand.pagesVerified+=pageOK;grand.unverified+=unverified;
  }
  if(p()!==who||!permitted(who))throw Error('A hozzáférés időközben megváltozott.');
  var delta=grand.stored-grand.expected;
  var percent=grand.expected?100*Math.abs(delta)/grand.expected:NaN;
  var allDone=grand.files>0&&accessible.length===2&&grand.files===grand.indexed&&
    grand.verified===grand.canonical&&grand.unverified===0&&
    grand.pagesVerified===grand.pages&&delta===0;
  show('🔢 CHARACTER COUNT · Teljes HealthHub'+
   '\nÖsszes eredeti PDF: '+grand.originals+' · opcionálisan kihagyva: '+grand.excluded+'\nKötelező PDF: '+grand.files+' · indexelt: '+grand.indexed+
   '\nEllenőrzött egyedi dokumentum: '+grand.verified+'/'+grand.canonical+
   '\nEllenőrzött oldalak: '+grand.pagesVerified+'/'+grand.pages+
   '\nEREDETI Unicode karakter: '+grand.expected.toLocaleString('hu-HU')+
   '\nSUPABASE Unicode karakter: '+grand.stored.toLocaleString('hu-HU')+
   '\nKÜLÖNBSÉG: '+delta.toLocaleString('hu-HU')+
   ' ('+(Number.isFinite(percent)?percent.toFixed(5)+'%':'nincs összehasonlítható szöveg')+')'+
   '\n'+(allDone?'✓ Szöveges adat-integritás: igazolt (OCR/képek klinikai review-ja külön követelmény).':
   '⚠ Nem teljes körű adat-integritási igazolás. A karakteregyezés önmagában nem elegendő.')+
   '\n\n'+sections.join('\n\n')+
   (accessible.length!==2?'\n\nA másik profilhoz nem volt hitelesített jogosultság.':''));
 }catch(e){show('⚠ Karakteraudit sikertelen: '+String(e.message||e).slice(0,220))}
 finally{busy=false;draw()}
}
window.addEventListener('healthhub:kb-progress',draw);
window.addEventListener('healthhub:profile-changed',()=>{draw();refreshConnections()});
window.addEventListener('healthhub:central-auth-changed',refreshConnections);
window.addEventListener('focus',refreshConnections);
var started=false;
function init(){
 if(started)return;started=true;
 var n=0;
 (function connect(){
  var ov=el('haOv');
  if(!ov){if(++n<30)setTimeout(connect,400);return}
  new MutationObserver(mount).observe(ov,{attributes:true,attributeFilter:['class']});
  var body=el('haBody');
  if(body)new MutationObserver(mount).observe(body,{childList:true});
  mount();
 })();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();