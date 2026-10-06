(function(){
'use strict';
/* HealthHub v1.287 — Léna Health Context collector + document/archive index */

var HR='healthhub-healthradar-v2', HC='healthhub-connect-v1';
var PREFIX='hh-lena-health-context-', running={}, timer=0;

function pk(p){if(p==='m'||p==='monika')return'monika';if(p==='z'||p==='zsolt')return'zsolt';return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pn(p){return pk(p)==='monika'?'Mónika':'Zsolt'}
function req(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function db(name,ver){return new Promise(function(ok,no){var r=indexedDB.open(name,ver);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function all(name,ver,store){try{var d=await db(name,ver);try{if(!d.objectStoreNames.contains(store))return[];return await req(d.transaction(store,'readonly').objectStore(store).getAll())||[]}finally{d.close()}}catch(e){return[]}}
function N(v){var x=Number(v);return Number.isFinite(x)?x:null}
function R(v){var x=N(v);return x==null?null:Math.round(x*10)/10}
function A(a){var x=(a||[]).map(N).filter(function(v){return v!=null});return x.length?R(x.reduce(function(s,v){return s+v},0)/x.length):null}
function T(x){if(!x)return 0;var s=x.measuredAt||x.time||x.endTime||x.startTime||x.updatedAt||x.uploadedAt||x.documentDate||x.date||'';if(/^\d{4}-\d{2}-\d{2}$/.test(String(s)))s+='T12:00:00';var t=Date.parse(s);return Number.isFinite(t)?t:0}
function days(a,d,fn){var c=Date.now()-d*86400000;return(a||[]).filter(function(x){return T(x)>=c&&(!fn||fn(x))})}
function latest(a,fn){return(a||[]).filter(function(x){return T(x)>0&&(!fn||fn(x))}).sort(function(x,y){return T(y)-T(x)})[0]||null}
function delta(a,f,d,fn){var x=days(a,d,fn).sort(function(q,w){return T(q)-T(w)});if(x.length<2)return null;var a0=N(x[0][f]),a1=N(x[x.length-1][f]);return a0==null||a1==null?null:R(a1-a0)}
function dur(s){var a=Date.parse(s&&s.startTime||''),b=Date.parse(s&&s.endTime||''),m=(b-a)/60000;return Number.isFinite(m)&&m>0?Math.round(m):null}
function arr(x){return Array.isArray(x)?x:[]}
function clean(s,n){s=String(s==null?'':s).replace(/\s+/g,' ').trim();return n&&s.length>n?s.slice(0,n-1)+'…':s}
function legacy(p){try{var v=JSON.parse(localStorage.getItem('hh-health-vault-v1')||'null');return v&&v.profiles&&v.profiles[p]||null}catch(e){return null}}

async function rawLocal(p){
 var a=(await all(HC,2,'imports')).filter(function(x){return x&&x.profile===p&&x.bundle&&x.bundle.records});
 a.sort(function(x,y){return Date.parse(y.importedAt||0)-Date.parse(x.importedAt||0)});
 return a[0]&&a[0].bundle||null;
}
async function rawCloud(p){
 try{
  var v=window.HH_DROPBOX_VAULT;if(!v||!v.connected||!v.connected()||!v.downloadJson)return null;
  try{return await v.downloadJson('/HealthHub/profiles/'+p+'-health-connect.json')}catch(e){if(e&&e.status!==409)throw e}
  try{return await v.downloadJson('/incoming-'+p+'.json')}catch(e){}
 }catch(e){console.warn('Léna Context Health Connect read',e)}
 return null;
}
function meds(meta,p,l){
 var out=[];
 arr(meta).forEach(function(x){if(x&&x.key==='private-reference'){var m=x.payload&&x.payload.profiles&&x.payload.profiles[p]&&x.payload.profiles[p].medications;if(Array.isArray(m))out=out.concat(m)}});
 if(!out.length&&l)out=arr(l.medications||(l.profileData&&l.profileData.medications));
 return out.map(function(x){return{name:x.name||x.title||'',strength:x.strength||x.dose||'',schedule:x.schedule||'',status:x.status||'',note:clean(x.note,400)}}).filter(function(x){return x.name});
}
function exp(d){
 var e=d&&(d.lenaExplanationManual||d.lenaExplanation||d.explanation||d.summaryData);
 if(!e&&d&&typeof d.summary==='string'&&d.summary&&d.summary.indexOf('Eredeti HealthRadar dokumentum')!==0)e={summary:d.summary};
 if(!e)return null;
 if(typeof e==='string')return{summary:clean(e,2200)};
 return{title:clean(e.title,240),summary:clean(e.summary,2200),keyFindings:arr(e.keyFindings).map(function(x){return clean(x,600)}).slice(0,20),meaning:arr(e.meaning).map(function(x){return clean(x,600)}).slice(0,20),attention:arr(e.attention).map(function(x){return clean(x,600)}).slice(0,20),questions:arr(e.questions).map(function(x){return clean(x,600)}).slice(0,20),reviewedAt:e.reviewedAt||null};
}
function doc(d,blobs){return{id:d.id,date:d.documentDate||(d.uploadedAt?String(d.uploadedAt).slice(0,10):null),uploadedAt:d.uploadedAt||null,category:d.category||'general',title:d.originalName||d.title||'Egészségügyi dokumentum',contentType:d.contentType||null,sizeBytes:N(d.sizeBytes),hasOriginal:blobs.has(d.id),sourceType:d.sourceType||'healthhub',explanation:exp(d)}}
function archive(l,seen){
 var out=[];
 arr(l&&l.records).forEach(function(x){var did=x&&x.source&&x.source.documentId,id=did||x.id;if(!id||seen.has(String(id)))return;seen.add(String(id));out.push({id:id,legacyId:x.id||null,date:x.date||null,category:x.category||'general',title:x.title||'Archivált egészségügyi rekord',contentType:x.source&&x.source.contentType||null,sizeBytes:N(x.source&&x.source.sizeBytes),hasOriginal:!!(x.source&&x.source.localDocKey),sourceType:'legacy-archive',explanation:x.summary?{summary:clean(x.summary,2200)}:null})});
 arr(l&&l.referenceDocuments).forEach(function(x){var id=x.id||x.title;if(!id||seen.has(String(id)))return;seen.add(String(id));out.push({id:id,date:x.date||null,category:x.category||'reference',title:x.title||'Archivált referencia',contentType:null,sizeBytes:null,hasOriginal:false,sourceType:'legacy-reference',explanation:x.summary?{summary:clean(x.summary,2200)}:null})});
 return out;
}
function sleepRows(raw){return arr(raw&&raw.records&&raw.records.sleepSessions).map(function(s){return{id:s.id||null,startTime:s.startTime,endTime:s.endTime,durationMin:dur(s),sourcePackage:s.sourcePackage||null}}).filter(function(x){return x.durationMin!=null}).sort(function(a,b){return Date.parse(b.endTime||0)-Date.parse(a.endTime||0)})}
function heartRows(raw){var o=[];arr(raw&&raw.records&&raw.records.heartRate).forEach(function(g){arr(g.samples).forEach(function(s){var b=N(s.bpm);if(b!=null)o.push({time:s.time||g.startTime||g.endTime,bpm:b})})});return o.sort(function(a,b){return Date.parse(b.time||0)-Date.parse(a.time||0)})}
function activityRows(raw,local,p){
 var m=new Map();
 arr(raw&&raw.records&&raw.records.dailyActivity).forEach(function(x){if(x&&x.date)m.set(x.date,x)});
 arr(local).filter(function(x){return x&&x.profile===p&&x.date}).forEach(function(x){m.set(x.date,Object.assign({},m.get(x.date)||{},x))});
 return Array.from(m.values()).map(function(x){return{date:x.date,steps:N(x.steps)||0,distanceKm:R((N(x.distanceMeters)||0)/1000),activeMinutes:N(x.activeMinutes)||0,activeCaloriesKcal:N(x.activeCaloriesKcal)!=null?N(x.activeCaloriesKcal):(N(x.caloriesKcal)||0)}}).sort(function(a,b){return String(b.date).localeCompare(String(a.date))});
}
function actSum(a,d){var x=days(a,d);return{daysWithData:x.length,avgSteps:A(x.map(function(v){return v.steps})),avgActiveMinutes:A(x.map(function(v){return v.activeMinutes})),avgDistanceKm:A(x.map(function(v){return v.distanceKm}))}}
function sleepSum(a,d){var x=days(a,d);return{sessions:x.length,avgDurationMin:A(x.map(function(v){return v.durationMin})),latest:x[0]||null}}
function makeSignals(c){
 var s=[],w=c.metrics.weight,b=c.metrics.bloodPressure;
 if(w.delta7d!=null&&Math.abs(w.delta7d)>=.8)s.push({type:'weight_change_7d',text:'Testsúly változás 7 nap alatt: '+(w.delta7d>0?'+':'')+w.delta7d+' kg'});
 if(w.delta30d!=null&&Math.abs(w.delta30d)>=1.5)s.push({type:'weight_change_30d',text:'Testsúly változás 30 nap alatt: '+(w.delta30d>0?'+':'')+w.delta30d+' kg'});
 if(c.sleep.h72.avgDurationMin!=null&&c.sleep.h72.avgDurationMin<360)s.push({type:'short_sleep_72h',text:'Az elmúlt 72 órában az átlagos alvás 6 óra alatt volt.'});
 if(c.activity.h72.avgSteps!=null&&c.activity.h72.avgSteps<3500)s.push({type:'low_activity_72h',text:'Az elmúlt 72 órában az átlagos lépésszám alacsony volt ('+Math.round(c.activity.h72.avgSteps)+' lépés/nap).'});
 if(b.latest&&N(b.latest.systolic)>=140)s.push({type:'high_systolic',text:'A legutóbbi szisztolés vérnyomás 140 Hgmm vagy magasabb.'});
 if(b.latest&&N(b.latest.diastolic)>=90)s.push({type:'high_diastolic',text:'A legutóbbi diasztolés vérnyomás 90 Hgmm vagy magasabb.'});
 if(c.heartRate.h72Avg!=null&&c.heartRate.h72Avg>100)s.push({type:'high_hr_72h',text:'A 72 órás pulzusátlag 100/perc felett van.'});
 return s;
}
function text(c){
 var a=['LÉNA HEALTH CONTEXT · '+c.profileName,'Frissítve: '+c.generatedAt],m=c.metrics;
 if(m.weight.latest)a.push('Testsúly: '+m.weight.latest.weightKg+' kg'+(m.weight.delta30d!=null?' · 30 nap '+(m.weight.delta30d>0?'+':'')+m.weight.delta30d+' kg':''));
 if(m.weight.latest&&N(m.weight.latest.bodyFatPercent)!=null)a.push('Testzsír: '+m.weight.latest.bodyFatPercent+'%');
 if(m.bloodPressure.latest)a.push('Vérnyomás: '+m.bloodPressure.latest.systolic+'/'+m.bloodPressure.latest.diastolic+' Hgmm'+(N(m.bloodPressure.latest.pulse)!=null?' · pulzus '+m.bloodPressure.latest.pulse+'/perc':''));
 if(m.glucose.latest)a.push('Vércukor: '+m.glucose.latest.bloodGlucose+' mmol/L');
 if(c.sleep.h72.avgDurationMin!=null)a.push('Alvás 72h átlag: '+Math.round(c.sleep.h72.avgDurationMin)+' perc');
 if(c.activity.h72.avgSteps!=null)a.push('Aktivitás 72h átlag: '+Math.round(c.activity.h72.avgSteps)+' lépés/nap');
 if(c.heartRate.h72Avg!=null)a.push('Pulzus 72h átlag: '+c.heartRate.h72Avg+'/perc');
 a.push('Leletek és archív dokumentumok: '+c.documents.count+' · eredeti fájl '+c.documents.withOriginal+' · Léna magyarázat '+c.documents.withExplanation);
 if(c.signals.length)a.push('Figyelemre méltó változások: '+c.signals.map(function(x){return x.text}).join(' | '));
 return a.join('\n');
}
async function build(profile,reason){
 var p=pk(profile);if(running[p])return running[p];
 running[p]=(async function(){
  var rs=await Promise.all([all(HR,1,'profiles'),all(HR,1,'measurements'),all(HR,1,'documents'),all(HR,1,'documentBlobs'),all(HR,1,'appointments'),all(HR,1,'meta'),all(HC,2,'activity'),rawCloud(p),rawLocal(p)]);
  var l=legacy(p),prof=rs[0].find(function(x){return x&&x.profile===p})||(l&&l.profileData)||l||{profile:p};
  var meas=rs[1].filter(function(x){return x&&x.profile===p}).sort(function(a,b){return T(b)-T(a)});
  var blobs=new Set(rs[3].map(function(x){return x&&x.id}).filter(Boolean));
  var di=rs[2].filter(function(x){return x&&x.profile===p}).map(function(x){return doc(x,blobs)});
  var seen=new Set(di.map(function(x){return String(x.id)}));di=di.concat(archive(l,seen)).sort(function(a,b){return String(b.date||b.uploadedAt||'').localeCompare(String(a.date||a.uploadedAt||''))});
  var raw=rs[7]||rs[8]||null,sl=sleepRows(raw),hr=heartRows(raw),ac=activityRows(raw,rs[6],p);
  var wl=latest(meas,function(x){var v=N(x.weightKg);return v!=null&&v>=20&&v<=400});
  var bp=latest(meas,function(x){return N(x.systolic)!=null&&N(x.diastolic)!=null});
  var gl=latest(meas,function(x){return N(x.bloodGlucose)!=null}),ox=latest(meas,function(x){return N(x.oxygenSaturation)!=null});
  var pr=meas.filter(function(x){return N(x.pulse)!=null});
  var c={
   schema:'healthhub.lena.context/1.0',generatedAt:new Date().toISOString(),reason:reason||'refresh',profile:p,profileName:pn(p),
   profileCore:{birthDate:prof.birthDate||null,heightCm:N(prof.heightCm),weightKg:N(prof.weightKg),bloodType:prof.bloodType||null,allergies:prof.allergies||prof.allergy||null,knownConditions:prof.knownConditions||prof.conditions||null},
   medications:meds(rs[5],p,l),
   metrics:{
    weight:{latest:wl?{measuredAt:wl.measuredAt,weightKg:R(wl.weightKg),bodyFatPercent:R(wl.bodyFatPercent),source:wl.source||null}:null,delta7d:delta(meas,'weightKg',7,function(x){return N(x.weightKg)>=20}),delta30d:delta(meas,'weightKg',30,function(x){return N(x.weightKg)>=20})},
    bloodPressure:{latest:bp?{measuredAt:bp.measuredAt,systolic:N(bp.systolic),diastolic:N(bp.diastolic),pulse:N(bp.pulse),source:bp.source||null}:null,h72:{systolicAvg:A(days(meas,3,function(x){return N(x.systolic)!=null}).map(function(x){return x.systolic})),diastolicAvg:A(days(meas,3,function(x){return N(x.diastolic)!=null}).map(function(x){return x.diastolic}))},d7:{systolicAvg:A(days(meas,7,function(x){return N(x.systolic)!=null}).map(function(x){return x.systolic})),diastolicAvg:A(days(meas,7,function(x){return N(x.diastolic)!=null}).map(function(x){return x.diastolic}))}},
    pulse:{latest:latest(pr)?{measuredAt:latest(pr).measuredAt,value:N(latest(pr).pulse)}:null,h72Avg:A(days(pr,3).map(function(x){return x.pulse})),d7Avg:A(days(pr,7).map(function(x){return x.pulse}))},
    glucose:{latest:gl?{measuredAt:gl.measuredAt,bloodGlucose:N(gl.bloodGlucose),source:gl.source||null}:null},
    oxygen:{latest:ox?{measuredAt:ox.measuredAt,oxygenSaturation:N(ox.oxygenSaturation),source:ox.source||null}:null}
   },
   sleep:{h72:sleepSum(sl,3),d7:sleepSum(sl,7),d30:sleepSum(sl,30),recent:sl.slice(0,14)},
   activity:{h72:actSum(ac,3),d7:actSum(ac,7),d30:actSum(ac,30),recent:ac.slice(0,35)},
   heartRate:{latest:hr[0]||null,h72Avg:A(days(hr,3).map(function(x){return x.bpm})),d7Avg:A(days(hr,7).map(function(x){return x.bpm}))},
   appointments:rs[4].filter(function(x){return x&&x.profile===p}).slice(0,40),
   documents:{count:di.length,withOriginal:di.filter(function(x){return x.hasOriginal}).length,withExplanation:di.filter(function(x){return!!x.explanation}).length,index:di},
   healthConnect:{exportedAt:raw&&raw.exportedAt||raw&&raw.rangeEnd||null,source:rs[7]?'dropbox':'local-cache'},signals:[]
  };
  c.signals=makeSignals(c);c.summary=text(c);
  localStorage.setItem(PREFIX+p,JSON.stringify(c));localStorage.setItem(PREFIX+p+'updated',c.generatedAt);
  var cloudOk=false;
  try{var v=window.HH_DROPBOX_VAULT;if(v&&v.connected&&v.connected()&&v.uploadJson){await v.uploadJson('/HealthHub/sync/'+p+'-lena-health-context.json',c);localStorage.setItem(PREFIX+p+'cloud',c.generatedAt);cloudOk=true}}catch(e){console.warn('Léna Context cloud write',e)}
  localStorage.setItem(PREFIX+p+'status',JSON.stringify({built:true,cloud:cloudOk,updatedAt:c.generatedAt}));
  try{window.dispatchEvent(new CustomEvent('healthhub:lena-context-updated',{detail:{profile:p,generatedAt:c.generatedAt,cloud:cloudOk}}))}catch(e){}
  status();return c;
 })().finally(function(){running[p]=null});
 return running[p];
}
function fmt(s){if(!s)return'még nem';var d=new Date(s);return isNaN(d)?'még nem':d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function status(){
 var card=document.getElementById('hhUnifiedCloudVaultCard');if(!card)return;
 var old=document.getElementById('hhLenaCtx287');if(old)old.remove();
 var p=pk(),st={};try{st=JSON.parse(localStorage.getItem(PREFIX+p+'status')||'{}')}catch(e){}
 var el=document.createElement('div');el.id='hhLenaCtx287';el.className='hhUcMeta';el.style.lineHeight='1.55';
 el.innerHTML='<b style="color:#6c4fc4">🧠 Léna Health Context · '+pn(p)+'</b><br>'+
   'Context: '+(st.built?'✅ '+fmt(st.updatedAt):'⏳ még nincs')+' · Privát Cloud: '+(st.cloud?'✅':'⏳')+
   '<br><span style="color:#8b98a5">ChatGPT/Léna közvetlen olvasás: connector után</span>';
 card.appendChild(el);
}
function schedule(p,r,d){clearTimeout(timer);timer=setTimeout(function(){build(p,r).catch(function(e){console.warn('Léna Context refresh',e)})},d==null?250:d)}
window.hhRefreshLenaHealthContext287=function(p,r){return build(p||pk(),r||'manual')};
window.hhGetLenaHealthContext287=function(p){try{return JSON.parse(localStorage.getItem(PREFIX+pk(p))||'null')}catch(e){return null}};
window.hhGetLenaHealthContextText287=function(p){var x=window.hhGetLenaHealthContext287(p);return x&&x.summary||''};

window.addEventListener('healthhub:health-cloud-synced',function(e){schedule(e&&e.detail&&e.detail.profile,'health-connect-sync',180)});
window.addEventListener('healthhub:measurement-saved',function(e){schedule(e&&e.detail&&e.detail.profile,'measurement-saved',180)});
window.addEventListener('healthhub:profile-changed',function(e){status();schedule(e&&e.detail&&e.detail.profile||pk(),'profile-changed',300)});
window.addEventListener('focus',function(){status();schedule(pk(),'focus-refresh',800)});

try{if(typeof window.hhUnifiedSyncAll==='function'&&!window.hhUnifiedSyncAll.__lena287){var old=window.hhUnifiedSyncAll;var w=async function(){var r=await old.apply(this,arguments);try{await build(pk(),'unified-sync')}catch(e){}return r};w.__lena287=true;window.hhUnifiedSyncAll=w}}catch(e){}
try{var mo=new MutationObserver(function(){status()});mo.observe(document.documentElement,{subtree:true,childList:true})}catch(e){}
setTimeout(function(){status();schedule(pk(),'startup',400)},900);
document.documentElement.dataset.healthhubLenaContext='1.287';
})();