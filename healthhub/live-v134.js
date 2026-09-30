(function(){
'use strict';

/* HealthRadar parity: activate Upcoming appointments + Home Today appointment row.
   Functional-only change, plus requested icon consistency. */
var DB='healthhub-healthradar-v2';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function toastMsg(s){try{if(window.toast)window.toast(s)}catch(e){}}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function getAllByProfile(store,p){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).index('profile').getAll(p))}finally{db.close()}}
async function one(store,key){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).get(key))}finally{db.close()}}
async function put(store,val){var db=await openDb();try{await reqP(db.transaction(store,'readwrite').objectStore(store).put(val))}finally{db.close()}}
async function del(store,key){var db=await openDb();try{await reqP(db.transaction(store,'readwrite').objectStore(store).delete(key))}finally{db.close()}}

function calSvg(){
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 14v2.2l1.6 1"/><path d="M16 2v3"/><path d="M21 7.3V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2.3"/><path d="M3 9h5.9"/><path d="M8 2v3"/><circle cx="16" cy="16" r="6"/></svg>';
}
function bulbSvg(){
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4"/><path d="M8.5 15.5A6 6 0 1 1 15.5 15.5c-.9.7-1.5 1.4-1.5 2.5h-4c0-1.1-.6-1.8-1.5-2.5z"/></svg>';
}
function fmtShort(a){
 if(!a)return 'Nincs betervezett';
 var d=new Date(a.appointmentDate+'T00:00:00');
 if(isNaN(d.getTime()))return a.appointmentDate||'Időpont';
 return new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric'}).format(d).replace('.','.');
}
function fmtLong(a){
 if(!a)return '';
 var d=new Date(a.appointmentDate+'T00:00:00');
 var date=isNaN(d.getTime())?(a.appointmentDate||''):new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(d);
 var time=a.startTime?(' · '+a.startTime+(a.endTime?'–'+a.endTime:'')):'';
 return date+time;
}
function apptTs(a){
 var d=a&&a.appointmentDate?a.appointmentDate:'9999-12-31',t=a&&a.startTime?a.startTime:'00:00';
 var n=Date.parse(d+'T'+t+':00');return Number.isFinite(n)?n:Infinity;
}
async function upcoming(){
 var arr=await getAllByProfile('appointments',pkey()),now=Date.now()-60000;
 return arr.filter(function(a){return apptTs(a)>=now}).sort(function(a,b){return apptTs(a)-apptTs(b)});
}

function ensureStyle(){
 if(document.getElementById('hh-v134-style'))return;
 var s=document.createElement('style');s.id='hh-v134-style';
 s.textContent=
 '.todayRow.hhUpcomingRow{cursor:pointer}.todayRow.hhUpcomingRow:hover{background:color-mix(in srgb,var(--soft) 55%,transparent);border-radius:12px;padding-left:4px;padding-right:4px}'+
 '.todayRow .ico.hhTodayIcon{width:31px;height:31px;border-radius:10px;background:var(--soft);color:var(--a);display:grid;place-items:center;flex:0 0 31px}'+
 '.todayRow .ico.hhTodayIcon svg{width:16px;height:16px}'+
 '.hhCalendarHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}'+
 '.hhCalendarTitle{display:flex;align-items:flex-start;gap:9px}.hhCalendarTitle .hrIco svg{width:18px;height:18px}';
 document.head.appendChild(s);
}

function reorderToday(){
 var card=document.querySelector('#home .todayCard');if(!card)return;
 var insight=document.getElementById('todayInsight'),next=document.getElementById('homeNext');
 var insightRow=insight&&insight.closest('.todayRow'),nextRow=next&&next.closest('.todayRow');
 if(!insightRow||!nextRow)return;

 nextRow.classList.add('hhUpcomingRow');
 nextRow.setAttribute('role','button');nextRow.tabIndex=0;
 nextRow.onclick=function(){window.hhOpenNearestAppointment()};
 nextRow.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();window.hhOpenNearestAppointment()}};

 var ni=nextRow.querySelector('.ico');
 if(ni){ni.classList.add('hhTodayIcon');ni.innerHTML=calSvg()}
 var ii=insightRow.querySelector('.ico');
 if(ii){ii.classList.add('hhTodayIcon');ii.innerHTML=bulbSvg()}

 if(card.children[1]!==nextRow) card.insertBefore(nextRow,card.children[1]);
 if(nextRow.nextElementSibling!==insightRow) card.insertBefore(insightRow,nextRow.nextElementSibling);

 var b=nextRow.querySelector('b');if(b&&b.id==='homeNext'&&b.textContent==='Nincs betervezett')b.textContent='Nincs közelgő időpont';
}

