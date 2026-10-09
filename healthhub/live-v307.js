(function(){
'use strict';
/* HealthHub v307 — Tünetnapló V1.
   Structured symptom/episode journal. Dropbox /HealthHub/master is canonical;
   localStorage is offline cache only. Voice input deliberately deferred to V2. */

var BUILD='v307', PAGE='hhSymptomJournal307', WHEEL='hhSymptomWheel307', EDIT='hhSymptomCatalogEditor307';
var LOCAL='hh-symptom-journal-v1', CLOUD='/HealthHub/master/symptoms.json';
var audioCtx=null, wheelState=null, draft=null, selectedDays=30, selectedTrendSymptom='', editorCategory='symptoms', editingId=null;

var SYMPTOMS=['Fejfájás','Szédülés','Orrdugulás','Gyomorpanasz','Hátfájás','Mellkasi kellemetlenség','Láz','Allergiás panasz','Sérülés','Egyéb'];
var LOCATIONS={
 'Fejfájás':['Homlok','Fejtető','Homlok / fejtető','Bal halánték','Jobb halánték','Mindkét halánték','Tarkó','Féloldali','Teljes fej','Nem meghatározható'],
 'Orrdugulás':['Bal orrjárat','Jobb orrjárat','Mindkét oldal','Orr / arcüreg','Nem meghatározható'],
 'Gyomorpanasz':['Gyomorszáj','Has felső része','Has alsó része','Bal oldal','Jobb oldal','Teljes has','Nem meghatározható'],
 'Hátfájás':['Nyak','Lapockák között','Derék','Keresztcsont','Bal oldal','Jobb oldal','Nem meghatározható'],
 'Mellkasi kellemetlenség':['Mellkas közepe','Bal mellkas','Jobb mellkas','Szegycsont mögött','Nem meghatározható'],
 'Sérülés':['Fej','Nyak','Váll','Kar / kéz','Mellkas','Hát','Csípő','Láb / lábfej','Egyéb'],
 'default':['Fej','Nyak','Mellkas','Has','Hát','Kar / kéz','Láb / lábfej','Egész test','Nem meghatározható']
};
var ACTIONS=['Gyógyszer','Pihenés','Folyadék','Hideg borogatás','Meleg borogatás','Étkezés','Mozgás / séta','Egyéb','Semmi'];
var MEDS=['Advil Ultra Forte','Algoflex','Panadol','Aspirin','Egyéb','Nem vettem be'];
var DOSES=['100 mg','200 mg','400 mg','500 mg','600 mg','1 adag','Egyéb','—'];
var OUTCOMES=['Megszűnt','Jelentősen javult','Javult','Változatlan','Rosszabb lett','Folyamatban'];
var RESPONSE=['15 perc','30 perc','45 perc','60 perc','90 perc','2 óra','3 óra','4 óra','Nem ismert'];
var CATALOG_KEYS={
 symptoms:{label:'Tünetek',base:function(){return SYMPTOMS}},
 locations:{label:'Hely / jelleg',base:function(){return LOCATIONS.default}},
 actions:{label:'Gyógymódok',base:function(){return ACTIONS}},
 medications:{label:'Eseti gyógyszerek',base:function(){return MEDS}},
 doses:{label:'Dózisok',base:function(){return DOSES}},
 outcomes:{label:'Kimenetel',base:function(){return OUTCOMES}},
 responses:{label:'Hatásidő',base:function(){return RESPONSE}}
};
function emptyCatalog(){return {symptoms:[],locations:[],actions:[],medications:[],doses:[],outcomes:[],responses:[]}}
function normalizeCatalog(x){
 var out=emptyCatalog(),src=x&&typeof x==='object'?x:{};
 Object.keys(out).forEach(function(k){
  var seen=new Set();
  out[k]=(Array.isArray(src[k])?src[k]:[]).map(function(v){return String(v||'').trim()}).filter(function(v){
   var key=v.toLocaleLowerCase('hu-HU');if(!v||seen.has(key))return false;seen.add(key);return true;
  });
 });
 return out;
}
function customCatalog(){return normalizeCatalog(pkgLocal().catalog)}
function mergeUnique(a,b){
 var out=[],seen=new Set();
 (a||[]).concat(b||[]).forEach(function(v){
  v=String(v||'').trim();var key=v.toLocaleLowerCase('hu-HU');
  if(v&&!seen.has(key)){seen.add(key);out.push(v)}
 });
 return out;
}
function valuesFor(key,base){
 var cat=customCatalog();
 return mergeUnique(base||(CATALOG_KEYS[key]&&CATALOG_KEYS[key].base?CATALOG_KEYS[key].base():[]),cat[key]||[]);
}


function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function now(){return new Date().toISOString()}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function uuid(){try{return crypto.randomUUID()}catch(e){return 'sym-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}}
function dtLocal(iso){var d=new Date(iso||Date.now());if(isNaN(d.getTime()))d=new Date();var z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)}
function dateParts(iso){
 var d=new Date(iso||Date.now());if(isNaN(d.getTime()))d=new Date();
 return {year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate(),hour:d.getHours(),minute:d.getMinutes()};
}
function pad2(n){return String(n).padStart(2,'0')}
function setDatePart(field,value){
 var d=new Date(draft&&draft.eventAt||Date.now());if(isNaN(d.getTime()))d=new Date();
 if(field==='year')d.setFullYear(Number(value));
 if(field==='month'){var oldDay=d.getDate();d.setDate(1);d.setMonth(Number(value)-1);d.setDate(Math.min(oldDay,new Date(d.getFullYear(),Number(value),0).getDate()))}
 if(field==='day')d.setDate(Number(value));
 if(field==='hour')d.setHours(Number(value));
 if(field==='minute')d.setMinutes(Number(value));
 draft.eventAt=d.toISOString();
}
function fmtDate(iso){var d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleString('hu-HU',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
function locations(){return valuesFor('locations',LOCATIONS[draft&&draft.symptom]||LOCATIONS.default)}
function defaultDraft(){
 return {eventAt:now(),symptom:'Fejfájás',location:'Homlok / fejtető',severity:6,action:'Gyógyszer',medication:'Advil Ultra Forte',dose:'400 mg',outcome:'Megszűnt',response:'60 perc',measurement:null,notes:''};
}
function askPrefill351(data){
 if(!data||typeof data.question!=='string')return null;
 var raw=data.question.trim().slice(0,550);
 if(raw.length<3)return null;
 var t=raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 var d={eventAt:now(),symptom:'Egyéb',location:'',severity:null,action:'',
  medication:'',dose:'',outcome:'',response:'',measurement:null,
  notes:'Ask Léna kérdés (ellenőrizd): '+raw,askPrefilled351:true};
 var patterns=[[/fejfaj|fejem faj|migren/,'Fejfájás'],[/szedul/,'Szédülés'],
  [/orrdugul/,'Orrdugulás'],[/gyomor|hasam faj|hasfaj|hanyinger/,'Gyomorpanasz'],
  [/hatfaj|derekam faj/,'Hátfájás'],[/mellkasi faj|mellkasom faj|mellkasi nyom/,'Mellkasi kellemetlenség'],
  [/lazam van|lazas/,'Láz'],[/allergi|pollen/,'Allergiás panasz'],
  [/megserult|megutottem|kificamod|megrandult/,'Sérülés']];
 patterns.some(function(x){if(x[0].test(t)){d.symptom=x[1];return true}return false});
 var cats=valuesFor('symptoms',SYMPTOMS);
 if(d.symptom==='Egyéb'){
  var found=cats.filter(function(x){return x.length>4&&x!=='Egyéb'&&t.indexOf(x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''))>=0});
  if(found.length)d.symptom=found[0];
 }
 if(!cats.includes(d.symptom))d.symptom='Egyéb';
 var locs=valuesFor('locations',LOCATIONS[d.symptom]||LOCATIONS.default);
 [[/homlok.*fejtet|fejtet.*homlok/,'Homlok / fejtető'],[/homlok/,'Homlok'],
  [/fejtet/,'Fejtető'],[/tarko/,'Tarkó'],[/bal halantek/,'Bal halánték'],
  [/jobb halantek/,'Jobb halánték'],[/boka|labfej|labam/,'Láb / lábfej'],
  [/bal mellkas/,'Bal mellkas'],[/jobb mellkas/,'Jobb mellkas']].some(function(x){
   if(x[0].test(t)&&locs.includes(x[1])){d.location=x[1];return true}return false});
 var intensity=t.match(/\b(10|[0-9])\s*\/\s*10\b/);
 if(intensity)d.severity=Number(intensity[1]);
 // NEVER guess medication/treatment from the assistant's research answer.
 if(/bevettem|vettem be/.test(t)){
  var meds=valuesFor('medications',MEDS);
  var med=meds.find(function(x){return x!=='Egyéb'&&x!=='Nem vettem be'&&t.indexOf(x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''))>=0});
  if(med){
   d.action='Gyógyszer';d.medication=med;
   var dose=t.match(/\b(\d{2,4})\s*mg\b/);
   if(dose&&valuesFor('doses',DOSES).includes(dose[1]+' mg'))d.dose=dose[1]+' mg';
  }
 }
 if(!d.action&&/jegeltem/.test(t))d.action='Hideg borogatás';
 if(!d.action&&/pihentem/.test(t))d.action='Pihenés';
 if(/mar elmult|megszunt/.test(t))d.outcome='Megszűnt';
 else if(/javult|enyhult/.test(t))d.outcome='Javult';
 return d;
}
function pkgLocal(){
 try{
  var x=JSON.parse(localStorage.getItem(LOCAL)||'null');
  if(x&&Array.isArray(x.events)){x.catalog=normalizeCatalog(x.catalog);return x}
 }catch(e){}
 return {schema:'healthhub.master.symptoms/1',updatedAt:null,events:[],catalog:emptyCatalog()};
}
function writeLocal(x){x.schema='healthhub.master.symptoms/1';x.updatedAt=now();localStorage.setItem(LOCAL,JSON.stringify(x));return x}
function connected(){try{return !!(window.HH_DROPBOX_VAULT&&window.HH_DROPBOX_VAULT.connected&&window.HH_DROPBOX_VAULT.connected())}catch(e){return false}}
function mergeEvents(a,b){
 var map=new Map();
 (a||[]).concat(b||[]).forEach(function(x){
  if(!x||!x.id)return;
  var old=map.get(x.id),ot=Date.parse(old&&old.updatedAt||old&&old.createdAt||0),nt=Date.parse(x.updatedAt||x.createdAt||0);
  if(!old||nt>=ot)map.set(x.id,x);
 });
 return Array.from(map.values()).sort(function(x,y){return Date.parse(y.eventAt||0)-Date.parse(x.eventAt||0)});
}
async function pullCloud(){
 if(!connected())return pkgLocal();
 try{
  var remote=null;
  try{remote=await window.HH_DROPBOX_VAULT.downloadJson(CLOUD)}catch(e){if(!(e&&e.status===409))throw e}
  var local=pkgLocal();
  if(remote){
   if(Array.isArray(remote.events))local.events=mergeEvents(local.events,remote.events);
   var lc=normalizeCatalog(local.catalog),rc=normalizeCatalog(remote.catalog);
   Object.keys(lc).forEach(function(k){lc[k]=mergeUnique(lc[k],rc[k])});
   local.catalog=lc;
   writeLocal(local);
  }
  return local;
 }catch(e){console.warn('HealthHub Tünetnapló cloud pull',e);return pkgLocal()}
}
async function pushCloud(){
 if(!connected())return false;
 var x=pkgLocal();x.updatedAt=now();
 await window.HH_DROPBOX_VAULT.uploadJson(CLOUD,x);
 return true;
}
function initAudio(){
 try{
  if(!audioCtx){var A=window.AudioContext||window.webkitAudioContext;if(A)audioCtx=new A()}
  if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
 }catch(e){}
}
function tick(){
 try{
  if(audioCtx){
   var o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
   o.type='square';o.frequency.setValueAtTime(1180,t);g.gain.setValueAtTime(.018,t);g.gain.exponentialRampToValueAtTime(.0001,t+.018);
   o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+.019);
  }
 }catch(e){}
 try{navigator.vibrate&&navigator.vibrate(7)}catch(e){}
}
function tada(){
 try{
  initAudio();if(!audioCtx)return;var t=audioCtx.currentTime+.015;
  function note(f,s,d,v,type){var o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type||'triangle';o.frequency.setValueAtTime(f,s);g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(v,s+.012);g.gain.exponentialRampToValueAtTime(.0001,s+d);o.connect(g);g.connect(audioCtx.destination);o.start(s);o.stop(s+d+.03)}
  note(523.25,t,.18,.075);note(659.25,t+.11,.28,.065);note(783.99,t+.11,.32,.060);note(1046.5,t+.24,.42,.055,'sine');
 }catch(e){}
 try{navigator.vibrate&&navigator.vibrate([20,28,20,28,42])}catch(e){}
}
function severityLabel(n){
 n=Number(n)||0;
 if(n===0)return '0 · nincs';
 if(n<=2)return n+' · enyhe';
 if(n<=5)return n+' · közepes';
 if(n<=7)return n+' · erős';
 return n+' · nagyon erős';
}
function choice(field,label,value,icon){
 return '<button type="button" class="hhSJChoice" data-field="'+field+'"><span class="hhSJCI">'+icon+'</span><span><small>'+esc(label)+'</small><b data-value="'+field+'">'+esc(value)+'</b></span><span class="hhSJCaret">›</span></button>';
}
function ensureStyle(){
 if(document.getElementById('hh-v307-style'))return;
 var s=document.createElement('style');s.id='hh-v307-style';s.textContent=
 '#health .quick.hhSJQuick307{grid-template-columns:repeat(7,minmax(0,1fr));gap:1px}#health .quick.hhSJQuick307 .qbox{width:40px;height:40px;padding:8px}#health .quick.hhSJQuick307 .q span{font-size:7.5px}.hhSJLaunch307 .qbox{background:linear-gradient(135deg,var(--a),var(--a2))!important}.hhSJLaunch307 svg{width:24px;height:24px}'+
 '#'+PAGE+'{min-height:100vh;background:linear-gradient(180deg,color-mix(in srgb,var(--a) 5%,#eef7fb),#f7fbfd);padding-bottom:76px}.hhSJHero.hero{height:205px!important;background-image:var(--hh-role-atlas)!important;background-size:auto 200%!important;background-position:left top!important;background-repeat:no-repeat!important;color:#0b2d50!important;position:relative!important;overflow:hidden!important}.hhSJHero:after{content:"";position:absolute;inset:0;z-index:2;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0) 46%,rgba(255,255,255,.10) 70%,rgba(255,255,255,.22) 100%)!important;pointer-events:none}.hhSJHero .heroCopy,.hhSJHero .heroBtns,.hhSJHero .hhSJBuild,.hhSJHero .hhSJProfileSwitch307{z-index:7}.hhSJHero .heroCopy{left:56%;right:34px;top:42%;color:#0b2d50!important;text-shadow:0 1px 0 rgba(255,255,255,.92)}.hhSJHero .heroCopy h1,.hhSJHero .screenTitle,.hhSJHero .date,.hhSJHero .weather,.hhSJHero .nameday{color:#0b2d50!important;text-shadow:0 1px 0 rgba(255,255,255,.92)}.hhSJHero .round{color:#173f61!important;background:rgba(255,255,255,.78)!important;box-shadow:0 4px 14px rgba(40,70,100,.10)!important}.hhSJHero .hhSJBack{font-size:24px;line-height:1}.hhSJProfileSwitch307{position:absolute;left:14px;bottom:13px;display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.84);border-radius:999px;padding:7px 11px;background:rgba(255,255,255,.90);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 5px 16px rgba(25,58,82,.14);color:var(--a);font:900 11px/1 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}.hhSJProfileSwitch307:active{transform:scale(.96)}.hhSJProfileSwitch307 .swap{font-size:14px}.hhSJHero .hhSJBuild{position:absolute;right:10px;bottom:10px;z-index:8;font-size:7px;font-weight:900;background:#ffffffdc;color:#2b5873;padding:5px 8px;border-radius:999px;text-shadow:none}.hhSJBody{padding:0 10px 10px;max-width:430px;margin:-13px auto 0;position:relative;z-index:10;background:linear-gradient(180deg,var(--wash2),var(--wash));border-radius:24px 24px 0 0}.hhSJCard{background:#fff;border:1px solid #e3edf2;border-radius:18px;padding:11px;margin-bottom:9px;box-shadow:0 7px 18px rgba(31,69,95,.055)}.hhSJCard h3{font-size:15px;margin:0 0 2px;color:#173f62}.hhSJCard>small{font-size:10px;color:#788e9e}.hhSJTime{margin-top:10px}.hhSJTimeLabel{font-size:9px;font-weight:900;color:#8094a3;letter-spacing:.04em;margin:0 0 5px 2px}.hhSJDateGrid{display:grid;grid-template-columns:1.18fr .8fr .8fr;gap:6px}.hhSJClockGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}.hhSJTimePart{min-height:54px;border:1px solid #dbe7ee;border-radius:13px;background:#fbfdfe;color:#294e69;padding:7px 6px;text-align:center}.hhSJTimePart small{display:block;font-size:8px;color:#8799a6;font-weight:900;text-transform:uppercase}.hhSJTimePart b{display:block;font-size:20px;margin-top:2px;font-variant-numeric:tabular-nums}.hhSJTimeSep{font-size:10px;color:#8295a4;text-align:center;margin-top:5px}.hhSJGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.hhSJChoice{min-height:66px;border:1px solid #e0eaf0;border-radius:14px;background:#fbfdfe;color:#294e69;padding:8px;display:grid;grid-template-columns:28px 1fr 12px;gap:6px;align-items:center;text-align:left}.hhSJChoice .hhSJCI{font-size:20px}.hhSJChoice small{display:block;font-size:9px;color:#8295a4;font-weight:800}.hhSJChoice b{display:block;font-size:13px;margin-top:2px;line-height:1.15}.hhSJCaret{font-size:19px;color:var(--a)}.hhSJMeasurement{margin-top:8px;padding:10px;border-radius:13px;background:color-mix(in srgb,var(--a) 7%,#f7fbfd);border:1px solid color-mix(in srgb,var(--a) 18%,#dfe9ef);font-size:10px;color:#49677c}.hhSJMeasurement b{display:block;font-size:13px;color:#244d68;margin-bottom:2px}.hhSJNotes{width:100%;box-sizing:border-box;margin-top:8px;border:1px solid #dce7ed;border-radius:13px;padding:11px;min-height:76px;resize:vertical;font:inherit;font-size:12px;color:#294e69}.hhSJSave{width:100%;height:54px;border:0;border-radius:15px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-size:14px;font-weight:950;box-shadow:0 8px 18px color-mix(in srgb,var(--a) 25%,transparent)}.hhSJSave:disabled{opacity:.55}.hhSJEditActions{display:none;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.hhSJEditActions.on{display:grid}.hhSJEditActions button{height:42px;border-radius:12px;font-size:10px;font-weight:950}.hhSJCancelEdit{border:1px solid #d9e5ec;background:#fff;color:#557287}.hhSJDeleteEvent{border:1px solid #ffd4dc;background:#fff1f4;color:#c72b53}.hhSJRow{cursor:pointer}.hhSJRow:active{background:color-mix(in srgb,var(--a) 5%,#fff)}.hhSJRowEdit{font-size:8px!important;color:var(--a)!important;font-weight:900!important}#timeline .hhSJTimelineEvent{cursor:pointer}#timeline .hhSJTimelineEvent:active{filter:brightness(.98)}.hhSJPrivacy{text-align:center;font-size:8.5px;color:#8a9ba8;margin:7px 4px 0}.hhSJTrendHead{display:flex;justify-content:space-between;gap:8px;align-items:center}.hhSJTrendHead select{max-width:180px;border:1px solid #dce7ed;border-radius:10px;padding:7px;background:#fff;font-size:10px}.hhSJRange{display:flex;gap:5px;margin:8px 0}.hhSJRange button{border:1px solid #dce7ed;border-radius:999px;padding:7px 10px;background:#fff;color:#587388;font-size:9px;font-weight:900}.hhSJRange button.on{background:var(--a);color:#fff;border-color:var(--a)}.hhSJMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.hhSJM{padding:8px;border-radius:12px;background:#f7fafc;border:1px solid #e7eef2}.hhSJM b{display:block;font-size:18px;color:#173f62}.hhSJM small{font-size:8px;color:#8195a3}.hhSJChart{height:128px;margin-top:8px;border-radius:14px;background:linear-gradient(180deg,#fbfdfe,#f4f9fc);border:1px solid #e5edf2;overflow:hidden}.hhSJChart svg{width:100%;height:100%;display:block}.hhSJLog{margin-top:9px}.hhSJRow{border-top:1px solid #edf2f5;padding:9px 0;display:grid;grid-template-columns:35px 1fr;gap:8px}.hhSJRow:first-child{border-top:0}.hhSJRowIcon{width:34px;height:34px;border-radius:11px;background:color-mix(in srgb,var(--a) 11%,#fff);display:grid;place-items:center;font-size:18px}.hhSJRow b{font-size:11px;color:#244d68}.hhSJRow small{display:block;font-size:9px;color:#7b8f9e;margin-top:2px;line-height:1.35}.hhSJEmpty{text-align:center;padding:18px 8px;color:#7c909e;font-size:11px}'+
 '.hhSJCardTitle{display:flex;justify-content:space-between;align-items:center;gap:8px}.hhSJEditCatalog{border:1px solid color-mix(in srgb,var(--a) 25%,#dce7ed);background:color-mix(in srgb,var(--a) 7%,#fff);color:var(--a);border-radius:999px;padding:8px 11px;font-size:10px;font-weight:900;white-space:nowrap}.hhSJEditCatalog:active{transform:scale(.97)}'+
 '#'+EDIT+'{display:none;position:fixed;inset:0;z-index:9700;background:rgba(5,25,40,.60);backdrop-filter:blur(8px);align-items:flex-end}#'+EDIT+'.on{display:flex}.hhSJEditSheet{width:min(100vw,430px);max-height:88vh;overflow:auto;margin:0 auto;background:linear-gradient(180deg,#fbfdff,#f4f9fc);border-radius:25px 25px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -18px 44px rgba(0,0,0,.22);color:#173f62}.hhSJEditHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.hhSJEditHead h2{font-size:18px;margin:2px 0 0}.hhSJEditHead small{font-size:8px;color:var(--a);font-weight:900}.hhSJEditClose{width:38px;height:38px;border:0;border-radius:50%;background:#eaf2f7;color:#284d69;font-size:22px}.hhSJCatTabs{display:flex;gap:6px;overflow-x:auto;padding:10px 0 8px;scrollbar-width:none}.hhSJCatTabs::-webkit-scrollbar{display:none}.hhSJCatTab{flex:none;border:1px solid #dce7ed;background:#fff;color:#587388;border-radius:999px;padding:8px 11px;font-size:10px;font-weight:900}.hhSJCatTab.on{background:var(--a);border-color:var(--a);color:#fff}.hhSJCatAdd{display:grid;grid-template-columns:1fr auto;gap:7px;margin:5px 0 10px}.hhSJCatAdd input{min-width:0;border:1px solid #dce7ed;border-radius:12px;padding:11px;font:inherit;font-size:13px}.hhSJCatAdd button{border:0;border-radius:12px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;padding:0 14px;font-size:10px;font-weight:950}.hhSJCatList{background:#fff;border:1px solid #e3edf2;border-radius:15px;padding:5px 10px}.hhSJCatRow{min-height:45px;display:flex;align-items:center;gap:8px;border-top:1px solid #edf2f5}.hhSJCatRow:first-child{border-top:0}.hhSJCatRow span{flex:1;font-size:12px;font-weight:800}.hhSJCatRow small{font-size:8px;color:#8799a6}.hhSJCatRow button{border:0;background:#fff0f3;color:#cc315a;border-radius:9px;padding:6px 8px;font-size:8px;font-weight:900}.hhSJCatHint{font-size:9px;color:#7e919f;line-height:1.45;margin-top:8px}'+
 '#'+WHEEL+'{display:none;position:fixed;inset:0;z-index:9600;background:rgba(5,25,40,.58);backdrop-filter:blur(8px);align-items:flex-end}#'+WHEEL+'.on{display:flex}.hhSJWCard{width:min(100vw,430px);margin:0 auto;background:linear-gradient(180deg,#fbfdff,#f4f9fc);border-radius:25px 25px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -18px 44px rgba(0,0,0,.22);color:#173f62}.hhSJWHead{display:grid;grid-template-columns:42px 1fr 42px;align-items:center}.hhSJWClose{width:38px;height:38px;border:0;border-radius:50%;background:#eaf2f7;color:#284d69;font-size:22px}.hhSJWTitle{text-align:center}.hhSJWTitle small{display:block;font-size:9px;font-weight:900;color:var(--a)}.hhSJWTitle b{display:block;font-size:18px;margin-top:2px}.hhSJPickerWrap{position:relative;height:230px;margin:12px 9px;border-radius:18px;background:#fff;border:1px solid #dfeaf1;overflow:hidden}.hhSJPicker{height:100%;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:92px 0}.hhSJPicker::-webkit-scrollbar{display:none}.hhSJItem{height:46px;display:flex;align-items:center;justify-content:center;scroll-snap-align:center;font-size:17px;font-weight:760;color:#9caeba;transition:.12s}.hhSJItem.near{color:#667f91;font-size:19px}.hhSJItem.sel{font-size:25px;font-weight:900;color:#173f62;transform:scale(1.035)}.hhSJFocus{position:absolute;left:10px;right:10px;top:92px;height:46px;border-top:1px solid color-mix(in srgb,var(--a) 28%,#dbe8ef);border-bottom:1px solid color-mix(in srgb,var(--a) 28%,#dbe8ef);background:color-mix(in srgb,var(--a) 7%,transparent);pointer-events:none;border-radius:10px}.hhSJFadeT,.hhSJFadeB{position:absolute;left:0;right:0;height:72px;pointer-events:none;z-index:2}.hhSJFadeT{top:0;background:linear-gradient(#fff,rgba(255,255,255,0))}.hhSJFadeB{bottom:0;background:linear-gradient(rgba(255,255,255,0),#fff)}.hhSJWOk{width:100%;height:50px;border:0;border-radius:14px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-size:12px;font-weight:950}'+
 '@media(max-width:360px){#health .quick.hhSJQuick307 .qbox{width:36px;height:36px}.hhSJGrid{grid-template-columns:1fr}.hhSJHero{height:165px}}';
 document.head.appendChild(s);
}
function ensureWheel(){
 var o=document.getElementById(WHEEL);if(o)return o;
 o=document.createElement('div');o.id=WHEEL;
 o.innerHTML='<div class="hhSJWCard"><div class="hhSJWHead"><button class="hhSJWClose">×</button><div class="hhSJWTitle"><small>TÜNETNAPLÓ</small><b>Válassz</b></div><span></span></div><div class="hhSJPickerWrap"><div class="hhSJFocus"></div><div class="hhSJFadeT"></div><div class="hhSJFadeB"></div><div class="hhSJPicker"></div></div><button class="hhSJWOk">KÉSZ</button></div>';
 document.body.appendChild(o);
 o.querySelector('.hhSJWClose').onclick=closeWheel;
 o.querySelector('.hhSJWOk').onclick=applyWheel;
 o.onclick=function(e){if(e.target===o)closeWheel()};
 return o;
}
function fieldConfig(field){
 var dp=dateParts(draft&&draft.eventAt);
 if(field==='year'){var ys=[];for(var y=2015;y<=new Date().getFullYear()+1;y++)ys.push(String(y));return {title:'Év',values:ys,current:String(dp.year)}}
 if(field==='month')return {title:'Hónap',values:Array.from({length:12},function(_,i){return pad2(i+1)}),current:pad2(dp.month)};
 if(field==='day'){var max=new Date(dp.year,dp.month,0).getDate();return {title:'Nap',values:Array.from({length:max},function(_,i){return pad2(i+1)}),current:pad2(dp.day)}}
 if(field==='hour')return {title:'Óra · 24 órás',values:Array.from({length:24},function(_,i){return pad2(i)}),current:pad2(dp.hour)};
 if(field==='minute')return {title:'Perc',values:Array.from({length:60},function(_,i){return pad2(i)}),current:pad2(dp.minute)};
 if(field==='symptom')return {title:'Tünet',values:valuesFor('symptoms',SYMPTOMS),current:draft.symptom};
 if(field==='location')return {title:'Hely / jelleg',values:locations(),current:draft.location};
 if(field==='severity')return {title:'Erősség',values:['Nincs megadva'].concat(Array.from({length:11},function(_,i){return severityLabel(i)})),current:draft.severity==null?'Nincs megadva':severityLabel(draft.severity)};
 if(field==='action')return {title:'Mit tettél?',values:valuesFor('actions',ACTIONS),current:draft.action};
 if(field==='medication')return {title:'Eseti gyógyszer',values:valuesFor('medications',MEDS),current:draft.medication};
 if(field==='dose')return {title:'Dózis',values:valuesFor('doses',DOSES),current:draft.dose};
 if(field==='outcome')return {title:'Hatás / kimenetel',values:valuesFor('outcomes',OUTCOMES),current:draft.outcome};
 if(field==='response')return {title:'Hatás ideje',values:valuesFor('responses',RESPONSE),current:draft.response};
 return null;
}
function openWheel(field){
 initAudio();var cfg=fieldConfig(field);if(!cfg)return;
 var o=ensureWheel(),picker=o.querySelector('.hhSJPicker'),vals=cfg.values,idx=Math.max(0,vals.indexOf(cfg.current));
 wheelState={field:field,values:vals,index:idx,last:idx};
 o.querySelector('.hhSJWTitle b').textContent=cfg.title;
 picker.innerHTML=vals.map(function(v,i){return '<div class="hhSJItem" data-i="'+i+'">'+esc(v)+'</div>'}).join('');
 function visual(i,feedback){
  wheelState.index=i;
  picker.querySelectorAll('.hhSJItem').forEach(function(el,j){el.classList.toggle('sel',j===i);el.classList.toggle('near',Math.abs(j-i)===1)});
  if(feedback&&wheelState.last!==i){wheelState.last=i;tick()}
 }
 picker.onscroll=function(){requestAnimationFrame(function(){var i=Math.max(0,Math.min(vals.length-1,Math.round(picker.scrollTop/46)));visual(i,true)})};
 o.classList.add('on');
 requestAnimationFrame(function(){picker.scrollTop=idx*46;visual(idx,false)});
}
function closeWheel(){document.getElementById(WHEEL)?.classList.remove('on');wheelState=null}
function applyWheel(){
 if(!wheelState)return;
 var raw=wheelState.values[wheelState.index],field=wheelState.field;
 if(['year','month','day','hour','minute'].indexOf(field)>=0)setDatePart(field,raw);
 else if(field==='severity')draft.severity=raw==='Nincs megadva'?null:parseInt(raw,10);else draft[field]=raw;
 if(field==='symptom'){
  var ls=locations();if(ls.indexOf(draft.location)<0)draft.location=ls[0];
 }
 closeWheel();renderDraft();
}
function showPage(){
 document.querySelectorAll('.page').forEach(function(x){x.classList.remove('on')});
 var p=document.getElementById(PAGE);if(p)p.classList.add('on');
 ['navTimelineBar','navHomeBar','navDetailBar'].forEach(function(id){var n=document.getElementById(id);if(n)n.style.display='none'});
 var healthNav=document.getElementById('navHealthBar');if(healthNav)healthNav.style.display='grid';
 window.scrollTo(0,0);
}
function backHealth(){
 if(typeof window.show==='function'){window.show('health');return}
 document.querySelectorAll('.page').forEach(function(x){x.classList.remove('on')});
 document.getElementById('health')?.classList.add('on');
 var n=document.getElementById('navHealthBar');if(n)n.style.display='grid';
 window.scrollTo(0,0);
}
var activeJournalProfile=null;
function syncJournalTheme(){
 var page=document.getElementById(PAGE);if(!page)return;
 try{
  var cs=getComputedStyle(document.documentElement);
  ['--a','--a2','--soft','--wash','--wash2'].forEach(function(k){
   var v=cs.getPropertyValue(k);if(v)page.style.setProperty(k,v.trim());
  });
 }catch(e){}
 page.dataset.profile=pkey();
}
function toggleJournalProfile(e){
 if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}
 var next=localStorage.getItem('hh-profile')==='m'?'z':'m';
 if(typeof window.hhSetActiveProfile==='function')window.hhSetActiveProfile(next,{source:'symptom-journal'});
 else if(typeof window.setProfile==='function')window.setProfile(next,{source:'symptom-journal'});
 else {
  localStorage.setItem('hh-profile',next);
  try{window.dispatchEvent(new CustomEvent('healthhub:profile-changed',{detail:{code:next,profile:next==='m'?'monika':'zsolt',source:'symptom-journal'}}))}catch(_){}
 }
 return false;
}
function syncProfileShell(){
 var page=document.getElementById(PAGE);if(!page)return;
 var p=pkey(),name=document.getElementById('nameH'),date=document.getElementById('dateH'),weather=document.getElementById('weatherH'),nameday=document.getElementById('namedayH');
 var jn=page.querySelector('#hhSJName'),jd=page.querySelector('#hhSJHeroDate'),jw=page.querySelector('#hhSJWeather'),jnd=page.querySelector('#hhSJNameday'),sw=page.querySelector('.hhSJProfileSwitch307');
 if(jn){var displayName=name&&name.textContent?name.textContent:pname(p);jn.textContent=String(displayName).replace(/[⌄▼▾vV]+\s*$/,'').trim()||pname(p)}
 if(jd)jd.textContent=date&&date.textContent?date.textContent:new Intl.DateTimeFormat('hu-HU',{month:'long',day:'numeric',weekday:'short'}).format(new Date())+' · Budapest';
 if(jw&&weather)jw.innerHTML=weather.innerHTML;
 if(jnd&&nameday)jnd.innerHTML=nameday.innerHTML;
 if(sw){
  sw.innerHTML='<span>'+pname(p)+'</span><span class="swap" aria-hidden="true">⇄</span>';
  sw.title='Váltás '+(p==='monika'?'Zsolt':'Mónika')+' profiljára';
  sw.setAttribute('aria-label','Egy kattintás: váltás '+(p==='monika'?'Zsolt':'Mónika')+' profiljára');
 }
 activeJournalProfile=p;
 syncJournalTheme();
}
function ensureEditor(){
 var o=document.getElementById(EDIT);if(o)return o;
 o=document.createElement('div');o.id=EDIT;
 o.innerHTML='<div class="hhSJEditSheet"><div class="hhSJEditHead"><div><small>TÜNETNAPLÓ</small><h2>✏️ Kategóriák szerkesztése</h2></div><button class="hhSJEditClose" type="button">×</button></div><div class="hhSJCatTabs"></div><div class="hhSJCatAdd"><input id="hhSJCatInput" type="text" maxlength="80" placeholder="Új elem…"><button type="button" id="hhSJCatAddBtn">+ HOZZÁAD</button></div><div class="hhSJCatList"></div><div class="hhSJCatHint">Az alap HealthRadar-elemek védettek. A saját elemek központilag szinkronizálódnak, és minden készüléken megjelennek a görgetőkben.</div></div>';
 document.body.appendChild(o);
 o.querySelector('.hhSJEditClose').onclick=closeEditor;
 o.onclick=function(e){if(e.target===o)closeEditor()};
 o.querySelector('#hhSJCatAddBtn').onclick=addCatalogItem;
 o.querySelector('#hhSJCatInput').onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();addCatalogItem()}};
 o.querySelector('.hhSJCatTabs').onclick=function(e){var b=e.target.closest('[data-cat]');if(b){editorCategory=b.dataset.cat;renderEditor()}};
 o.querySelector('.hhSJCatList').onclick=function(e){var b=e.target.closest('[data-del]');if(b)removeCatalogItem(b.dataset.del)};
 return o;
}
function openEditor(){
 ensureEditor().classList.add('on');renderEditor();
 setTimeout(function(){var i=document.getElementById('hhSJCatInput');if(i)i.focus()},80);
}
function closeEditor(){var o=document.getElementById(EDIT);if(o)o.classList.remove('on')}
function baseForCategory(key){
 if(key==='locations')return LOCATIONS.default;
 return CATALOG_KEYS[key]&&CATALOG_KEYS[key].base?CATALOG_KEYS[key].base():[];
}
function renderEditor(){
 var o=ensureEditor(),cat=customCatalog(),def=CATALOG_KEYS[editorCategory]||CATALOG_KEYS.symptoms;
 o.querySelector('.hhSJCatTabs').innerHTML=Object.keys(CATALOG_KEYS).map(function(k){return '<button type="button" class="hhSJCatTab'+(k===editorCategory?' on':'')+'" data-cat="'+k+'">'+esc(CATALOG_KEYS[k].label)+'</button>'}).join('');
 var base=baseForCategory(editorCategory),custom=cat[editorCategory]||[];
 o.querySelector('.hhSJCatList').innerHTML=
  base.map(function(v){return '<div class="hhSJCatRow"><span>'+esc(v)+'</span><small>ALAP</small></div>'}).join('')+
  custom.map(function(v){return '<div class="hhSJCatRow"><span>'+esc(v)+'</span><small>SAJÁT</small><button type="button" data-del="'+esc(v)+'">TÖRLÉS</button></div>'}).join('');
 var input=o.querySelector('#hhSJCatInput');if(input)input.placeholder='Új '+def.label.toLocaleLowerCase('hu-HU')+'…';
}
async function addCatalogItem(){
 var input=document.getElementById('hhSJCatInput'),value=String(input&&input.value||'').trim();if(!value)return;
 var base=baseForCategory(editorCategory),x=pkgLocal(),cat=normalizeCatalog(x.catalog),all=mergeUnique(base,cat[editorCategory]||[]);
 if(all.some(function(v){return v.toLocaleLowerCase('hu-HU')===value.toLocaleLowerCase('hu-HU')})){toast('Ez az elem már szerepel a listában.');return}
 cat[editorCategory].push(value);x.catalog=cat;writeLocal(x);
 if(input)input.value='';
 renderEditor();renderDraft(false);renderTrend();tada();toast('✓ Új kategóriaelem hozzáadva');
 try{await pushCloud()}catch(e){console.warn('Tünetnapló kategória sync',e)}
}
async function removeCatalogItem(value){
 var x=pkgLocal(),cat=normalizeCatalog(x.catalog);
 cat[editorCategory]=(cat[editorCategory]||[]).filter(function(v){return v!==value});
 x.catalog=cat;writeLocal(x);renderEditor();renderDraft(false);renderTrend();toast('Saját elem törölve');
 try{await pushCloud()}catch(e){console.warn('Tünetnapló kategória sync',e)}
}
function ensurePage(){
 ensureStyle();
 var page=document.getElementById(PAGE);
 if(!page){
  page=document.createElement('section');page.id=PAGE;page.className='page';
  page.innerHTML='<div class="hero hhSJHero"><div class="heroBtns"><button class="round hhSJBack" type="button">‹</button></div><div class="heroCopy"><h1 id="hhSJName">Zsolt⌄</h1><div class="screenTitle">Tünetnapló</div><div id="hhSJHeroDate" class="date"></div><div id="hhSJWeather" class="weather"></div><div id="hhSJNameday" class="nameday"></div></div><button class="hhSJProfileSwitch307" type="button"></button><span class="hhSJBuild">HEALTHRADAR · V1</span></div><div class="hhSJBody"><section class="hhSJCard"><div class="hhSJCardTitle"><h3>🩺 Új egészségügyi esemény</h3><button class="hhSJEditCatalog" type="button">✏️ Kategóriák</button></div><small>Automatikus időbélyeg · minden mező mentés előtt ellenőrizhető</small><div class="hhSJTime"><div class="hhSJTimeLabel">DÁTUM ÉS IDŐ</div><div class="hhSJDateGrid"><button type="button" class="hhSJTimePart" data-timefield="year"><small>Év</small><b id="hhSJYear"></b></button><button type="button" class="hhSJTimePart" data-timefield="month"><small>Hónap</small><b id="hhSJMonth"></b></button><button type="button" class="hhSJTimePart" data-timefield="day"><small>Nap</small><b id="hhSJDay"></b></button></div><div class="hhSJClockGrid"><button type="button" class="hhSJTimePart" data-timefield="hour"><small>Óra · 24H</small><b id="hhSJHour"></b></button><button type="button" class="hhSJTimePart" data-timefield="minute"><small>Perc</small><b id="hhSJMinute"></b></button></div><div class="hhSJTimeSep" id="hhSJTimeSummary"></div></div><div class="hhSJGrid" id="hhSJGrid"></div><div class="hhSJMeasurement" id="hhSJMeasurement"><b>Kapcsolódó mérés</b>Mérést keresek az esemény időpontja körül…</div><textarea class="hhSJNotes" id="hhSJNotes" placeholder="Opcionális megjegyzés…"></textarea><button class="hhSJSave" id="hhSJSave" type="button">💾 MENTÉS</button><div class="hhSJEditActions" id="hhSJEditActions"><button class="hhSJCancelEdit" type="button">MÉGSE</button><button class="hhSJDeleteEvent" type="button">🗑 TÖRLÉS</button></div><div class="hhSJPrivacy">A Tünetnapló megfigyelési napló, nem diagnózis és nem gyógyszerajánló.</div></section><section class="hhSJCard"><div class="hhSJTrendHead"><div><h3>📈 Eseménytrend</h3><small>gyakoriság · erősség · kimenetel</small></div><select id="hhSJTrendSymptom"></select></div><div class="hhSJRange"><button data-days="7">7 nap</button><button data-days="30" class="on">30 nap</button><button data-days="90">90 nap</button><button data-days="365">1 év</button></div><div class="hhSJMetrics" id="hhSJMetrics"></div><div class="hhSJChart" id="hhSJChart"></div><div class="hhSJLog" id="hhSJLog"></div></section></div>';
  document.querySelector('.app')?.appendChild(page);
  page.querySelector('.hhSJBack').onclick=backHealth;
  page.querySelector('.hhSJProfileSwitch307').onclick=toggleJournalProfile;
  page.querySelector('.hhSJEditCatalog').onclick=openEditor;
  page.querySelector('#hhSJSave').onclick=save;
  page.querySelector('.hhSJCancelEdit').onclick=cancelEdit;
  page.querySelector('.hhSJDeleteEvent').onclick=deleteEditingEvent;
  page.querySelector('#hhSJLog').onclick=function(e){var row=e.target.closest('[data-event-id]');if(row)editEvent(row.dataset.eventId)};
  page.querySelector('.hhSJTime').onclick=function(e){var b=e.target.closest('[data-timefield]');if(b)openWheel(b.dataset.timefield)};
  page.querySelector('#hhSJNotes').oninput=function(){draft.notes=this.value};
  page.querySelector('.hhSJGrid').onclick=function(e){var b=e.target.closest('[data-field]');if(b)openWheel(b.dataset.field)};
  page.querySelector('.hhSJRange').onclick=function(e){var b=e.target.closest('[data-days]');if(!b)return;selectedDays=Number(b.dataset.days)||30;page.querySelectorAll('[data-days]').forEach(function(x){x.classList.toggle('on',x===b)});renderTrend()};
  page.querySelector('#hhSJTrendSymptom').onchange=function(){selectedTrendSymptom=this.value;renderTrend()};
 }
 syncProfileShell();
 return page;
}
function ensureLaunch(){
 var q=document.querySelector('#health .quick');if(!q)return;
 q.classList.add('hhSJQuick307');
 var b=q.querySelector('.hhSJLaunch307');
 if(!b){
  b=document.createElement('button');b.type='button';b.className='q hhSJLaunch307';
  b.innerHTML='<span class="qbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><path d="M7 16V5h10v11"/><path d="M9 9h6M12 6v6"/><path d="M9 16h6"/></svg></span><span>Tünet-<br>napló</span>';
  q.appendChild(b);
 }
 /* Keep the actual buttons (and their handlers) intact, only swap their positions:
    Tünetnapló becomes 6th and Továbbiak 7th. Run idempotently because
    HealthRadar frequently rebuilds its shortcut row. */
 var more=Array.from(q.children).find(function(x){
  return x!==b && x.classList.contains('q') && /további/i.test((x.textContent||'').replace(/\s+/g,' ').trim());
 });
 if(more){
  if(b.nextElementSibling!==more)q.insertBefore(b,more);
 }else if(b!==q.lastElementChild)q.appendChild(b);
 /* HealthRadar can rebuild .quick with innerHTML. Rebind even when the button survives
    visually but its DOM event handler was discarded by the rebuild. */
 b.type='button';
 b.onclick=function(e){if(e){e.preventDefault();e.stopPropagation()}openJournal()};
}
async function readMeasurements(){
 return new Promise(function(ok){
  try{
   var r=indexedDB.open('healthhub-healthradar-v2');
   r.onerror=function(){ok([])};
   r.onsuccess=function(){var db=r.result;if(!db.objectStoreNames.contains('measurements')){db.close();ok([]);return}var tx=db.transaction('measurements','readonly'),g=tx.objectStore('measurements').getAll();g.onsuccess=function(){db.close();ok(g.result||[])};g.onerror=function(){db.close();ok([])}};
  }catch(e){ok([])}
 });
}
async function findMeasurement(){
 if(!draft)return;
 var all=await readMeasurements(),p=pkey(),t=Date.parse(draft.eventAt),best=null,bd=3*3600*1000+1;
 all.forEach(function(x){
  if(x.profile!==p)return;
  if(x.systolic==null&&x.diastolic==null&&x.pulse==null)return;
  var d=Math.abs(Date.parse(x.measuredAt||0)-t);
  if(Number.isFinite(d)&&d<bd){bd=d;best=x}
 });
 draft.measurement=best?{id:best.id||null,measuredAt:best.measuredAt||null,systolic:best.systolic??null,diastolic:best.diastolic??null,pulse:best.pulse??null,source:best.source||null}:null;
 renderMeasurement();
}
function renderMeasurement(){
 var el=document.getElementById('hhSJMeasurement');if(!el||!draft)return;
 var m=draft.measurement;
 if(!m){el.innerHTML='<b>🩺 Kapcsolódó mérés</b>Az esemény ±3 órás környezetében nem találtam vérnyomás/pulzus mérést.';return}
 var bp=(m.systolic!=null||m.diastolic!=null)?((m.systolic??'—')+'/'+(m.diastolic??'—')+' Hgmm'):'';
 var pulse=m.pulse!=null?(' · '+m.pulse+' bpm'):'';
 el.innerHTML='<b>🩺 Kapcsolódó mérés automatikusan felismerve</b>'+esc(bp+pulse)+' · '+esc(new Date(m.measuredAt).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}));
}
function renderDraft(findBp){
 var page=ensurePage();if(!draft)draft=defaultDraft();syncProfileShell();
 var dp=dateParts(draft.eventAt);
 page.querySelector('#hhSJYear').textContent=dp.year;
 page.querySelector('#hhSJMonth').textContent=pad2(dp.month);
 page.querySelector('#hhSJDay').textContent=pad2(dp.day);
 page.querySelector('#hhSJHour').textContent=pad2(dp.hour);
 page.querySelector('#hhSJMinute').textContent=pad2(dp.minute);
 page.querySelector('#hhSJTimeSummary').textContent=dp.year+' · '+pad2(dp.month)+' · '+pad2(dp.day)+' · '+pad2(dp.hour)+':'+pad2(dp.minute);
 page.querySelector('#hhSJGrid').innerHTML=
  choice('symptom','Tünet',draft.symptom,'🤕')+
  choice('location','Hely / jelleg',draft.location,'📍')+
  choice('severity','Erősség',draft.severity==null?'Nincs megadva':severityLabel(draft.severity),'◉')+
  choice('action','Mit tettél?',(draft.action||'Nincs megadva'),'🧰')+
  choice('medication','Eseti gyógyszer',(draft.medication||'Nincs megadva'),'💊')+
  choice('dose','Dózis',(draft.dose||'Nincs megadva'),'⚖️')+
  choice('outcome','Kimenetel',(draft.outcome||'Nincs megadva'),'✅')+
  choice('response','Hatás ideje',(draft.response||'Nincs megadva'),'⏱️');
 if(document.activeElement!==page.querySelector('#hhSJNotes'))page.querySelector('#hhSJNotes').value=draft.notes||'';
 var hint=page.querySelector('#hhSJAskPrefill351');
 if(draft.askPrefilled351){
  if(!hint){
   hint=document.createElement('div');hint.id='hhSJAskPrefill351';hint.setAttribute('role','status');
   hint.style.cssText='margin:9px 0;padding:10px 12px;background:color-mix(in srgb,var(--a) 8%,white);border:1px solid color-mix(in srgb,var(--a) 27%,#dce7ed);border-radius:13px;font-size:12px;line-height:1.6;color:#28516a';
   page.querySelector('.hhSJCardTitle').insertAdjacentElement('afterend',hint);
  }
  hint.textContent='✨ Léna előkitöltése · Csak a kérdésedben egyértelműen szereplő adatokat vettem át. Ellenőrizd a dátumot és a mezőket! Ismeretlen gyógyszert, dózist, erősséget vagy kimenetelt nem találok ki.';
 }else if(hint)hint.remove();
 var saveBtn=page.querySelector('#hhSJSave'),acts=page.querySelector('#hhSJEditActions');
 if(saveBtn)saveBtn.textContent=editingId?'💾 MÓDOSÍTÁS MENTÉSE':'💾 MENTÉS';
 if(acts)acts.classList.toggle('on',!!editingId);
 renderMeasurement();
 if(findBp!==false)findMeasurement();
}
function editEvent(id){
 var row=pkgLocal().events.find(function(x){return x.id===id&&!x.deletedAt&&x.profile===pkey()});if(!row)return;
 editingId=row.id;
 draft={
  eventAt:row.eventAt||now(),symptom:row.symptom||'Egyéb',location:row.location||'Nem meghatározható',
  severity:Number(row.severity)||0,action:row.action||'Semmi',medication:row.medication||'Nem vettem be',
  dose:row.dose||'—',outcome:row.outcome||'Folyamatban',response:row.response||'Nem ismert',
  measurement:row.measurement||null,notes:row.notes||''
 };
 selectedTrendSymptom=draft.symptom;
 renderDraft(false);window.scrollTo({top:205,behavior:'smooth'});toast('Szerkesztés · '+row.symptom);
}
function cancelEdit(){
 editingId=null;draft=defaultDraft();renderDraft();toast('Szerkesztés megszakítva');
}
async function deleteEditingEvent(){
 if(!editingId)return;
 var x=pkgLocal(),row=x.events.find(function(e){return e.id===editingId});
 if(!row)return;
 var label=row.symptom||'esemény';
 if(!window.confirm('Biztosan törlöd ezt a bejegyzést?\n\n'+label+' · '+fmtDate(row.eventAt)))return;
 row.deletedAt=now();row.updatedAt=row.deletedAt;row.deletedBy='healthhub_manual';
 writeLocal(x);editingId=null;draft=defaultDraft();renderDraft();renderTrend();renderTimelineSymptoms();
 toast('🗑 Bejegyzés törölve');
 try{await pushCloud()}catch(e){console.warn('Tünetnapló törlés sync',e);toast('Törölve helyben · cloud sync később újrapróbálható')}
 window.dispatchEvent(new CustomEvent('healthhub:symptom-changed',{detail:{profile:pkey(),id:row.id,action:'delete'}}));
}
async function save(){
 initAudio();
 var btn=document.getElementById('hhSJSave');if(btn)btn.disabled=true;
 try{
  var p=pkey(),x=pkgLocal(),t=now(),existing=editingId?x.events.find(function(e){return e.id===editingId&&!e.deletedAt}):null;
  var row={schema:'healthhub.symptom.event/1',id:existing?existing.id:'sym-'+uuid(),profile:p,eventAt:draft.eventAt,symptom:draft.symptom,location:draft.location,severity:draft.severity==null?null:Number(draft.severity),action:draft.action||null,medication:draft.action==='Gyógyszer'?draft.medication||null:null,dose:draft.action==='Gyógyszer'?draft.dose||null:null,outcome:draft.outcome||null,response:draft.response||null,measurement:draft.measurement||null,notes:(draft.notes||'').trim(),source:'healthhub_manual',createdAt:existing&&existing.createdAt?existing.createdAt:t,updatedAt:t};
  x.events=mergeEvents(x.events,[row]);writeLocal(x);renderTrend();renderTimelineSymptoms();tada();toast(existing?'✓ Módosítás elmentve · Tünetnapló':'✓ Esemény elmentve · Tünetnapló');
  try{var ok=await pushCloud();if(ok)toast('✓ Esemény elmentve · központi tárhely frissítve')}catch(e){console.warn(e);toast('Esemény elmentve · cloud sync később újrapróbálható')}
  var wasEdit=!!existing;editingId=null;draft=defaultDraft();renderDraft();
  window.dispatchEvent(new CustomEvent(wasEdit?'healthhub:symptom-changed':'healthhub:symptom-saved',{detail:{profile:p,id:row.id,eventAt:row.eventAt,action:wasEdit?'edit':'create'}}));
 }catch(e){console.error(e);toast('A Tünetnapló bejegyzés nem menthető.')}
 finally{if(btn)btn.disabled=false}
}
function trendEvents(){
 var cut=Date.now()-selectedDays*86400000,p=pkey();
 return pkgLocal().events.filter(function(x){return !x.deletedAt&&x.profile===p&&Date.parse(x.eventAt)>=cut&&(!selectedTrendSymptom||x.symptom===selectedTrendSymptom)}).sort(function(a,b){return Date.parse(a.eventAt)-Date.parse(b.eventAt)});
}
function chartSvg(rows){
 if(!rows.length)return '<div class="hhSJEmpty">Még nincs esemény ebben az időszakban.</div>';
 var W=360,H=128,L=25,R=10,T=12,B=24,minT=Date.parse(rows[0].eventAt),maxT=Date.parse(rows[rows.length-1].eventAt);if(maxT===minT)maxT=minT+86400000;
 var pts=rows.map(function(x){var px=L+(Date.parse(x.eventAt)-minT)/(maxT-minT)*(W-L-R),py=T+(10-(Number(x.severity)||0))/10*(H-T-B);return {x:px,y:py,s:x.severity}});
 var poly=pts.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1)}).join(' ');
 var circles=pts.map(function(p){return '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="var(--a)"/>'}).join('');
 return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-label="Tünet erősség trend"><line x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'" stroke="#dfe8ee"/><line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+(H-B)+'" stroke="#dfe8ee"/><text x="4" y="'+(T+4)+'" font-size="8" fill="#8194a1">10</text><text x="9" y="'+(H-B)+'" font-size="8" fill="#8194a1">0</text>'+(pts.length>1?'<polyline points="'+poly+'" fill="none" stroke="var(--a)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'')+circles+'<text x="'+L+'" y="'+(H-7)+'" font-size="7" fill="#8194a1">'+esc(new Date(minT).toLocaleDateString('hu-HU',{month:'short',day:'numeric'}))+'</text><text x="'+(W-55)+'" y="'+(H-7)+'" font-size="7" fill="#8194a1">'+esc(new Date(rows[rows.length-1].eventAt).toLocaleDateString('hu-HU',{month:'short',day:'numeric'}))+'</text></svg>';
}
function renderTrend(){
 var page=document.getElementById(PAGE);if(!page)return;
 var p=pkey(),all=pkgLocal().events.filter(function(x){return !x.deletedAt&&x.profile===p});
 var syms=Array.from(new Set(all.map(function(x){return x.symptom}).concat(valuesFor('symptoms',SYMPTOMS)))).filter(Boolean);
 var sel=page.querySelector('#hhSJTrendSymptom');
 if(!selectedTrendSymptom)selectedTrendSymptom=draft&&draft.symptom||'Fejfájás';
 if(syms.indexOf(selectedTrendSymptom)<0)selectedTrendSymptom=syms[0]||'Fejfájás';
 sel.innerHTML=syms.map(function(s){return '<option'+(s===selectedTrendSymptom?' selected':'')+'>'+esc(s)+'</option>'}).join('');
 var rows=trendEvents(),rated=rows.filter(function(x){return x.severity!=null&&x.severity!==''}),avg=rated.length?rated.reduce(function(a,x){return a+Number(x.severity)},0)/rated.length:null,done=rows.filter(function(x){return x.outcome==='Megszűnt'||x.outcome==='Jelentősen javult'||x.outcome==='Javult'}).length;
 page.querySelector('#hhSJMetrics').innerHTML='<div class="hhSJM"><b>'+rows.length+'</b><small>ESEMÉNY</small></div><div class="hhSJM"><b>'+(avg==null?'—':avg.toFixed(1))+'</b><small>ÁTLAG ERŐSSÉG / 10</small></div><div class="hhSJM"><b>'+(rows.length?Math.round(done/rows.length*100):0)+'%</b><small>JAVULT / MEGSZŰNT</small></div>';
 page.querySelector('#hhSJChart').innerHTML=chartSvg(rated);
 var recent=all.sort(function(a,b){return Date.parse(b.eventAt)-Date.parse(a.eventAt)}).slice(0,12);
 page.querySelector('#hhSJLog').innerHTML=recent.length?recent.map(function(x){
  var med=x.medication?(' · 💊 '+x.medication+(x.dose?' '+x.dose:'')):'';
  var bp=x.measurement&&x.measurement.systolic!=null?(' · 🩺 '+x.measurement.systolic+'/'+(x.measurement.diastolic??'—')):'';
  return '<div class="hhSJRow" data-event-id="'+esc(x.id)+'"><span class="hhSJRowIcon">🤕</span><span><b>'+esc(x.symptom)+' · '+esc(x.severity==null?'Nincs megadva':severityLabel(x.severity))+'</b><small>'+esc(fmtDate(x.eventAt))+' · '+esc(x.location||'')+med+bp+'</small><small>'+esc(x.outcome||'')+(x.response?' · '+esc(x.response):'')+'</small><small class="hhSJRowEdit">✏️ Koppints a szerkesztéshez</small></span></div>';
 }).join(''):'<div class="hhSJEmpty">A napló még üres. Az első mentés után itt azonnal megjelenik az esemény és a trend.</div>';
}
function sameLocalDay(iso,date){
 var d=new Date(iso),x=date||new Date();
 return Number.isFinite(d.getTime())&&d.getFullYear()===x.getFullYear()&&d.getMonth()===x.getMonth()&&d.getDate()===x.getDate();
}
function timeMinutes(text){
 var m=String(text||'').match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):9999;
}
function timelineSymptomHtml(x){
 var d=new Date(x.eventAt),time=d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}),med=x.medication?(' · 💊 '+x.medication+(x.dose?' '+x.dose:'')):'';
 var outcome=(x.outcome||'')+(x.response?' · '+x.response:'');
 return '<article class="event compact hhSJTimelineEvent" data-symptom-id="'+esc(x.id)+'"><span class="time">'+esc(time)+'</span><span class="node" style="background:var(--a)"></span><span class="eventIcon profile">🤕</span><h3>'+esc(x.symptom)+' · '+esc(severityLabel(x.severity))+'</h3><span class="source">HealthRadar · Tünetnapló ›</span><div class="subtext">'+esc(x.location||'')+med+'</div><div class="subtext">'+esc(outcome)+'</div></article>';
}
function renderTimelineSymptoms(){
 var tl=document.querySelector('#timeline .timeline');if(!tl)return;
 tl.querySelectorAll('.hhSJTimelineEvent').forEach(function(n){n.remove()});
 var p=pkey(),rows=pkgLocal().events.filter(function(x){return !x.deletedAt&&x.profile===p&&sameLocalDay(x.eventAt,new Date())}).sort(function(a,b){return Date.parse(a.eventAt)-Date.parse(b.eventAt)});
 rows.forEach(function(x){tl.insertAdjacentHTML('beforeend',timelineSymptomHtml(x))});
 var children=Array.from(tl.children);
 children.sort(function(a,b){return timeMinutes(a.querySelector('.time')&&a.querySelector('.time').textContent)-timeMinutes(b.querySelector('.time')&&b.querySelector('.time').textContent)});
 children.forEach(function(n){tl.appendChild(n)});
 var ev=document.getElementById('events');if(ev)ev.textContent=String(children.length);
}
window.hhRenderSymptomTimeline307=renderTimelineSymptoms;
async function openJournal(aiDraft){
 initAudio();editingId=null;draft=aiDraft&&aiDraft.askPrefilled351?aiDraft:defaultDraft();selectedTrendSymptom=draft.symptom;
 ensurePage();showPage();renderDraft();renderTrend();
 await pullCloud();renderDraft(false);renderTrend();renderTimelineSymptoms();
}
var launchObserver=null,launchRepairTimer=null;
function installLaunchGuard(){
 if(document.documentElement.dataset.hhSJLaunchGuard307==='1')return;
 document.documentElement.dataset.hhSJLaunchGuard307='1';
 /* Delegated fallback: survives every HealthRadar DOM rebuild. */
 document.addEventListener('click',function(e){
  var tev=e.target&&e.target.closest?e.target.closest('.hhSJTimelineEvent[data-symptom-id]'):null;
  if(tev){
   e.preventDefault();e.stopPropagation();
   var id=tev.dataset.symptomId;
   openJournal().then(function(){editEvent(id)});
   return;
  }
  var b=e.target&&e.target.closest?e.target.closest('.hhSJLaunch307'):null;
  if(!b)return;
  e.preventDefault();e.stopPropagation();
  openJournal();
 },true);
 var health=document.getElementById('health');
 if(health&&window.MutationObserver){
  launchObserver=new MutationObserver(function(){
   clearTimeout(launchRepairTimer);
   launchRepairTimer=setTimeout(function(){ensureLaunch();syncProfileShell()},30);
  });
  launchObserver.observe(health,{childList:true,subtree:true});
 }
 /* Tiny watchdog for older WebViews where mutation callbacks can be skipped while
    pages are being swapped. It only repairs the launch button; it does no sync work. */
 setInterval(function(){if(document.getElementById('health')){ensureLaunch();if(document.getElementById(PAGE)?.classList.contains('on'))syncProfileShell()}},2500);
}
function decorate(){
 ensurePage();ensureLaunch();installLaunchGuard();renderTimelineSymptoms();
 document.documentElement.dataset.healthhubSymptomJournal='1.307.10';
}
window.hhOpenSymptomJournal307=openJournal;
window.hhOpenSymptomJournalPrefilled307=function(data){
 if(!data||data.profile!==pkey())return Promise.resolve(false);
 var result=askPrefill351(data);
 if(!result)return Promise.resolve(false);
 return openJournal(result).then(function(){return true});
};
window.hhSymptomJournalSync307=async function(){await pullCloud();if(connected())await pushCloud();renderTrend();return true};
window.addEventListener('healthhub:profile-changed',function(){
 renderTimelineSymptoms();
 var page=document.getElementById(PAGE);if(!page)return;
 activeJournalProfile=pkey();syncProfileShell();
 if(page.classList.contains('on')){
  draft=defaultDraft();selectedTrendSymptom=draft.symptom;
  renderDraft();renderTrend();pullCloud().then(function(){syncProfileShell();renderTrend()});
 }
});
window.addEventListener('online',function(){if(document.getElementById(PAGE)?.classList.contains('on'))pullCloud().then(function(){renderTrend();renderTimelineSymptoms()})});
var prevShow307=window.show;
if(typeof prevShow307==='function'&&!prevShow307.__hhSymptomTimeline307){
 var wrappedShow307=function(id){
  var r=prevShow307.apply(this,arguments);
  if(id==='timeline')setTimeout(renderTimelineSymptoms,0);
  return r;
 };
 wrappedShow307.__hhSymptomTimeline307=true;window.show=wrappedShow307;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
setTimeout(decorate,900);
})();