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
 if(typeof window.hhGetGoogleDriveToken292!=='function')throw Error('Google Drive archívum csatlakozás szükséges.');
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
  '<div class="actions"><button id="hhMkbStart662" type="button">▶ Összes PDF feldolgozása</button>'+
  '<button id="hhMkbAudit662" class="secondary" type="button">🔍 Forrásaudit</button>'+
  '<button id="hhMkbChars662" class="secondary" type="button">🔢 Character Count QA</button>'+
  '<button id="hhMkbStop662" class="secondary" type="button" disabled>⏸ Megállítás</button></div>'+
  '<progress id="hhMkbProgress662" value="0" max="1"></progress>'+
  '<div class="report" id="hhMkbReport662" role="status" aria-live="polite">Feldolgozás még nem indult. A Vault- és Drive-bejelentkezés szükséges. A folyamat kizárólag az aktív profil engedélyezett archívumából olvas.</div>';
 body.insertBefore(panel,body.firstChild);
 el('hhMkbStart662').addEventListener('click',start);
 el('hhMkbAudit662').addEventListener('click',audit);
 el('hhMkbChars662').addEventListener('click',count);
 el('hhMkbStop662').addEventListener('click',()=>{if(engine())engine().stop();show('⏸ Megállítás kérve. Az aktuális fájl biztonságos lezárása folyamatban.');});
 draw();
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
 .then(()=>engine()?null:script('./knowledge-v407-ingest.js?v=662-integrity'))
 .then(()=>{if(!engine())throw Error('A feldolgozómotor nem indult.');return engine()})
 .catch(e=>{loading=null;throw e});
 return loading;
}
async function audit(){
 if(busy)return;
 var who=p();busy=true;draw();
 try{
  assertActive(who);await load();assertActive(who);
  show('A privát archívum egyeztetése…');
  var x=await engine().audit(who);
  if(p()!==who)throw Error('Profilváltozás.');
  show('Profil: '+pname()+'\nDrive PDF: '+x.drive+'\nTeljesnek jelölt: '+x.complete+
   '\nÚj: '+x.new+'\nRészleges / ellenőrizendő: '+x.partial+
   '\nDuplikátum-hivatkozások: '+x.duplicates);
 }catch(e){show('⚠ '+String(e.message||e).slice(0,200))}
 finally{busy=false;draw()}
}
async function start(){
 if(busy||engine()&&engine().getState().running)return;
 var who=p();busy=true;draw();
 try{
  assertActive(who);await load();assertActive(who);
  show('A feldolgozandó PDF-ek listájának ellenőrzése…');
  var x=await engine().run(who,{maxDocs:1000});
  if(p()!==who)throw Error('Profilváltozás.');
  show('Feldolgozási kör lezárult · '+pname()+'\nForrások: '+x.drive+
   '\nTeljesnek jelölt: '+x.complete+'\nÚj: '+x.new+
   '\nRészleges / hibás: '+x.partial+
   '\nA tényleges szöveg-integ­ritást a Character Count QA mutatja. A másik profilt külön, profilváltás után lehet ellenőrizni.');
 }catch(e){show('⚠ Feldolgozás nem fejeződött be: '+String(e.message||e).slice(0,200))}
 finally{busy=false;draw()}
}
async function count(){
 if(busy)return;
 var who=p();busy=true;draw();
 try{
  assertActive(who);
  var api=window.HH_DAILY_HEALTH_SYNC_V319;
  var rows=[],offset=0;
  while(offset<20000){
   assertActive(who);
   var part=await api.request('/rest/v1/hh_kb_documents?select=id,duplicate_of,status,total_pages,pages_verified,extracted_characters,stored_characters,text_integrity_status'+
    '&profile_key=eq.'+encodeURIComponent(who)+'&order=id.asc&limit=500&offset='+offset,{method:'GET'});
   if(!Array.isArray(part))throw Error('Nem ellenőrizhető a dokumentumlista.');
   rows.push(...part);offset+=500;
   if(part.length<500)break;
  }
  var originals=rows.filter(x=>!x.duplicate_of),verified=originals.filter(x=>x.text_integrity_status==='verified'&&x.pages_verified===x.total_pages&&x.total_pages>0);
  var a=originals.reduce((n,x)=>n+Number(x.extracted_characters||0),0),
      b=originals.reduce((n,x)=>n+Number(x.stored_characters||0),0),
      pages=originals.reduce((n,x)=>n+Number(x.total_pages||0),0),
      pagesVerified=originals.reduce((n,x)=>n+Number(x.pages_verified||0),0);
  if(who!==p()||!permitted(who))throw Error('Hozzáférés megváltozott.');
  var d=b-a,pct=a>0?(100*Math.abs(d)/a).toFixed(5)+'%':'nem értelmezhető';
  show('🔢 Character Count & Data Integrity · '+pname()+
   '\nIndexelt dokumentum: '+rows.length+' (ebből '+(rows.length-originals.length)+' hivatkozott duplikátum)'+
   '\nCanonical PDF-ek: '+originals.length+' · SHA/karakter szerint ellenőrzött: '+verified.length+
   '\nOldalak: '+pages+' · ellenőrzött: '+pagesVerified+
   '\nEredeti szöveg (Unicode karakter): '+a.toLocaleString('hu-HU')+
   '\nSupabase visszaolvasás (karakter): '+b.toLocaleString('hu-HU')+
   '\nEltérés: '+d.toLocaleString('hu-HU')+' ('+pct+')'+
   '\n'+(originals.length>0&&verified.length===originals.length&&a===b?'✓ Szöveg-integ­ritás: ellenőrzött. OCR és képi leletek külön ellenőrzést igényelhetnek.':
      '⚠ Még NEM teljes a feldolgozás / oldalellenőrzés. A kis karaktereltérés önmagában nem siker.')+
   '\nA globális összehasonlításhoz mindkét profilt külön kell lefuttatni.');
 }catch(e){show('⚠ Karakterszám-ellenőrzés: '+String(e.message||e).slice(0,200))}
 finally{busy=false;draw()}
}
window.addEventListener('healthhub:kb-progress',draw);
window.addEventListener('healthhub:profile-changed',draw);
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