async function syncToday(){
 ensureStyle();reorderToday();
 var arr=await upcoming(),a=arr[0]||null;
 var n=document.getElementById('homeNext'),s=document.getElementById('homeNextSub');
 if(n)n.textContent=a?fmtShort(a):'Nincs közelgő időpont';
 if(s)s.textContent=a?((a.title||'Orvosi időpont')+(a.startTime?' · '+a.startTime:'')):'következő időpont';
 var row=n&&n.closest('.todayRow');if(row){row.dataset.apptId=a?a.id:'';row.style.opacity=a?'1':'.72'}
 reorderToday();
}

window.hhOpenNearestAppointment=async function(){
 var arr=await upcoming(),a=arr[0];if(!a){toastMsg('Nincs közelgő orvosi időpont.');return}
 await window.hhOpenAppointments();
 setTimeout(function(){if(window.openHrDetail)window.openHrDetail('appointment',a.id)},60);
};

function ensureManager(){
 if(document.getElementById('hhAppointmentOverlay'))return;
 var o=document.createElement('div');o.id='hhAppointmentOverlay';o.className='hrDetailOverlay';
 o.onclick=function(e){if(e.target===o)o.classList.remove('on')};
 o.innerHTML='<div class="hrDetailSheet"><div class="hrSheetHandle"></div><button class="hrClose" onclick="document.getElementById(\'hhAppointmentOverlay\').classList.remove(\'on\')">×</button><div id="hhAppointmentContent"></div></div>';
 document.body.appendChild(o);
}
function apptForm(a){
 a=a||{profile:pkey(),title:'',appointmentDate:'',startTime:'',endTime:'',location:'',notes:''};
 return '<h2>'+(a.id?'Időpont szerkesztése':'Új orvosi időpont')+'</h2><div class="hrDetailMeta">'+esc(pname())+'</div>'+
 '<label><h4>Megnevezés</h4><input id="hhApTitle" value="'+esc(a.title||'')+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 10px"></label>'+
 '<div class="hrStatGrid"><label><h4>Dátum</h4><input id="hhApDate" type="date" value="'+esc(a.appointmentDate||'')+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 8px"></label>'+
 '<label><h4>Kezdés</h4><input id="hhApStart" type="time" value="'+esc(a.startTime||'')+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 8px"></label></div>'+
 '<div class="hrStatGrid"><label><h4>Vége</h4><input id="hhApEnd" type="time" value="'+esc(a.endTime||'')+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 8px"></label>'+
 '<label><h4>Helyszín</h4><input id="hhApLocation" value="'+esc(a.location||'')+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 10px"></label></div>'+
 '<label><h4>Megjegyzés</h4><textarea id="hhApNotes" style="width:100%;box-sizing:border-box;min-height:76px;border:1px solid #dfe7ed;border-radius:12px;padding:9px 10px">'+esc(a.notes||'')+'</textarea></label>'+
 '<div class="vaultTools"><button class="vaultBtn primary" onclick="hhSaveAppointment(\''+esc(a.id||'')+'\')">Mentés</button>'+(a.id?'<button class="vaultBtn" onclick="hhDeleteAppointment(\''+esc(a.id)+'\')">Törlés</button>':'')+'</div>';
}
window.hhManageAppointments=async function(id){
 ensureManager();var a=id?await one('appointments',id):null;
 document.getElementById('hhAppointmentContent').innerHTML=apptForm(a);document.getElementById('hhAppointmentOverlay').classList.add('on');
};
window.hhSaveAppointment=async function(id){
 var title=(document.getElementById('hhApTitle').value||'').trim(),date=document.getElementById('hhApDate').value,start=document.getElementById('hhApStart').value;
 if(!title||!date||!start){toastMsg('A megnevezés, dátum és kezdési idő szükséges.');return}
 var old=id?await one('appointments',id):null;
 var a=old||{id:crypto.randomUUID(),profile:pkey(),createdAt:new Date().toISOString()};
 a.profile=pkey();a.title=title;a.appointmentDate=date;a.startTime=start;a.endTime=document.getElementById('hhApEnd').value||'';a.location=(document.getElementById('hhApLocation').value||'').trim();a.notes=(document.getElementById('hhApNotes').value||'').trim();a.source=a.source||'healthhub_local';a.updatedAt=new Date().toISOString();
 await put('appointments',a);document.getElementById('hhAppointmentOverlay').classList.remove('on');toastMsg('Időpont mentve');await window.hhOpenAppointments();await syncToday();
};
window.hhDeleteAppointment=async function(id){
 if(!id)return;await del('appointments',id);document.getElementById('hhAppointmentOverlay').classList.remove('on');toastMsg('Időpont törölve');await window.hhOpenAppointments();await syncToday();
};

