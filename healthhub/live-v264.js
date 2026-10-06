(function(){
'use strict';
/* HealthHub v264 — canonical HealthRadar landing renderer. */
var DB='healthhub-healthradar-v2',LEGACY='hh-health-vault-v1',renderSeq=0;
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function byProfile(store,profile){var db=await openDb();try{if(!db.objectStoreNames.contains(store))return[];var s=db.transaction(store,'readonly').objectStore(store);if(s.indexNames.contains('profile'))return await reqP(s.index('profile').getAll(profile))||[];return(await reqP(s.getAll())||[]).filter(function(x){return x&&x.profile===profile})}finally{db.close()}}
function meds(profile){try{var v=JSON.parse(localStorage.getItem(LEGACY)||'null');return v&&v.profiles&&v.profiles[profile]&&Array.isArray(v.profiles[profile].medications)?v.profiles[profile].medications:[]}catch(e){return[]}}
function ms(x){return Date.parse(x&&x.measuredAt||x&&x.documentDate||x&&x.appointmentDate||x&&x.uploadedAt||0)||0}
function fmt(v){var d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'}):''}
function latest(a,fn){return a.filter(fn).sort(function(x,y){return ms(y)-ms(x)})[0]||null}
function setKpi(i,label,value,unit,status,has){var c=document.querySelector('#health .kpis .kpi:nth-child('+i+')');if(!c)return;var l=c.querySelector('.lab'),v=c.querySelector('.val'),u=c.querySelector('.unit'),o=c.querySelector('.ok');if(l)l.textContent=label;if(v)v.textContent=value==null?'—':String(value);if(u)u.textContent=unit||'';if(o)o.textContent=status||'';c.querySelectorAll('.spark,.bars').forEach(function(x){x.style.opacity=has?'.55':'.13'});c.onclick=function(){window.openHealthSection&&window.openHealthSection('measurements')}}
function clear(card){if(card)card.querySelectorAll('.row,.hrEmpty').forEach(function(x){x.remove()})}
function docIcon(){return '<span class="ric">📄</span>'}
function pillIcon(){return '<span class="ric">💊</span>'}
function row(icon,title,sub,click){return '<div class="row" onclick="'+click+'">'+icon+'<span class="rt"><b>'+esc(title)+'</b><small>'+esc(sub||'')+'</small></span>›</div>'}
function at(a){var d=a&&a.appointmentDate||a&&a.date||'';if(!d)return Infinity;var s=String(d);if(s.indexOf('T')<0)s+='T'+String(a.startTime||'00:00')+':00';var n=Date.parse(s);return Number.isFinite(n)?n:Infinity}
async function sync(profileOverride){var seq=++renderSeq,profile=profileOverride||pkey();if(typeof window.hhEnsureHealthProfile==='function'){try{await window.hhEnsureHealthProfile(profile)}catch(e){}}var d=await Promise.all([byProfile('documents',profile),byProfile('measurements',profile),byProfile('appointments',profile)]);if(seq!==renderSeq||pkey()!==profile)return false;var docs=d[0],meas=d[1],apps=d[2],ml=meds(profile);docs.sort(function(a,b){return ms(b)-ms(a)});meas.sort(function(a,b){return ms(b)-ms(a)});
 var bp=latest(meas,function(x){return x.systolic!=null&&x.diastolic!=null}),gl=latest(meas,function(x){return x.bloodGlucose!=null}),wt=latest(meas,function(x){return x.weightKg!=null});
 setKpi(1,'❤ Vérnyomás',bp?(Math.round(bp.systolic)+'/'+Math.round(bp.diastolic)):'—','mmHg',bp?('Utolsó: '+fmt(bp.measuredAt)):'Nincs importált adat',!!bp);
 setKpi(2,'💧 Vércukor',gl?gl.bloodGlucose:'—','mmol/L',gl?('Utolsó: '+fmt(gl.measuredAt)):'Nincs importált adat',!!gl);
 setKpi(3,'⚖ Testsúly',wt?wt.weightKg:'—','kg',wt?('Utolsó: '+fmt(wt.measuredAt)):'Nincs importált adat',!!wt);
 var cards=document.querySelectorAll('#health .listCard');
 if(cards[0]){var h1=cards[0].querySelector('.listHead span');if(h1){h1.textContent='Összes ›';h1.onclick=function(e){e.stopPropagation();window.openHealthSection&&window.openHealthSection('records')}}clear(cards[0]);var r=docs.slice(0,3);cards[0].insertAdjacentHTML('beforeend',r.length?r.map(function(x){return row(docIcon(),x.originalName||x.title||'Lelet',[fmt(x.documentDate||x.uploadedAt),x.category].filter(Boolean).join(' · '),"hhOpenDocumentDetail('"+String(x.id).replace(/'/g,"\\'")+"')")}).join(''):'<div class="hrEmpty">Nincs importált lelet.</div>');cards[0].onclick=null}
 if(cards[1]){var h2=cards[1].querySelector('.listHead span');if(h2){h2.textContent='Összes ›';h2.onclick=function(e){e.stopPropagation();window.openHealthSection&&window.openHealthSection('medications')}}clear(cards[1]);cards[1].insertAdjacentHTML('beforeend',ml.length?ml.slice(0,3).map(function(x){return row(pillIcon(),x.name||'Gyógyszer',x.dose||x.status||'',"openHrDetail('medication','"+String(x.id||'').replace(/'/g,"\\'")+"')")}).join(''):'<div class="hrEmpty">Nincs importált gyógyszer.</div>');cards[1].onclick=null}
 var ins=document.getElementById('insightH');if(ins)ins.textContent=docs.length+' lelet, '+ml.length+' gyógyszer és '+meas.length+' mérés érhető el a privát kartonban.';var ti=document.getElementById('todayInsight');if(ti)ti.textContent='A HealthRadar karton elérhető: '+docs.length+' lelet és '+meas.length+' mérés.';
 var future=apps.filter(function(x){return at(x)>=Date.now()-60000}).sort(function(a,b){return at(a)-at(b)}),ap=future[0]||null,n=document.getElementById('nextH'),ns=document.getElementById('nextSub');if(n)n.textContent=ap?fmt(ap.appointmentDate||ap.date):'Nincs betervezett';if(ns)ns.textContent=ap?(ap.title||'orvosi időpont'):'időpont';document.documentElement.dataset.hhHealthLandingProfile=profile;return true}
window.hhSyncHealthDashboard=sync;window.hhSyncHealthLanding264=sync;
window.addEventListener('healthhub:profile-changed',function(e){var p=e&&e.detail&&e.detail.profile||pkey();setTimeout(function(){sync(p)},25);setTimeout(function(){sync(p)},180)});
window.addEventListener('healthhub:health-cloud-synced',function(e){var p=e&&e.detail&&e.detail.profile;if(p&&p!==pkey())return;setTimeout(function(){sync(pkey())},80)});
var ps=window.show;if(typeof ps==='function')window.show=function(id){var r=ps.apply(this,arguments);if(id==='health')setTimeout(function(){sync(pkey())},20);return r};
setTimeout(function(){sync(pkey())},80);setTimeout(function(){sync(pkey())},500);
document.documentElement.dataset.healthhubHealthLandingCanonical='1.264';window.HH_LIVE_BUILD='v264-health-landing-canonical-data';
})();
