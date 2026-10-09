(function(){
'use strict';
/* HealthHub v328 · Intelligence Context Bridge
   Independent READ-ONLY local datasource adapter for Ask Léna.
   No writes to health stores/Dropbox/Drive and no AI/network calls.
   The optional explicit refresh button invokes the EXISTING v289 context refresh
   (which updates its own established local cache, not medical source records). */
var PANEL='hhIntelligence328',STYLE='hhIntelligenceStyle328',CACHE='hh-lena-context-v289-';
var SYM='hh-symptom-journal-v1',MAP='hh-lena-doc-drive-v294-map';
var last=null,busy=false,revision=0;
function el(id){return document.getElementById(id)}
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}}
function arr(x){return Array.isArray(x)?x:[]}
function number(x){if(x===null||x===undefined||x==='')return null;var n=Number(x);return Number.isFinite(n)?n:null}
function short(x,max){var s=String(x==null?'':x).replace(/\s+/g,' ').trim();return s.length>(max||180)?s.slice(0,(max||180)-1)+'…':s}
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(y){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[y]})}
function profile(p){if(p==='m'||p==='monika')return'monika';if(p==='z'||p==='zsolt')return'zsolt';return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return profile(p)==='monika'?'Mónika':'Zsolt'}
function epoch(t){if(!t)return null;var x=Date.parse(/^\d{4}-\d\d-\d\d$/.test(String(t))?String(t)+'T12:00:00':String(t));return Number.isFinite(x)?x:null}
function stamp(t){var n=epoch(t);return n==null?'időpont nélkül':new Date(n).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function fmt(v,max){return number(v)==null?'—':Number(v).toLocaleString('hu-HU',{maximumFractionDigits:max==null?1:max})}
function entry(name,value,unit,at,detail){return {name:name,value:String(value),unit:unit||'',observedAt:at||null,detail:detail||''}}
function metric(rows,name,val,unit,at,detail){if(number(val)!=null)rows.push(entry(name,fmt(val),unit,at,detail))}
function source(id,icon,title,entries,at,kind,detail){
 var has=entries.length>0,age=epoch(at)==null?null:Math.max(0,Date.now()-epoch(at));
 var stale=has&&kind!=='archive'&&age!=null&&age>(kind==='environment'?3*3600000:kind==='infection'?21*86400000:kind==='symptoms'?90*86400000:kind==='medication'?90*86400000:14*86400000);
 return {id:id,icon:icon,title:title,status:has?(stale?'stale':'available'):'missing',
  observedAt:at||null,ageHours:age==null?null:Math.round(age/360000)/10,
  entries:entries,detail:detail||'',origin:kind||'health-context'};
}
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function relevant(q,s){
 var x=norm(q),w=norm(s);if(!x)return true;
 var tokens=x.split(' ').filter(function(t){return t.length>=4});
 if(/fejem|fejfaj|migren/.test(x))tokens.push('fej');
 if(/orrdugul|szena|allerg/.test(x))tokens.push('orr','allerg');
 return tokens.some(function(t){return w.indexOf(t)>=0||w.split(' ').some(function(v){return v.slice(0,Math.min(4,v.length))===t.slice(0,Math.min(4,t.length))})});
}
function domains(q){
 var s=norm(q);
 var rules={
  symptoms:/faj|panasz|tunet|fej|szedul|legszomj|orr|allerg|hanying|rosszul/,
  vitals:/vernyomas|pulzus|sziv|faj|szedul|farad|fej|suly|cukor|test/,
  sleep:/alv|alsz|alud|ebred|ejjel|farad|fej|reggel|kimerult/,
  activity:/mozgas|seta|lepes|aktiv|farad|terhel|faj|sport/,
  environment:/idojaras|legnyomas|front|pollen|homerseklet|fej|orr|allerg|legszomj|farad/,
  infection:/fertoz|virus|influenz|kovid|laz|kohog|jarvany/,
  medication:/gyogyszer|tabletta|adag|faj|szedul|farad|fej|sziv|vernyomas/,
  records:/lelet|korhaz|mutet|vizsgalat|diagnoz|korlap|karton|elozmeny|emlek|intenziv/
 };
 var result=[];Object.keys(rules).forEach(function(k){if(rules[k].test(s))result.push(k)});
 if(!result.length)result=['symptoms','vitals','sleep','activity','environment','infection','medication','records'];
 return result;
}
function collect(question,forcedProfile){
 var p=profile(forcedProfile),q=short(question||'',500);
 var c=null;try{if(window.hhGetLenaHealthContext289)c=window.hhGetLenaHealthContext289(p)}catch(e){}
 if(!c)c=read(CACHE+p);
 // Prevent accidentally mixing two profiles after an asynchronous profile change.
 if(c&&c.profile&&profile(c.profile)!==p)c=null;
 var sources=[],at=c&&c.generatedAt||null;
 var local=read(SYM),events=arr(local&&local.events).filter(function(x){return x&&x.profile===p&&!x.deletedAt&&epoch(x.eventAt)!=null})
  .sort(function(a,b){return epoch(b.eventAt)-epoch(a.eventAt)});
 var matched=events.filter(function(x){return relevant(q,[x.symptom,x.location,x.notes].join(' '))});
 var se=[],shown=matched.slice(0,5),symAt=shown[0]&&shown[0].eventAt||events[0]&&events[0].eventAt||null;
 shown.forEach(function(x){
  se.push(entry(short(x.symptom,65),number(x.severity)==null?'—':fmt(x.severity,0)+' / 10','',x.eventAt,
    [short(x.location,50),short(x.outcome,50)].filter(Boolean).join(' · ')));
 });
 sources.push(source('symptoms','🩺','Tünetnapló',se,symAt,'symptoms',
  events.length+' profilhoz tartozó esemény; '+matched.length+' keresett kérdéshez illeszkedő. Helyi naplócache, a Dropbox frissessége nincs ellenőrizve.'));
 var vt=[],m=c&&c.metrics||{},bp=m.bloodPressure||{},pulse=m.pulse||{},heart=c&&c.heartRate||{};
 if(bp.latest&&number(bp.latest.systolic)!=null&&number(bp.latest.diastolic)!=null){
  vt.push(entry('Vérnyomás',fmt(bp.latest.systolic,0)+'/'+fmt(bp.latest.diastolic,0),'Hgmm',bp.latest.measuredAt,'Legutóbbi mérés'));
 }
 if(bp.d7&&number(bp.d7.systolicAvg)!=null&&number(bp.d7.diastolicAvg)!=null)
  vt.push(entry('Vérnyomás 7 napos átlag',fmt(bp.d7.systolicAvg)+'/'+fmt(bp.d7.diastolicAvg),'Hgmm',null,'Korábbi mérésekből számítva'));
 metric(vt,'Pulzus',pulse.latest&&pulse.latest.value,'/perc',pulse.latest&&pulse.latest.measuredAt,'Legutóbbi mérés');
 metric(vt,'Pulzus 72 órás átlag',pulse.h72Avg,'/perc',null,'Mérésekből számítva');
 metric(vt,'Testsúly',m.weight&&m.weight.latest&&m.weight.latest.weightKg,'kg',m.weight&&m.weight.latest&&m.weight.latest.measuredAt);
 metric(vt,'Vércukor',m.glucose&&m.glucose.latest&&m.glucose.latest.bloodGlucose,'mmol/L',m.glucose&&m.glucose.latest&&m.glucose.latest.measuredAt);
 metric(vt,'Véroxigén',m.oxygen&&m.oxygen.latest&&m.oxygen.latest.oxygenSaturation,'%',m.oxygen&&m.oxygen.latest&&m.oxygen.latest.measuredAt);
 metric(vt,'Mért szívfrekvencia (Health Connect)',heart.latest&&heart.latest.bpm,'/perc',heart.latest&&heart.latest.time);
 var vitAt=vt.map(function(x){return x.observedAt}).filter(function(x){return epoch(x)!=null}).sort(function(a,b){return epoch(b)-epoch(a)})[0]||null;
 sources.push(source('vitals','❤️','HealthRadar · mérések',vt,vitAt,'health-context',
  'A mérési dátumok a Health Contextból származnak. A 7 napos átlag nem egy új mérés.'));
 var sl=[],sleep=c&&c.sleep||{},s0=sleep.h72||{},s7=sleep.d7||{},s30=sleep.d30||{},latest=arr(sleep.recent)[0]||s0.latest;
 metric(sl,'Legutóbbi alvás',latest&&latest.durationMin,'perc',latest&&latest.endTime,'Mért alvásszakasz; lehet töredezett');
 metric(sl,'72 órás alvásátlag',s0.avgDurationMin,'perc',null,'A rendszer által számolt szakaszátlag');
 metric(sl,'7 napos alvásátlag',s7.avgDurationMin,'perc',null,'');
 metric(sl,'30 napos alvásátlag',s30.avgDurationMin,'perc',null,'');
 sources.push(source('sleep','😴','Sleep · alvás',sl,latest&&latest.endTime,'health-context',
  'A mélyalvás/REM jelenleg nem része a v289 összesített Health Contextnak; nem találok ki alvásfázis-értékeket. Töredezett alvásnál egy szakasz nem feltétlen teljes éjszaka.'));
 var ac=[],a=c&&c.activity||{},a0=a.h72||{},a7=a.d7||{},a30=a.d30||{},aLatest=arr(a.recent)[0];
 metric(ac,'Legutóbbi napi lépésszám',aLatest&&aLatest.steps,'lépés',aLatest&&aLatest.date);
 metric(ac,'Utolsó nap aktív percei',aLatest&&aLatest.activeMinutes,'perc',aLatest&&aLatest.date);
 metric(ac,'72 órás napi lépésátlag',a0.avgSteps,'lépés',null);
 metric(ac,'7 napos napi lépésátlag',a7.avgSteps,'lépés',null);
 metric(ac,'30 napos napi lépésátlag',a30.avgSteps,'lépés',null);
 sources.push(source('activity','🏃','Activity · mozgás',ac,aLatest&&aLatest.date,'health-context','A napló és a Health Connect szinkronizált adatai alapján.'));
 var env=null,daily=null;try{if(window.HH_ENVIRONMENT_V1)env=window.HH_ENVIRONMENT_V1.getCurrent()}catch(e){}
 try{if(window.HH_DAILY_HEALTH_V312)daily=window.HH_DAILY_HEALTH_V312.getContext()}catch(e){}
 var ev=[],envAt=null,kind='environment';
 if(env){
  var cur=env.current||{},delta=env.pressureDelta||{},pol=env.pollen||{},aq=env.airQuality||{};
  envAt=env.fetchedAt||env.observedAt;
  metric(ev,'Hőmérséklet',cur.temperature,'°C',env.observedAt);
  metric(ev,'Páratartalom',cur.humidity,'%',env.observedAt);
  metric(ev,'Légnyomás',cur.pressureMsl,'hPa',env.observedAt);
  metric(ev,'Légnyomás-változás 6 óra',delta.h6,'hPa',env.observedAt);
  metric(ev,'Légnyomás-változás 24 óra',delta.h24,'hPa',env.observedAt);
  metric(ev,'Európai levegőminőségi index',aq.europeanAqi,'AQI',env.airObservedAt||envAt);
  var polNames={alder:'Éger',birch:'Nyír',grass:'Fűfélék',mugwort:'Üröm',olive:'Olajfa',ragweed:'Parlagfű'};
  Object.keys(polNames).forEach(function(k){if(number(pol[k])!=null)metric(ev,'Pollen · '+polNames[k],pol[k],'szemcse/m³',env.airObservedAt||envAt)});
 }else if(daily){
  var w=daily.weather||{},ar=daily.air||{};
  envAt=w.observedAt||daily.generatedAt||null;
  metric(ev,'Hőmérséklet',w.temperature,'°C',w.observedAt);
  metric(ev,'Légnyomás',w.pressureHpa,'hPa',w.observedAt);
  metric(ev,'6 órás légnyomás-változás',w.pressureChange6h,'hPa',w.observedAt);
  metric(ev,'Levegőminőség',ar.aqi,'AQI',ar.observedAt);
 }
 sources.push(source('environment','🌦️','Időjárás · pollen · levegő',ev,envAt,kind,'Helyi időjáráscache és a meglévő környezeti modul; frissítését nem indítom el a kutatásból.'));
 var inf=null;try{if(window.HH_INFECTION_WATCH_V1)inf=window.HH_INFECTION_WATCH_V1.get()}catch(e){}
 var ie=[],ia=inf&&inf.periodEnd||null;
 if(inf&&inf.periodEnd){
  ie.push(entry('Hivatalos megfigyelési időszak vége',String(inf.periodEnd),'',inf.periodEnd,'Országos/területi jelentés, nem egyéni fertőzési kockázat'));
  arr(inf.items).slice(0,3).forEach(function(i){if(i&&i.label)ie.push(entry('Jelzés · '+short(i.label,64),short(i.level||'közzétett',40),'',ia))});
 }
 sources.push(source('infection','🦠','Fertőzésfigyelés',ie,ia,'infection','Az adatok hetente frissülhetnek; a jelentés időszakát kell figyelembe venni.'));
 var pr=[],profileCore=c&&c.profileCore||{},meds=arr(c&&c.medications);
 meds.slice(0,6).forEach(function(x){if(x&&x.name)pr.push(entry('Rögzített gyógyszer',short(x.name,75)+(x.strength?' · '+short(x.strength,30):''),'',null,short(x.status,40)))});
 if(profileCore.knownConditions)pr.push(entry('Profilban rögzített előzmény',short(profileCore.knownConditions,100),'',null,'Felhasználói profiladat; orvosilag nem ellenőrzött'));
 sources.push(source('medication','💊','Profil · gyógyszerek',pr,null,'medication',
  'Profilban rögzített információ; a gyógyszerek aktuális szedését és hatását a napló nem igazolja. '+meds.length+' listázott készítmény.'));
 var docs=arr(c&&c.documents&&c.documents.index),mp=read(MAP)||{},dr=[];
 var docsAvail=docs.filter(function(d){return d&& (d.driveArchive&&d.driveArchive.fileId||(mp[String(d.id)]&&mp[String(d.id)].fileId))}).length;
 var hitDocs=docs.filter(function(d){return relevant(q,[d.title,d.category,d.explanation&&d.explanation.summary].join(' '))});
 dr.push(entry('Indexelt leletek',String(docs.length),'db',null,'Csak indexadatok, a PDF-eket a Bridge nem nyitja meg'));
 dr.push(entry('Drive-hivatkozásos leletek',String(docsAvail),'db',null,'Nem bizonyítja, hogy a fájl itt olvasható'));
 if(hitDocs.length)hitDocs.slice(0,3).forEach(function(d){dr.push(entry('Kapcsolódó lelet',short(d.title,88),'',d.date,'Indexben talált egyezés, nem PDF-bizonyíték'))});
 sources.push(source('records','📁','Kórlapok · leletek',c&&docs.length?dr:[],null,'archive',
  hitDocs.length+' index szerinti keresési találat. Az eredeti dokumentumhoz külön Drive-jóváhagyás szükséges.'));
 var priority=domains(q);sources.forEach(function(s){s.relevant=priority.indexOf(s.id)>=0});
 return {schema:'healthhub.intelligence.context/1',build:'v328',generatedAt:new Date().toISOString(),
  profile:p,profileName:pname(p),question:q,contextGeneratedAt:at,
  status:'local-preview-only',networkTransmission:false,sources:sources,
  available:sources.filter(function(s){return s.status==='available'}).length,
  stale:sources.filter(function(s){return s.status==='stale'}).length,
  missing:sources.filter(function(s){return s.status==='missing'}).length};
}
function css(){
 if(el(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;
 s.textContent=
 '#'+PANEL+'{background:linear-gradient(160deg,#fff,#f3fafc);border:1px solid #cce3e9;border-radius:20px;box-shadow:0 8px 26px #16485c12;padding:17px;min-width:0;color:#204a60}'+
 '#'+PANEL+' h2{font-size:17px;margin:0 0 6px;color:#183f5c}'+
 '#'+PANEL+' .hh328sub{font-size:12px;line-height:1.6;color:#607e8d;margin:0 0 12px}'+
 '#'+PANEL+' .hh328top{display:flex;align-items:center;flex-wrap:wrap;gap:9px}'+
 '#'+PANEL+' .hh328go{border:0;border-radius:13px;padding:12px 17px;background:linear-gradient(125deg,#087a97,#20a59e);color:#fff;font-size:13px;font-weight:850;cursor:pointer;box-shadow:0 6px 18px #087a9730}'+
 '#'+PANEL+' .hh328go:disabled{opacity:.5;cursor:wait}'+
 '#'+PANEL+' .hh328meta{font-size:11px;color:#4e7183;font-weight:650}'+
 '#'+PANEL+' .hh328summary{margin-top:12px;display:none;padding:11px 13px;background:#e3f2f6;border-radius:12px;font-size:12px;line-height:1.55;font-weight:700;color:#135a6d}'+
 '#'+PANEL+' .hh328summary.on{display:block}'+
 '#'+PANEL+' .hh328grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}'+
 '#'+PANEL+' .hh328source{background:#fff;border:1px solid #dfebee;border-radius:14px;padding:12px;min-width:0}'+
 '#'+PANEL+' .hh328source.priority{border-color:#7dbdca;box-shadow:0 0 0 1px #d0ecef}'+
 '#'+PANEL+' .hh328head{display:flex;align-items:flex-start;justify-content:space-between;gap:6px;flex-wrap:wrap}'+
 '#'+PANEL+' .hh328head b{font-size:12px;color:#234966;line-height:1.4}'+
 '#'+PANEL+' .hh328badge{padding:3px 6px;border-radius:7px;font-size:10px;font-weight:900;background:#edf0f2;color:#617582;white-space:nowrap}'+
 '#'+PANEL+' .hh328badge.available{background:#e6f7ed;color:#16654f}'+
 '#'+PANEL+' .hh328badge.stale{background:#fff2d8;color:#945f17}'+
 '#'+PANEL+' .hh328items{margin:8px 0 0;padding:0;list-style:none}'+
 '#'+PANEL+' .hh328items li{padding:7px 0;border-top:1px solid #ecf2f4;line-height:1.45}'+
 '#'+PANEL+' .hh328items span{display:block;font-size:11px;color:#58758a}'+
 '#'+PANEL+' .hh328items strong{display:block;font-size:13px;color:#163e57;overflow-wrap:anywhere}'+
 '#'+PANEL+' .hh328items small{display:block;font-size:10px;color:#66808c}'+
 '#'+PANEL+' .hh328hint{font-size:10px;line-height:1.5;color:#65818e;margin:9px 0 0}'+
 '@media(max-width:590px){#'+PANEL+' .hh328grid{grid-template-columns:1fr}#'+PANEL+'{padding:13px}}';
 document.head.appendChild(s);
}
function render(x){
 var box=el(PANEL),body=el('hh328Body'),meta=el('hh328Meta'),msg=el('hh328Summary');
 if(!box||!body||!meta||!msg)return;
 if(profile()!==x.profile){msg.textContent='⚠ Profilváltás történt: futtasd újra az új profillal.';return}
 meta.textContent=pname(x.profile)+' · '+stamp(x.generatedAt)+' · Kizárólag helyi előnézet';
 msg.classList.add('on');msg.textContent='✅ '+x.available+' adatforrás elérhető · '+x.stale+' régi · '+x.missing+' hiányzó. Kérdés: '+(x.question||'Általános állapotellenőrzés')+'. Az AI-nak semmit nem továbbítottam.';
 body.innerHTML=x.sources.map(function(s){
  var lab=s.status==='available'?'✓ van adat':s.status==='stale'?'⏳ régi adat':'– nincs adat';
  var rows=s.entries.slice(0,10).map(function(v){return '<li><span>'+esc(v.name)+'</span><strong>'+esc(v.value)+(v.unit?' '+esc(v.unit):'')+'</strong><small>'+esc(v.observedAt?stamp(v.observedAt):'összesített adat vagy időpont nélkül')+(v.detail?' · '+esc(v.detail):'')+'</small></li>'}).join('');
  return '<article class="hh328source'+(s.relevant?' priority':'')+'"><div class="hh328head"><b>'+s.icon+' '+esc(s.title)+(s.relevant?' ✨':'')+'</b><span class="hh328badge '+esc(s.status)+'">'+lab+'</span></div>'+
   (rows?'<ul class="hh328items">'+rows+'</ul>':'<p class="hh328hint">Ehhez a forráshoz nincs megjeleníthető adat.</p>')+
   '<p class="hh328hint">'+esc(s.detail)+(s.observedAt?'<br>Legutóbbi adat: '+esc(stamp(s.observedAt)):'')+'</p></article>';
 }).join('');
}
function mount(){
 var page=el('hhLenaSmart299');if(!page)return;
 var box=el(PANEL);
 if(!box){
  css();var parent=page.querySelector('.askWidth');if(!parent)return;
  box=document.createElement('section');box.id=PANEL;box.setAttribute('aria-label','Léna Intelligence adatforrás ellenőrzés');
  box.innerHTML='<h2>🧠 Intelligence · Valódi HealthHub adatok</h2><p class="hh328sub">Első mérföldkő: a meglévő nyolc adatforrásból tényleges értékeket, időpontokat és hiányokat mutatok. Nem végzek diagnózist, nem töltök fel egészségügyi adatot, és nem indítok AI-hívást.</p>'+
   '<div class="hh328top"><button type="button" class="hh328go" id="hh328Run">🔎 Intelligence adatellenőrzés</button><span class="hh328meta" id="hh328Meta">Még nincs ellenőrzés</span></div>'+
   '<div class="hh328summary" role="status" aria-live="polite" id="hh328Summary"></div><div class="hh328grid" id="hh328Body"></div>';
  var anchor=el('askOverall323');anchor=anchor&&anchor.closest('.askCard');
  if(anchor&&anchor.parentNode===parent)parent.insertBefore(box,anchor);else parent.appendChild(box);
  el('hh328Run').addEventListener('click',run);
 }
 if(last&&last.profile===profile()&&!busy)render(last);
}
async function run(){
 mount();var btn=el('hh328Run');if(!btn||busy)return;busy=true;var token=++revision;
 btn.disabled=true;btn.textContent='⏳ Adatok ellenőrzése…';
 var meta=el('hh328Meta');if(meta)meta.textContent='Nyolc HealthHub-adatforrás ellenőrzése…';
 try{
  var p=profile(),q=el('hhSQ299')&&el('hhSQ299').value||'';
  if(typeof window.hhRefreshLenaHealthContext289==='function'){
   var refreshed=await window.hhRefreshLenaHealthContext289(p,'intelligence-context-v328');
   if(!refreshed)throw Error('Nem sikerült frissíteni a helyi Health Contextot. Ellenőrizd az importált méréseket.');
  }
  if(token!==revision||profile()!==p)throw Error('Profilváltás történt az ellenőrzés alatt. Futtasd újra az aktív profilnál.');
  var report=collect(q,p);last=report;render(report);
 }catch(e){var m=el('hh328Summary');if(m){m.classList.add('on');m.textContent='⚠ '+String(e&&e.message||e)}}
 finally{busy=false;if(btn){btn.disabled=false;btn.textContent='🔎 Intelligence adatellenőrzés'}}
}
window.HH_LENA_CONTEXT_BRIDGE_V328={collect:collect,show:mount,run:run,getLast:function(){return last}};
window.addEventListener('healthhub:ask-lena-open',mount);
window.addEventListener('healthhub:profile-changed',function(){revision++;last=null;var box=el(PANEL);if(box){el('hh328Body').innerHTML='';el('hh328Summary').classList.remove('on');el('hh328Meta').textContent='Profilváltás történt · új ellenőrzés szükséges'}});
document.documentElement.dataset.healthhubIntelligenceBridge='1.328';
})();