window.hhOpenAppointments=async function(){
 if(typeof window.show==='function')window.show('healthSection');
 window.healthSectionKind='appointments';
 var title=document.getElementById('healthSubTitle'),profile=document.getElementById('healthSubProfile'),banner=document.getElementById('healthMigrationBanner'),root=document.getElementById('healthSubContent');
 if(profile)profile.textContent=pname();if(title)title.textContent='Közelgő orvosi időpontok';
 if(banner){banner.className='migrationBanner ok';banner.innerHTML='<b>📅 Egészségügyi naptár</b><br>'+esc(pname())+' következő vizsgálatai egy helyen.'}
 if(!root)return;
 var arr=await upcoming();
 var rows=arr.length?arr.map(function(a,i){
   var map=a.location?' · '+a.location:'';
   return '<div class="hrRow clickable" onclick="openHrDetail(\'appointment\',\''+esc(a.id)+'\')"><div class="hrIco">'+calSvg()+'</div><div><b>'+esc(a.title||'Időpont')+'</b><small>'+esc(fmtLong(a)+map)+'</small></div><span class="hrTag">'+(i===0?'következő':'időpont')+'</span></div>';
 }).join(''):'<div class="hrEmpty">Nincs közelgő időpont.</div>';
 root.innerHTML='<div class="hrSectionCard"><div class="hhCalendarHead"><div class="hhCalendarTitle"><div class="hrIco">'+calSvg()+'</div><div><div style="font-size:7px;font-weight:900;letter-spacing:.13em;color:#317f77;text-transform:uppercase">Egészségügyi naptár</div><h3 style="margin:4px 0 3px">Közelgő orvosi időpontok</h3><small style="color:#70869a">'+esc(pname())+' következő vizsgálatai egy helyen.</small></div></div><button class="vaultBtn" onclick="hhManageAppointments()">＋ Naptár kezelése</button></div>'+rows+'</div>';
 if(window.hhEnsureHealthProfileSwitches)window.hhEnsureHealthProfileSwitches();
};

const oldSet=window.setProfile;
if(typeof oldSet==='function'){
 window.setProfile=function(p){var r=oldSet.apply(this,arguments);setTimeout(function(){syncToday();if(window.healthSectionKind==='appointments')window.hhOpenAppointments()},60);return r};
}
const oldShow=window.show;
if(typeof oldShow==='function'){
 window.show=function(id){var r=oldShow.apply(this,arguments);if(id==='home')setTimeout(syncToday,40);return r};
}

ensureStyle();ensureManager();syncToday();
setTimeout(syncToday,350);setTimeout(syncToday,1200);
document.documentElement.dataset.healthhubAppointments='1.34';
window.HH_LIVE_BUILD='v1.34-appointments';
})();