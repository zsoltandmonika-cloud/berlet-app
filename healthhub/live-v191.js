(function(){
'use strict';
/* HealthHub v1.94 — Activity clean rebuild + Health Connect Pilates classification */
var DB='healthhub-connect-v1';
var MANUAL_KEY='hh-activity-manual-v185-';
var state=window.hhActivity191State||{period:'1d'};window.hhActivity191State=state;
var activityRenderSeq=0;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function activeProfileCode(){
 try{
  if(typeof cur!=='undefined'&&(cur==='m'||cur==='z'))return cur;
 }catch(e){}
 return localStorage.getItem('hh-profile')==='m'?'m':'z';
}
function pkey(){return activeProfileCode()==='m'?'monika':'zsolt'}
function n(v,d){v=Number(v);return Number.isFinite(v)?v.toLocaleString('hu-HU',{maximumFractionDigits:d==null?0:d}):'—'}
function req(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,2);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function dayKey(v){var d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):''}
function mins(a,b){var m=(Date.parse(b)-Date.parse(a))/60000;return Number.isFinite(m)&&m>0?m:0}
function dur(m){m=Math.round(Number(m)||0);var h=Math.floor(m/60),x=m%60;return h?(h+':'+String(x).padStart(2,'0')):(m+'p')}
function fmtDate(v){var d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
function periodDays(){return state.period==='1d'?1:state.period==='7d'?7:state.period==='30d'?30:365}
function cutMs(){var d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(periodDays()-1));return d.getTime()}
function avg(a){return a.length?a.reduce(function(x,y){return x+y},0)/a.length:null}
function pct(v,g){return g>0?Math.max(0,Math.min(100,Math.round((Number(v)||0)/g*100))):0}
function pace(min,km){if(!km||km<=0)return '—';var x=min/km,mi=Math.floor(x),se=Math.round((x-mi)*60);return mi+':'+String(se).padStart(2,'0')}
function profileLabel(){return pkey()==='monika'?'Mónika':'Zsolt'}

var CATS=[
 {k:'walk',label:'Gyaloglás',short:'Séta',color:'#ff2f7f'},
 {k:'run',label:'Futás',short:'Futás',color:'#ff9418'},
 {k:'bike',label:'Kerékpár',short:'Kerékpár',color:'#168df0'},
 {k:'workout',label:'Edzés',short:'Edzés',color:'#7b3ee7'},
 {k:'yoga',label:'Jóga',short:'Jóga',color:'#f39a16'},
 {k:'pilates',label:'Pilates',short:'Pilates',color:'#ff4f91'},
 {k:'hike',label:'Túrázás',short:'Túrázás',color:'#12b879'},
 {k:'other',label:'Egyéb',short:'Egyéb',color:'#9738e8'}
];
function cat(k){return CATS.find(function(x){return x.k===k})||CATS[7]}
function infer(s){
 var q=(((s&&s.title)||'')+' '+((s&&s.manualType)||'')).toLocaleLowerCase('hu-HU'),t=Number(s&&s.exerciseType);
 if(q.includes('pilat')||t===48)return'pilates';
 if(q.includes('jóga')||q.includes('yoga')||t===79)return'yoga';
 if(q.includes('túra')||q.includes('hike')||t===16)return'hike';
 if(q.includes('séta')||q.includes('gyalog')||q.includes('walk')||t===56)return'walk';
 if(q.includes('fut')||q.includes('run')||t===20)return'run';
 if(q.includes('kerék')||q.includes('bike')||q.includes('cycl')||t===2)return'bike';
 if(q.includes('edzés')||q.includes('erős')||q.includes('strength')||t===35)return'workout';
 return'other';
}
function icon(k){
 var c=cat(k).color,shadow='filter="drop-shadow(0 2px 2px rgba(18,58,89,.16))"';
 if(k==='bike')return '<svg viewBox="0 0 64 64" '+shadow+'><g fill="none" stroke="'+c+'" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="45" r="10"/><circle cx="49" cy="45" r="10"/><path d="M15 45l12-22 12 22H15l14-13h14"/><path d="M31 18h10"/></g></svg>';
 if(k==='workout')return '<svg viewBox="0 0 64 64" '+shadow+'><g fill="'+c+'"><rect x="7" y="22" width="7" height="20" rx="3"/><rect x="15" y="18" width="7" height="28" rx="3"/><rect x="42" y="18" width="7" height="28" rx="3"/><rect x="50" y="22" width="7" height="20" rx="3"/><rect x="20" y="29" width="24" height="6" rx="3"/></g></svg>';
 if(k==='yoga')return '<svg viewBox="0 0 64 64" '+shadow+'><circle cx="32" cy="13" r="7" fill="'+c+'"/><path d="M32 22c-6 0-10 5-10 11v5l-9 7c-3 2-1 7 3 6l16-5 16 5c4 1 6-4 3-6l-9-7v-5c0-6-4-11-10-11z" fill="'+c+'"/><path d="M20 54h24" stroke="'+c+'" stroke-width="5" stroke-linecap="round"/></svg>';
 if(k==='pilates')return '<svg viewBox="0 0 64 64" '+shadow+'><circle cx="21" cy="14" r="6" fill="'+c+'"/><path d="M24 22l9 9 13-9M33 31l-8 13M33 31l14 8M25 44l-11 5M47 39l6 11" fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round"/><circle cx="48" cy="49" r="7" fill="none" stroke="'+c+'" stroke-width="4"/></svg>';
 if(k==='hike')return '<svg viewBox="0 0 64 64" '+shadow+'><circle cx="30" cy="11" r="6" fill="'+c+'"/><path d="M26 19l-6 15 9 7 3 14M24 31l15-4 8 9M35 24l10 8M48 28v28" fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 if(k==='other')return '<svg viewBox="0 0 64 64" '+shadow+'><g fill="'+c+'"><path d="M32 7l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"/><path d="M49 34l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M15 38l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g></svg>';
 var run=k==='run';
 return '<svg viewBox="0 0 64 64" '+shadow+'><circle cx="'+(run?38:32)+'" cy="10" r="6" fill="'+c+'"/><g fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">'+(run?'<path d="M34 20l-10 9 10 8 9-12 9 5M34 37l-10 17M35 38l15 12"/>':'<path d="M31 20l-6 15 7 9 1 12M26 31l-10 8M32 43l12 9"/>')+'</g></svg>';
}
function kpiIcon(k){
 var c={steps:'#1597ef',cal:'#ff8b12',time:'#12ba82',dist:'#6b45ee',heart:'#ff387b',max:'#ff387b',pace:'#ff387b',elev:'#ff387b'}[k]||'#1597ef';
 if(k==='steps')return '<svg viewBox="0 0 64 64"><g fill="'+c+'"><ellipse cx="22" cy="20" rx="9" ry="14" transform="rotate(-15 22 20)"/><ellipse cx="42" cy="35" rx="9" ry="14" transform="rotate(-15 42 35)"/><circle cx="15" cy="41" r="4"/><circle cx="20" cy="47" r="3"/><circle cx="48" cy="55" r="4"/></g></svg>';
 if(k==='cal')return '<svg viewBox="0 0 64 64"><path d="M36 6c3 13-8 17-4 28 3-5 8-8 12-13 8 8 12 15 10 24-2 10-11 16-22 16S12 53 12 42c0-13 10-20 24-36z" fill="'+c+'"/><path d="M33 34c5 6 7 10 5 15-1 4-4 7-8 7-5 0-9-4-9-9 0-6 5-9 12-13z" fill="#ffd09b"/></svg>';
 if(k==='time')return '<svg viewBox="0 0 64 64"><g fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round"><circle cx="32" cy="35" r="20"/><path d="M32 35V23M26 8h12M32 8v7"/></g></svg>';
 if(k==='dist')return '<svg viewBox="0 0 64 64"><g fill="'+c+'"><path d="M18 7c-9 0-15 6-15 15 0 12 15 26 15 26s15-14 15-26C33 13 27 7 18 7zm0 20a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/><path d="M45 16c-9 0-15 6-15 15 0 12 15 26 15 26s15-14 15-26c0-9-6-15-15-15zm0 20a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/></g></svg>';
 if(k==='max')return '<svg viewBox="0 0 64 64"><path d="M7 49l15-24 8 11 10-18 17 31z" fill="'+c+'"/><path d="M39 12l2 4 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="'+c+'"/></svg>';
 if(k==='pace')return '<svg viewBox="0 0 64 64"><g fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round"><path d="M12 44a20 20 0 0 1 40 0"/><path d="M32 44l12-14"/></g><circle cx="32" cy="44" r="5" fill="'+c+'"/></svg>';
 if(k==='elev')return '<svg viewBox="0 0 64 64"><g fill="'+c+'"><rect x="8" y="39" width="7" height="17" rx="3"/><rect x="19" y="29" width="7" height="27" rx="3"/><rect x="30" y="19" width="7" height="37" rx="3"/><rect x="41" y="10" width="7" height="46" rx="3"/></g></svg>';
 return '<svg viewBox="0 0 64 64"><path d="M32 55S8 42 8 24c0-9 6-15 14-15 5 0 9 3 10 7 2-4 6-7 11-7 8 0 14 6 14 15 0 18-25 31-25 31z" fill="'+c+'"/></svg>';
}
function heroSrc(){return window.HH_ACTIVITY_HERO_V192?'data:image/webp;base64,'+window.HH_ACTIVITY_HERO_V192:'./assets/activity-hero-v184.webp'}

function manualLoad(profile){profile=profile||pkey();try{var a=JSON.parse(localStorage.getItem(MANUAL_KEY+profile)||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
async function cloudBundle(profile){
 try{
  var v=window.HH_DROPBOX_VAULT,p=profile||pkey();
  if(!v||!v.connected||!v.connected()||typeof v.downloadJson!=='function')return null;
  var raw=null,path='/HealthHub/profiles/'+p+'-health-connect.json';
  try{raw=await v.downloadJson(path)}catch(e){
   if(e&&e.status!==409)throw e;
   path='/incoming-'+p+'.json';
   raw=await v.downloadJson(path);
  }
  if(!raw||String(raw.profile||'').toLowerCase()!==p)return null;
  localStorage.setItem('hh-activity-cloud-last-'+p,new Date().toISOString());
  localStorage.setItem('hh-activity-cloud-exported-'+p,String(raw.exportedAt||''));
  return {id:'cloud-'+p,profile:p,importedAt:raw.exportedAt||new Date().toISOString(),fileName:path,schemaVersion:raw.schemaVersion||'',bundle:raw,_cloud:true};
 }catch(e){
  console.warn('Activity Cloud read failed',e);
  localStorage.setItem('hh-activity-cloud-error-'+(profile||pkey()),String(e&&e.message||e));
  return null;
 }
}
function manualSession(x){return {id:x.id,title:cat(x.type).label,manualType:x.type,startTime:x.startTime,endTime:new Date(Date.parse(x.startTime)+(Number(x.duration)||0)*60000).toISOString(),distanceKm:Number(x.distance)||0,caloriesKcal:Number(x.calories)||0,avgBpm:Number(x.avgBpm)||0,_manual:true}}
async function load(profile){
 profile=profile||pkey();
 var out={imports:[],activity:[]};
 try{var db=await openDb();try{var tx=db.transaction(['imports','activity']);out.imports=await req(tx.objectStore('imports').getAll())||[];out.activity=await req(tx.objectStore('activity').getAll())||[]}finally{db.close()}}catch(e){}
 out.imports=out.imports.filter(function(x){return x.profile===profile&&x.bundle});
 out.activity=out.activity.filter(function(x){return x.profile===profile});
 var cloud=await cloudBundle(profile);
 if(cloud){
  /* Activity needs the profile-filtered local bridge cache as well as fresh Cloud data.
     Both are already scoped to the requested profile, so keep them together. */
  out.imports=out.imports.filter(function(x){return !x._cloud});
  out.imports.unshift(cloud);
  var da=cloud.bundle&&cloud.bundle.records&&cloud.bundle.records.dailyActivity;
  if(Array.isArray(da))da.forEach(function(x){
   if(!x||!x.date)return;
   out.activity.push({
    id:'cloud-activity-'+profile+'-'+x.date,
    profile:profile,
    date:x.date,
    steps:Number(x.steps)||0,
    distanceMeters:Number(x.distanceMeters)||0,
    caloriesKcal:Number(x.caloriesKcal)||Number(x.activeCaloriesKcal)||0,
    activeCaloriesKcal:Number(x.activeCaloriesKcal)||Number(x.caloriesKcal)||0,
    activeMinutes:Number(x.activeMinutes)||0,
    source:'dropbox-health-connect',
    updatedAt:cloud.importedAt
   });
  });
 }
 return out;
}
function collect(raw,profile){
 var sm=new Map(),dm=new Map(),hm=new Map();
 raw.imports.sort(function(a,b){return Date.parse(b.importedAt||0)-Date.parse(a.importedAt||0)}).forEach(function(imp){
  var r=imp.bundle&&imp.bundle.records||{};
  (Array.isArray(r.exerciseSessions)?r.exerciseSessions:[]).forEach(function(s){var id=String(s.id||s.startTime+'|'+s.endTime);if(!sm.has(id))sm.set(id,s)});
  (Array.isArray(r.dailyActivity)?r.dailyActivity:[]).forEach(function(x){if(x&&x.date&&!dm.has(x.date))dm.set(x.date,x)});
  (Array.isArray(r.heartRate)?r.heartRate:[]).forEach(function(hr){(Array.isArray(hr.samples)?hr.samples:[]).forEach(function(s){var k=String(s.time)+'|'+String(s.bpm);if(!hm.has(k))hm.set(k,s)})});
 });
 raw.activity.forEach(function(x){if(x&&x.date){var old=dm.get(x.date)||{};dm.set(x.date,Object.assign({},old,x))}});
 manualLoad(profile).forEach(function(x){sm.set(x.id,manualSession(x))});
 return {sessions:Array.from(sm.values()).sort(function(a,b){return Date.parse(b.endTime||b.startTime||0)-Date.parse(a.endTime||a.startTime||0)}),daily:Array.from(dm.values()).sort(function(a,b){return String(a.date).localeCompare(String(b.date))}),heart:Array.from(hm.values()).sort(function(a,b){return Date.parse(a.time||0)-Date.parse(b.time||0)})};
}
function hrIn(cut,heart){return heart.filter(function(x){var t=Date.parse(x.time),b=Number(x.bpm);return t>=cut&&Number.isFinite(b)}).map(function(x){return Number(x.bpm)})}
function distanceOf(s){var d=Number(s.distanceKm);if(d>0)return d;d=Number(s.distanceMeters);return d>0?d/1000:null}
function caloriesOf(s){var c=Number(s.caloriesKcal);if(c>0)return c;c=Number(s.energyKcal);return c>0?c:null}
function sessionHr(s,heart){if(Number(s.avgBpm)>0)return Number(s.avgBpm);var a=Date.parse(s.startTime),b=Date.parse(s.endTime),v=heart.filter(function(x){var t=Date.parse(x.time),z=Number(x.bpm);return t>=a&&t<=b&&Number.isFinite(z)}).map(function(x){return Number(x.bpm)});return avg(v)}
function metrics(c){
 var cut=cutMs(),daily=c.daily.filter(function(x){return Date.parse(x.date+'T23:59:59')>=cut}),sessions=c.sessions.filter(function(s){return Date.parse(s.endTime||s.startTime||0)>=cut});
 var steps=daily.reduce(function(a,x){return a+(Number(x.steps)||0)},0);
 var cal=daily.reduce(function(a,x){var v=Number(x.activeCaloriesKcal);if(!Number.isFinite(v))v=Number(x.caloriesKcal);return a+(Number.isFinite(v)?v:0)},0);
 var dist=daily.reduce(function(a,x){return a+(Number(x.distanceMeters)||0)/1000},0);
 var manual=sessions.filter(function(s){return s._manual});cal+=manual.reduce(function(a,s){return a+(caloriesOf(s)||0)},0);dist+=manual.reduce(function(a,s){return a+(distanceOf(s)||0)},0);
 var dailyActive=daily.reduce(function(a,x){return a+(Number(x.activeMinutes)||0)},0);
 var sessionActive=sessions.reduce(function(a,s){return a+mins(s.startTime,s.endTime)},0);
 var active=dailyActive>0?dailyActive:sessionActive;
 var moving=sessions.filter(function(s){var k=infer(s);return (k==='walk'||k==='run')&&(distanceOf(s)||0)>0});
 var movingMin=moving.reduce(function(a,s){return a+mins(s.startTime,s.endTime)},0),movingKm=moving.reduce(function(a,s){return a+(distanceOf(s)||0)},0);
 var hv=hrIn(cut,c.heart),ah=avg(hv),mh=hv.length?Math.max.apply(null,hv):null;
 var factor=periodDays(),goals={steps:10000*factor,cal:500*factor,active:60*factor,dist:8*factor};
 return {cut:cut,daily:daily,sessions:sessions,steps:steps,cal:cal,dist:dist,active:active,avgHr:ah,maxHr:mh,pace:pace(movingMin,movingKm),goals:goals};
}
function kpi(kind,label,val,unit,p,goal,accent){
 return '<div class="a191Kpi '+accent+'"><div class="a191KpiIcon">'+kpiIcon(kind)+'</div><small>'+esc(label)+'</small><div class="a191Value"><b>'+val+'</b><em>'+esc(unit||'')+'</em></div>'+(goal?'<div class="a191Progress"><i style="width:'+p+'%"></i></div><div class="a191Goal"><b>'+p+'%</b><span>Cél: '+esc(goal)+'</span></div>':'')+'</div>';
}
function chart(c,m){
 var rows=m.daily.slice(-(state.period==='365d'?30:periodDays())),w=760,h=130,l=42,r=38,t=12,b=24;
 if(!rows.length)return '<div class="a191Empty">Még nincs aktivitásadat ehhez az időszakhoz.</div>';
 var maxS=Math.max.apply(null,rows.map(function(x){return Number(x.steps)||0}).concat([1])),maxC=Math.max.apply(null,rows.map(function(x){return Number(x.caloriesKcal)||0}).concat([1]));
 var gap=(w-l-r)/rows.length,bw=Math.max(3,Math.min(14,gap*.28)),bars='',pts=[];
 var hrBy={};c.heart.forEach(function(x){var k=dayKey(x.time),v=Number(x.bpm);if(!Number.isFinite(v)||Date.parse(x.time)<m.cut)return;(hrBy[k]||(hrBy[k]=[])).push(v)});
 rows.forEach(function(x,i){var xx=l+i*gap,sv=Number(x.steps)||0,cv=Number(x.caloriesKcal)||0,sh=(h-t-b)*sv/maxS,ch=(h-t-b)*cv/maxC;bars+='<rect x="'+(xx+gap*.17).toFixed(1)+'" y="'+(h-b-sh).toFixed(1)+'" width="'+bw+'" height="'+sh.toFixed(1)+'" rx="2" fill="#22a5f2"/><rect x="'+(xx+gap*.54).toFixed(1)+'" y="'+(h-b-ch).toFixed(1)+'" width="'+bw+'" height="'+ch.toFixed(1)+'" rx="2" fill="#ff9418"/>';var av=avg(hrBy[x.date]||[]);if(Number.isFinite(av)){var yy=h-b-(h-t-b)*Math.max(0,Math.min(1,(av-60)/120));pts.push((xx+gap*.5).toFixed(1)+','+yy.toFixed(1))}});
 var labels='';var count=Math.min(7,rows.length);for(var j=0;j<count;j++){var idx=Math.round(j*(rows.length-1)/Math.max(1,count-1)),x=l+idx*gap+gap*.5,lab=rows[idx].date.slice(5).replace('-','.');labels+='<text x="'+x+'" y="'+(h-6)+'" text-anchor="middle" font-size="10" fill="#547087">'+lab+'</text>'}
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><line x1="'+l+'" y1="'+(h-b)+'" x2="'+(w-r)+'" y2="'+(h-b)+'" stroke="#dfe8ef"/>'+bars+(pts.length>1?'<polyline points="'+pts.join(' ')+'" fill="none" stroke="#ff2f7f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'')+labels+'</svg>';
}
function categoryCards(c,m){
 var a={};CATS.forEach(function(x){a[x.k]={count:0,min:0,km:0}});
 m.sessions.forEach(function(s){var k=infer(s),o=a[k];o.count++;o.min+=mins(s.startTime,s.endTime);o.km+=distanceOf(s)||0});
 return CATS.map(function(x,i){var o=a[x.k],sub=o.km>0?n(o.km,1)+' km':(o.min>0?Math.round(o.min)+' perc':'0 perc');return '<button class="a191Type '+(i===0?'on':'')+'" onclick="hh191ManualOpen(\''+x.k+'\')"><span>'+icon(x.k)+'</span><b>'+esc(x.label)+'</b><em>'+esc(sub)+'</em><small>'+o.count+' alkalom</small></button>'}).join('');
}
function recent(c){
 return c.sessions.slice(0,5).map(function(s){var ct=cat(infer(s)),d=distanceOf(s),mi=mins(s.startTime,s.endTime),ca=caloriesOf(s),hr=sessionHr(s,c.heart);return '<div class="a191RecentRow"><span class="a191RecentIcon">'+icon(ct.k)+'</span><div class="a191RecentName"><b>'+esc(ct.label)+(s._manual?' · manuális':'')+'</b><small>'+esc(fmtDate(s.startTime))+'</small></div><div class="a191RecentMeta">'+(d?'<span>📍 '+n(d,1)+' km</span>':'')+'<span>◷ '+Math.round(mi)+' perc</span>'+(ca?'<span>🔥 '+n(ca,0)+' kcal</span>':'')+(hr?'<span>♥ '+n(hr,0)+' bpm</span>':'')+'</div><strong>›</strong></div>'}).join('')||'<div class="a191Empty">Nincs rögzített edzés.</div>';
}
function hero(){
 var p=state.period;
 return '<div class="a191Hero"><img src="'+heroSrc()+'" alt="Activity"><div class="a191HeroHits"><button class="runnerProfile" onclick="return hh191ToggleProfile()" aria-label="Futó Léna · profilváltás"></button><button class="cal" onclick="hh191Calendar()" aria-label="Naptár"></button><button class="weather" onclick="hh191Weather()" aria-label="Időjárás"></button><button class="gear" onclick="hh191Settings()" aria-label="Beállítások"></button></div><div class="a191Periods"><button class="'+(p==='1d'?'on':'')+'" onclick="hh191Period(\'1d\')">Ma</button><button class="'+(p==='7d'?'on':'')+'" onclick="hh191Period(\'7d\')">Hét</button><button class="'+(p==='30d'?'on':'')+'" onclick="hh191Period(\'30d\')">Hónap</button><button class="'+(p==='365d'?'on':'')+'" onclick="hh191Period(\'365d\')">Év</button></div></div>';
}
function nav(){
 function svgHome(){return '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/></svg>'}
 function svgHeart(){return '<svg viewBox="0 0 24 24"><path d="M12 21S3 15 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 13-9 13z"/></svg>'}
 function svgDoc(){return '<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6zM14 2v6h6M9 13h6M9 17h6"/></svg>'}
 function svgPill(){return '<svg viewBox="0 0 24 24"><path d="M8.5 20.5a5 5 0 0 1-7-7l8-8a5 5 0 0 1 7 7zM6 9l7 7"/></svg>'}
 return '<nav class="a191Nav"><button onclick="hh191Go(\'home\')"><span>'+svgHome()+'</span><b>Kezdőlap</b></button><button onclick="hh191Go(\'health\')"><span>'+svgHeart()+'</span><b>HealthRadar</b></button><button class="on"><span>'+icon('run')+'</span><b>Activity</b></button><button onclick="hh191Quick(\'Leletek\')"><span>'+svgDoc()+'</span><b>Leletek</b></button><button onclick="hh191Quick(\'Gyógyszerek\')"><span>'+svgPill()+'</span><b>Gyógyszerek</b></button><button onclick="hh191Quick(\'Továbbiak\')"><span class="dots">•••</span><b>Továbbiak</b></button></nav>';
}
async function render(profileOverride){
 var page=document.getElementById('hhActivityPage191');if(!page)return;
 var renderId=++activityRenderSeq,requestedProfile=profileOverride||pkey();
 window.hhActivityRenderedProfile=requestedProfile;
 page.dataset.profile=requestedProfile;
 page.innerHTML=hero()+'<div class="a191Body"><small class="a191ProfileDiag '+(requestedProfile==='monika'?'monika':'zsolt')+'">HEALTH CONNECT · '+(requestedProfile==='monika'?'MÓNIKA':'ZSOLT')+'</small><div class="a191Load">Activity adatok betöltése…</div></div>'+nav();
 var raw=await load(requestedProfile);
 if(renderId!==activityRenderSeq)return;
 var c=collect(raw,requestedProfile),m=metrics(c);window.hhActivity191Cache=c;
 var f=periodDays(),g=m.goals;
 page.innerHTML=hero()+'<div class="a191Body"><small class="a191ProfileDiag '+(requestedProfile==='monika'?'monika':'zsolt')+'">HEALTH CONNECT · '+(requestedProfile==='monika'?'MÓNIKA':'ZSOLT')+'</small>'+
 '<div class="a191Top">'+
 kpi('steps','Lépések',n(m.steps,0),'lépés',pct(m.steps,g.steps),n(g.steps,0),'blue')+
 kpi('cal','Elégetett kalória',n(m.cal,0),'kcal',pct(m.cal,g.cal),n(g.cal,0),'orange')+
 kpi('time','Aktív idő',Math.round(m.active),'perc',pct(m.active,g.active),n(g.active,0),'green')+
 kpi('dist','Távolság',n(m.dist,1),'km',pct(m.dist,g.dist),n(g.dist,1),'violet')+
 '</div>'+
 '<div class="a191Small">'+
 kpi('heart','Átlag pulzus',m.avgHr?n(m.avgHr,0):'—','bpm',0,null,'pink')+
 kpi('max','Max. pulzus',m.maxHr?n(m.maxHr,0):'—','bpm',0,null,'pink')+
 kpi('pace','Tempó',m.pace,'perc/km',0,null,'pink')+
 kpi('elev','Szintemelkedés','—','m',0,null,'pink')+
 '</div>'+
 '<section class="a191Card chart"><div class="a191Head"><span class="pinkbars">▥</span><b>Aktivitás a nap folyamán</b><div class="legend"><i class="b"></i>Lépések<i class="o"></i>Aktív kalória<i class="p"></i>Pulzus (bpm)</div></div><div class="a191Chart">'+chart(c,m)+'</div></section>'+
 '<section class="a191Card types"><div class="a191Head"><span class="runner">'+icon('run')+'</span><b>Aktivitás típusok</b><strong>Összes ›</strong></div><div class="a191Types">'+categoryCards(c,m)+'</div></section>'+
 '<section class="a191Card recent"><div class="a191Head"><span class="clock">◷</span><b>Legutóbbi edzések</b><strong>Összes ›</strong></div><div class="a191Recent">'+recent(c)+'</div></section>'+
 '<section class="a191Card manual"><div class="a191ManualTitle"><span>＋</span><b>Manuális rögzítés</b></div><div class="a191ManualBtns">'+['walk','run','bike','workout','yoga'].map(function(k){var x=cat(k);return '<button onclick="hh191ManualOpen(\''+k+'\')"><span>'+icon(k)+'</span><b>'+esc(x.short)+'</b></button>'}).join('')+'<button onclick="hh191More()"><span class="dots">•••</span><b>További</b></button></div></section>'+
 '</div>'+nav();
}
function modal(html){var m=document.getElementById('hh191Modal');if(!m)return;m.innerHTML='<div class="a191Sheet">'+html+'</div>';m.classList.add('on')}
window.hh191CloseModal=function(){var m=document.getElementById('hh191Modal');if(m)m.classList.remove('on')}
window.hh191Period=function(p){state.period=p;render()}
window.hh191Profile=function(p){
 var code=p==='m'?'m':'z',profile=code==='m'?'monika':'zsolt';
 activityRenderSeq++;
 window.hhActivityRenderedProfile=profile;
 localStorage.setItem('hh-profile',code);
 try{
  if(typeof cur!=='undefined')cur=code;
 }catch(e){}
 if(typeof window.setProfile==='function')window.setProfile(code);
 try{window.dispatchEvent(new CustomEvent('healthhub:profile-changed',{detail:{profile:profile,source:'activity'}}))}catch(e){}
 render(profile);
 return false;
};
window.hh191ToggleProfile=function(){
 var rendered=window.hhActivityRenderedProfile||pkey();
 var next=rendered==='monika'?'z':'m';
 return window.hh191Profile(next);
};
function delegatedActivityProfileClick(e){
 var page=document.getElementById('hhActivityPage191');
 if(!page||!page.classList.contains('on'))return;
 var hero=page.querySelector('.a191Hero');
 if(!hero)return;
 var r=hero.getBoundingClientRect();
 var cx=Number(e.clientX),cy=Number(e.clientY);
 if(!Number.isFinite(cx)||!Number.isFinite(cy))return;
 if(cx<r.left||cx>r.right||cy<r.top||cy>r.bottom)return;
 var x=(cx-r.left)/r.width,y=(cy-r.top)/r.height;
 /* Running Léna only. Keep clear of calendar/weather/settings and period controls. */
 if(x<.27||x>.64||y<.01||y>.87)return;
 e.preventDefault();
 e.stopPropagation();
 if(e.stopImmediatePropagation)e.stopImmediatePropagation();
 window.hh191ToggleProfile();
}
window.hh191Weather=function(){var w=null;try{w=JSON.parse(localStorage.getItem('hh-budapest-weather-v144')||'null')}catch(e){};modal('<div class="a191SheetHead"><div><small>BUDAPEST · IDŐJÁRÁS</small><h3>'+(w&&Number.isFinite(Number(w.temp))?Math.round(w.temp)+' °C':'Időjárás')+'</h3></div><button onclick="hh191CloseModal()">×</button></div><div class="a191Weather">'+(w?'<b>'+Math.round(w.temp)+' °C</b><span>Hőérzet: '+Math.round(Number(w.apparent)||Number(w.temp))+' °C</span><span>Szél: '+Math.round(Number(w.wind)||0)+' km/h</span><span>Napkelte: '+esc((w.sunrise||'').slice(11,16))+' · Napnyugta: '+esc((w.sunset||'').slice(11,16))+'</span>':'Az időjárásadat frissítése folyamatban van.')+'</div>')}
window.hh191Calendar=function(){var d=new Date().toISOString().slice(0,10);modal('<div class="a191SheetHead"><div><small>ACTIVITY CALENDAR</small><h3>Napi aktivitás</h3></div><button onclick="hh191CloseModal()">×</button></div><input id="a191Date" class="a191Date" type="date" value="'+d+'" onchange="hh191CalendarDay(this.value)"><div id="a191CalBody"></div>');setTimeout(function(){window.hh191CalendarDay(d)},0)}
window.hh191CalendarDay=function(date){var c=window.hhActivity191Cache||{sessions:[],daily:[],heart:[]},day=c.daily.find(function(x){return x.date===date}),ss=c.sessions.filter(function(s){return dayKey(s.startTime)===date}),el=document.getElementById('a191CalBody');if(!el)return;el.innerHTML='<div class="a191CalStats"><div><small>LÉPÉSEK</small><b>'+(day?n(day.steps,0):'—')+'</b></div><div><small>KALÓRIA</small><b>'+(day?n(day.caloriesKcal,0):'—')+'</b></div><div><small>TÁVOLSÁG</small><b>'+(day?n((Number(day.distanceMeters)||0)/1000,1):'—')+' km</b></div><div><small>EDZÉSEK</small><b>'+ss.length+'</b></div></div>'}
window.hh191Settings=function(){if(typeof window.haOpen==='function')window.haOpen()}
window.hh191Go=function(target){window.hhCloseActivity();if(typeof window.show==='function')window.show(target)}
window.hh191Quick=function(label){window.hhCloseActivity();if(typeof window.show==='function')window.show('health');setTimeout(function(){var b=Array.from(document.querySelectorAll('.q')).find(function(x){return x.textContent.trim().includes(label)});if(b)b.click()},120)}
window.hh191More=function(){modal('<div class="a191SheetHead"><div><small>MANUÁLIS AKTIVITÁS</small><h3>További kategóriák</h3></div><button onclick="hh191CloseModal()">×</button></div><div class="a191More">'+['pilates','hike','other'].map(function(k){var x=cat(k);return '<button onclick="hh191ManualOpen(\''+k+'\')"><span>'+icon(k)+'</span><b>'+x.label+'</b></button>'}).join('')+'</div>')}
window.hh191ManualOpen=function(k){var x=cat(k),now=new Date(),local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);modal('<div class="a191SheetHead"><div><small>MANUÁLIS AKTIVITÁS</small><h3>'+esc(x.label)+'</h3></div><button onclick="hh191CloseModal()">×</button></div><div class="a191Form"><label>Aktivitás<select id="a191Type">'+CATS.map(function(c){return '<option value="'+c.k+'"'+(c.k===k?' selected':'')+'>'+c.label+'</option>'}).join('')+'</select></label><label>Kezdés<input id="a191Start" type="datetime-local" value="'+local+'"></label><label>Időtartam<input id="a191Dur" type="number" min="1" value="30"><span>perc</span></label><label>Távolság<input id="a191Dist" type="number" min="0" step="0.1"><span>km</span></label><label>Kalória<input id="a191Cal" type="number" min="0"><span>kcal</span></label><label>Átlag pulzus<input id="a191Hr" type="number" min="0"><span>bpm</span></label><button class="a191Save" onclick="hh191ManualSave()">Mentés az Activity-be</button></div>')}
window.hh191ManualSave=function(){var type=document.getElementById('a191Type').value,start=document.getElementById('a191Start').value,d=Number(document.getElementById('a191Dur').value);if(!start||!d||d<1)return;var a=manualLoad();a.unshift({id:'manual-'+Date.now(),type:type,startTime:new Date(start).toISOString(),duration:d,distance:Number(document.getElementById('a191Dist').value)||0,calories:Number(document.getElementById('a191Cal').value)||0,avgBpm:Number(document.getElementById('a191Hr').value)||0,createdAt:new Date().toISOString()});localStorage.setItem(MANUAL_KEY+pkey(),JSON.stringify(a.slice(0,250)));window.hh191CloseModal();render()}

function ensure(){
 var old=document.getElementById('hhActivityPage');if(old){old.classList.remove('on');old.remove()}
 var p=document.getElementById('hhActivityPage191');if(!p){p=document.createElement('section');p.id='hhActivityPage191';p.className='a191Page';document.body.appendChild(p)}
 var m=document.getElementById('hh191Modal');if(!m){m=document.createElement('div');m.id='hh191Modal';m.className='a191Modal';document.body.appendChild(m)}
}
window.hhOpenActivity=function(){
 ensure();document.getElementById('hhActivityPage191').classList.add('on');render();
 if(typeof window.hhHealthCloudSync==='function')window.hhHealthCloudSync(false).then(function(changed){if(changed)render()}).catch(function(){});
}
window.hhRenderActivity191=render;
function refreshIfOpen(){
 var p=document.getElementById('hhActivityPage191');
 if(p&&p.classList.contains('on'))setTimeout(function(){render(window.hhActivityRenderedProfile||pkey())},40);
}
window.addEventListener('healthhub:healthconnect-imported',refreshIfOpen);
window.addEventListener('healthhub:health-cloud-synced',refreshIfOpen);
window.hhCloseActivity=function(){var p=document.getElementById('hhActivityPage191');if(p)p.classList.remove('on');window.hh191CloseModal()}
function wire(){var btn=Array.from(document.querySelectorAll('.homeModule')).find(function(x){var b=x.querySelector('b');return b&&b.textContent.trim()==='Activity'});if(btn){btn.removeAttribute('onclick');btn.onclick=function(e){e.preventDefault();window.hhOpenActivity()};btn.style.cursor='pointer'}}

function style(){
 if(document.getElementById('a191Style'))return;var s=document.createElement('style');s.id='a191Style';s.textContent=
 '.a191Page{display:none;position:fixed;top:0;bottom:0;left:0;right:0;margin:0 auto;z-index:7600;width:100%;max-width:430px;height:100dvh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:linear-gradient(180deg,#eef9fe,#f7fbfe);color:#0c3260;font-family:system-ui,-apple-system,Segoe UI,sans-serif}.a191Page.on{display:block}.a191Page{--act-accent:#168df0;--act-soft:#eef7ff;--act-accent2:#4aa9f5}
.a191Page[data-profile="monika"]{--act-accent:#ff2f7f;--act-soft:#fff1f6;--act-accent2:#ff6a9f}
.a191Page[data-profile="zsolt"]{--act-accent:#168df0;--act-soft:#eef7ff;--act-accent2:#4aa9f5}.a191Page *{box-sizing:border-box}.a191Hero{position:relative;width:100%;aspect-ratio:853/428;overflow:hidden;background:#dceef8}.a191Hero>img{display:block;width:100%;height:100%;object-fit:cover;object-position:center center;image-rendering:auto}.a191HeroHits{position:absolute;inset:0;z-index:13;pointer-events:none}.a191HeroHits button{position:absolute;border:0;background:transparent;pointer-events:auto;-webkit-tap-highlight-color:transparent}.a191HeroHits .runnerProfile{left:25%;top:0;width:44%;height:88%;border-radius:42%;cursor:pointer}.a191HeroHits .cal{right:22%;top:2%;width:11%;height:21%;border-radius:50%}.a191HeroHits .weather{right:11%;top:2%;width:10%;height:21%;border-radius:50%}.a191HeroHits .gear{right:0;top:2%;width:10%;height:21%;border-radius:50%}.a191Periods{position:absolute;left:3.7%;bottom:1.5%;z-index:4;width:48%;height:10.5%;display:grid;grid-template-columns:repeat(4,1fr);background:rgba(255,255,255,.97);border-radius:999px;overflow:hidden;box-shadow:0 4px 13px rgba(20,62,91,.13)}.a191Periods button{border:0;background:transparent;color:#173b61;font-weight:850;font-size:10px}.a191Periods button.on{background:linear-gradient(135deg,var(--act-accent),var(--act-accent2));color:#fff;border-radius:999px}.a191Body{padding:8px 8px calc(78px + env(safe-area-inset-bottom));}.a191ProfileDiag{display:block;font-family:inherit;font-size:7px;font-weight:900;letter-spacing:.12em;line-height:1.2;margin:0 0 9px 4px}.a191ProfileDiag{color:var(--act-accent)!important}.a191Top,.a191Small{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-bottom:7px}.a191Kpi{position:relative;overflow:hidden;background:#fff;border-radius:15px;padding:10px 9px 9px;box-shadow:0 6px 18px rgba(31,82,114,.06);min-width:0}.a191Top .a191Kpi{height:121px}.a191Small .a191Kpi{height:82px}.a191Kpi:after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;background:#ff5a98}.a191Kpi.orange:after{background:#ff9418}.a191Kpi.green:after{background:#16bd86}.a191Kpi.violet:after{background:#7646ed}.a191KpiIcon{width:34px;height:34px}.a191KpiIcon svg{width:100%;height:100%;display:block}.a191Small .a191KpiIcon{width:28px;height:28px;float:left;margin-right:5px}.a191Kpi small{display:block;font-size:8px;color:#607789;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a191Small .a191Kpi small{font-size:7.6px;margin-top:0}.a191Value{white-space:nowrap}.a191Value b{font-size:23px;line-height:1;color:#0b315e;letter-spacing:-.03em}.a191Value em{font-style:normal;font-size:8px;color:#61788a;margin-left:3px}.a191Small .a191Value b{font-size:17px}.a191Progress{height:7px;background:#e8edf7;border-radius:9px;overflow:hidden;margin-top:7px}.a191Progress i{display:block;height:100%;border-radius:9px;background:#1597ef}.a191Kpi.orange .a191Progress i{background:#ff9418}.a191Kpi.green .a191Progress i{background:#14bb84}.a191Kpi.violet .a191Progress i{background:#7b43ed}.a191Goal{display:flex;justify-content:space-between;font-size:7px;margin-top:4px}.a191Goal b{color:#168df0}.a191Kpi.orange .a191Goal b{color:#ff8b12}.a191Kpi.green .a191Goal b{color:#13ad79}.a191Kpi.violet .a191Goal b{color:#7b43ed}.a191Goal span{color:#74889a}.a191Card{background:#fff;border-radius:16px;box-shadow:0 6px 18px rgba(31,82,114,.055);margin-bottom:8px;padding:10px 11px}.a191Head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:6px}.a191Head>b{font-size:12px}.a191Head>strong{font-size:8.5px;color:var(--act-accent)}.a191Head .runner{width:23px;height:23px}.a191Head .runner svg{width:100%;height:100%}.pinkbars,.clock{font-size:18px;color:#ff2f7f;font-weight:900}.legend{display:flex;align-items:center;gap:4px;font-size:6.8px;color:#61788b;white-space:nowrap}.legend i{width:7px;height:7px;border-radius:50%;display:inline-block}.legend .b{background:#22a5f2}.legend .o{background:#ff9418}.legend .p{background:#ff2f7f}.a191Chart{height:134px;margin-top:3px}.a191Chart svg{display:block;width:100%;height:100%}.a191Empty{display:grid;place-items:center;min-height:70px;color:#8092a0;font-size:8px}.a191Types{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px 8px;margin-top:9px}.a191Type{height:88px;border:1px solid #e7edf3;border-radius:14px;background:linear-gradient(180deg,#fff,#f8fbfd);color:#143b5f;padding:7px 2px}.a191Type.on{border:1.5px solid var(--act-accent);background:var(--act-soft)}.a191Type span{display:block;width:34px;height:34px;margin:0 auto 2px}.a191Type span svg{width:100%;height:100%}.a191Type b{display:block;font-size:8.8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a191Type em{display:block;font-style:normal;font-size:7.3px;color:#264b70;margin-top:2px}.a191Type small{display:block;font-size:6.5px;color:#71879a}.a191Recent{margin-top:5px}.a191RecentRow{display:grid;grid-template-columns:34px minmax(0,1fr) auto 9px;gap:6px;align-items:center;min-height:43px;border-top:1px solid #edf2f5}.a191RecentRow:first-child{border-top:0}.a191RecentIcon{width:31px;height:31px;border-radius:50%;background:#eef8f5;padding:4px}.a191RecentIcon svg{width:100%;height:100%}.a191RecentName b{display:block;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a191RecentName small{display:block;font-size:6.5px;color:#72879a}.a191RecentMeta{display:flex;gap:8px;white-space:nowrap}.a191RecentMeta span{font-size:6.7px;color:#4f6c85}.a191RecentRow>strong{font-size:15px;color:#244c6f}.a191Card.manual{display:flex;align-items:center;gap:8px;padding:9px 10px}.a191ManualTitle{display:flex;align-items:center;gap:5px;white-space:nowrap}.a191ManualTitle span{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--act-accent);color:#fff;font-size:21px}.a191ManualTitle b{font-size:10px}.a191ManualBtns{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;flex:1}.a191ManualBtns button{height:44px;border:0;border-radius:10px;background:#f7fafc;color:#163d61;padding:3px;display:flex;align-items:center;justify-content:center;gap:2px;min-width:0}.a191ManualBtns button span{width:23px;height:23px}.a191ManualBtns button span svg{width:100%;height:100%}.a191ManualBtns button b{font-size:6.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a191ManualBtns .dots{font-size:15px;width:auto;color:#173d61}.a191Nav{position:fixed;left:0;right:0;bottom:0;margin:0 auto;transform:none;z-index:7700;width:100%;max-width:430px;height:62px;padding-bottom:env(safe-area-inset-bottom);background:rgba(255,255,255,.985);display:grid;grid-template-columns:repeat(6,1fr);box-shadow:0 -4px 15px rgba(29,66,92,.06)}.a191Nav button{border:0;background:transparent;color:#496e8d;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0;min-width:0}.a191Nav button span{width:23px;height:23px}.a191Nav button span svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.a191Nav button:nth-child(3) span svg{fill:none;stroke:none}.a191Nav button b{font-size:6.8px;white-space:nowrap}.a191Nav button.on{color:var(--act-accent);background:var(--act-soft);border-radius:16px}.a191Nav .dots{font-size:20px;line-height:18px;width:auto;height:22px}.a191Load{background:#fff;border-radius:14px;padding:18px;text-align:center;color:#58758e;font-size:9px}.a191Modal{display:none;position:fixed;inset:0;z-index:9900;background:rgba(13,38,57,.38);backdrop-filter:blur(5px);align-items:flex-end;justify-content:center}.a191Modal.on{display:flex}.a191Sheet{width:min(100%,430px);max-height:82vh;overflow:auto;background:linear-gradient(180deg,#fff,#f5fbff);border-radius:22px 22px 0 0;padding:14px 13px 24px}.a191SheetHead{display:flex;justify-content:space-between;gap:9px;align-items:flex-start}.a191SheetHead small{font-size:6.5px;color:#ff2f7f;font-weight:900;letter-spacing:.08em}.a191SheetHead h3{font-size:16px;margin:2px 0 10px;color:#173e61}.a191SheetHead button{width:32px;height:32px;border:0;border-radius:50%;background:#f1f6f9;color:#55728a;font-size:19px}.a191Weather{display:grid;gap:7px;background:#fff;border:1px solid #e5edf3;border-radius:15px;padding:13px}.a191Weather b{font-size:25px}.a191Weather span{font-size:9px;color:#698095}.a191Date{width:100%;height:43px;border:1px solid #dce6ed;border-radius:11px;background:#fff;padding:8px;font-size:15px;color:#173f62}.a191CalStats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:9px}.a191CalStats div{background:#fff;border:1px solid #e6edf2;border-radius:12px;padding:10px}.a191CalStats small{display:block;font-size:6.5px;color:#718699}.a191CalStats b{font-size:15px}.a191More{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.a191More button{border:1px solid #e4edf3;background:#fff;border-radius:14px;padding:11px;color:#173f62}.a191More span{display:block;width:43px;height:43px;margin:auto}.a191More span svg{width:100%;height:100%}.a191More b{font-size:9px}.a191Form{display:grid;grid-template-columns:1fr 1fr;gap:9px}.a191Form label{position:relative;font-size:8px;font-weight:800;color:#647d90}.a191Form input,.a191Form select{display:block;width:100%;height:42px;margin-top:4px;border:1px solid #dae6ee;border-radius:11px;background:#fff;padding:8px;color:#173f62;font-size:14px}.a191Form label>span{position:absolute;right:8px;bottom:12px;font-size:8px;color:#8395a4}.a191Save{grid-column:1/-1;height:44px;border:0;border-radius:13px;background:linear-gradient(135deg,var(--act-accent),var(--act-accent2));color:#fff;font-weight:900;font-size:12px;box-shadow:0 7px 18px rgba(31,111,175,.16)}@media(max-width:390px){.a191Body{padding-left:6px;padding-right:6px}.a191Types{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px 6px}.a191Type{height:84px;padding-left:1px;padding-right:1px}.a191Type span{width:31px;height:31px}.a191Type b{font-size:8px}.a191Top,.a191Small{gap:5px}.a191Top .a191Kpi{height:114px;padding-left:7px;padding-right:7px}.a191Kpi small{font-size:7.4px}.a191Value b{font-size:21px}.a191ManualCard{display:block}.a191Card.manual{display:block}.a191ManualBtns{margin-top:7px}.a191RecentMeta span:nth-child(1){display:none}.a191Nav button b{font-size:6.3px}}';
 document.head.appendChild(s);
}
style();ensure();wire();document.addEventListener('click',delegatedActivityProfileClick,true);setInterval(wire,1500);
document.documentElement.dataset.healthhubActivity='1.250';
window.HH_LIVE_BUILD='v1.97-activity-samsung-parity';
})();