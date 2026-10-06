(function(){
'use strict';
/* HealthHub v1.289 — lightweight local Léna Health Context collector.
   No PDF/blob reads. No MutationObserver. No network. Event-driven + debounced. */

var HR='healthhub-healthradar-v2', HC='healthhub-connect-v1';
var KEY='hh-lena-context-v289-', timers={}, running={};

function pkey(p){
  if(p==='m'||p==='monika')return 'monika';
  if(p==='z'||p==='zsolt')return 'zsolt';
  return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
}
function pname(p){return pkey(p)==='monika'?'Mónika':'Zsolt'}
function req(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(name,ver){return new Promise(function(ok,no){var r=indexedDB.open(name,ver);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function allStore(name,ver,store){
  try{
    var db=await openDb(name,ver);
    try{
      if(!db.objectStoreNames.contains(store))return [];
      return await req(db.transaction(store,'readonly').objectStore(store).getAll())||[];
    }finally{db.close()}
  }catch(e){console.warn('Léna Context store read',store,e);return []}
}
async function latestImport(profile){
  try{
    var db=await openDb(HC,2);
    try{
      if(!db.objectStoreNames.contains('imports'))return null;
      return await new Promise(function(resolve){
        var best=null,bt=0,st=db.transaction('imports','readonly').objectStore('imports');
        var r=st.openCursor();
        r.onerror=function(){resolve(best)};
        r.onsuccess=function(){
          var cur=r.result;
          if(!cur){resolve(best);return}
          var v=cur.value;
          if(v&&v.profile===profile&&v.bundle&&v.bundle.records){
            var t=Date.parse(v.importedAt||v.bundle.exportedAt||0)||0;
            if(!best||t>=bt){best=v;bt=t}
          }
          cur.continue();
        };
      });
    }finally{db.close()}
  }catch(e){console.warn('Léna Context latest import',e);return null}
}
function num(v){var n=Number(v);return Number.isFinite(n)?n:null}
function r1(v){var n=num(v);return n==null?null:Math.round(n*10)/10}
function avg(a){var x=(a||[]).map(num).filter(function(v){return v!=null});return x.length?r1(x.reduce(function(s,v){return s+v},0)/x.length):null}
function ts(x){
  if(!x)return 0;
  var s=x.measuredAt||x.time||x.endTime||x.startTime||x.updatedAt||x.uploadedAt||x.documentDate||x.date||'';
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(s)))s+='T12:00:00';
  var t=Date.parse(s);return Number.isFinite(t)?t:0;
}
function within(a,days,fn){var cut=Date.now()-days*86400000;return(a||[]).filter(function(x){return ts(x)>=cut&&(!fn||fn(x))})}
function latest(a,fn){return(a||[]).filter(function(x){return ts(x)>0&&(!fn||fn(x))}).sort(function(x,y){return ts(y)-ts(x)})[0]||null}
function delta(a,field,days,fn){
  var x=within(a,days,fn).sort(function(q,w){return ts(q)-ts(w)});
  if(x.length<2)return null;
  var a0=num(x[0][field]),a1=num(x[x.length-1][field]);
  return a0==null||a1==null?null:r1(a1-a0);
}
function arr(v){return Array.isArray(v)?v:[]}
function trim(v,max){var s=String(v==null?'':v).replace(/\s+/g,' ').trim();return max&&s.length>max?s.slice(0,max-1)+'…':s}
function legacyProfile(p){try{var v=JSON.parse(localStorage.getItem('hh-health-vault-v1')||'null');return v&&v.profiles&&v.profiles[p]||null}catch(e){return null}}
function durationMin(s){var a=Date.parse(s&&s.startTime||''),b=Date.parse(s&&s.endTime||''),m=(b-a)/60000;return Number.isFinite(m)&&m>0?Math.round(m):null}

function medicationList(meta,p,legacy){
  var out=[];
  arr(meta).forEach(function(x){
    if(x&&x.key==='private-reference'){
      var m=x.payload&&x.payload.profiles&&x.payload.profiles[p]&&x.payload.profiles[p].medications;
      if(Array.isArray(m))out=out.concat(m);
    }
  });
  if(!out.length&&legacy){
    out=arr(legacy.medications||(legacy.profileData&&legacy.profileData.medications));
  }
  return out.map(function(x){return{
    name:x.name||x.title||'',strength:x.strength||x.dose||'',schedule:x.schedule||'',status:x.status||'',note:trim(x.note,350)
  }}).filter(function(x){return x.name});
}
function explanation(d){
  if(!d)return null;
  var e=d.lenaExplanationManual||d.lenaExplanation||d.explanation||null;
  if(!e&&typeof d.summary==='string'&&d.summary&&d.summary.indexOf('Eredeti HealthRadar dokumentum')!==0)e={summary:d.summary};
  if(!e)return null;
  if(typeof e==='string')return{summary:trim(e,1800)};
  return{
    title:trim(e.title,180),
    summary:trim(e.summary,1800),
    keyFindings:arr(e.keyFindings).map(function(x){return trim(x,400)}).slice(0,12),
    meaning:arr(e.meaning).map(function(x){return trim(x,400)}).slice(0,12),
    attention:arr(e.attention).map(function(x){return trim(x,400)}).slice(0,12),
    reviewedAt:e.reviewedAt||null
  };
}
function documentsIndex(docs,legacy,p){
  var seen=new Set(),out=[];
  docs.filter(function(d){return d&&d.profile===p}).forEach(function(d){
    seen.add(String(d.id));
    out.push({
      id:d.id,date:d.documentDate||(d.uploadedAt?String(d.uploadedAt).slice(0,10):null),
      uploadedAt:d.uploadedAt||null,category:d.category||'general',
      title:d.originalName||d.title||'Egészségügyi dokumentum',
      sourceType:d.sourceType||'healthhub',sizeBytes:num(d.sizeBytes),explanation:explanation(d)
    });
  });
  arr(legacy&&legacy.records).forEach(function(x){
    var did=x&&x.source&&x.source.documentId,id=did||x.id;
    if(!id||seen.has(String(id)))return;
    seen.add(String(id));
    out.push({
      id:id,legacyId:x.id||null,date:x.date||null,category:x.category||'general',
      title:x.title||'Archivált egészségügyi rekord',sourceType:'legacy-archive',
      sizeBytes:num(x.source&&x.source.sizeBytes),
      explanation:x.summary?{summary:trim(x.summary,1800)}:null
    });
  });
  arr(legacy&&legacy.referenceDocuments).forEach(function(x){
    var id=x.id||x.title;if(!id||seen.has(String(id)))return;
    seen.add(String(id));
    out.push({
      id:id,date:x.date||null,category:x.category||'reference',
      title:x.title||'Archivált referencia',sourceType:'legacy-reference',sizeBytes:null,
      explanation:x.summary?{summary:trim(x.summary,1800)}:null
    });
  });
  return out.sort(function(a,b){return String(b.date||b.uploadedAt||'').localeCompare(String(a.date||a.uploadedAt||''))});
}
function sleepRows(raw){
  return arr(raw&&raw.records&&raw.records.sleepSessions).map(function(s){return{
    id:s.id||null,startTime:s.startTime,endTime:s.endTime,durationMin:durationMin(s),sourcePackage:s.sourcePackage||null
  }}).filter(function(x){return x.durationMin!=null}).sort(function(a,b){return Date.parse(b.endTime||0)-Date.parse(a.endTime||0)});
}
function heartRows(raw){
  var out=[];
  arr(raw&&raw.records&&raw.records.heartRate).forEach(function(g){
    arr(g.samples).forEach(function(s){var b=num(s.bpm);if(b!=null)out.push({time:s.time||g.startTime||g.endTime,bpm:b})});
  });
  return out.sort(function(a,b){return Date.parse(b.time||0)-Date.parse(a.time||0)});
}
function activityRows(raw,local,p){
  var m=new Map();
  arr(raw&&raw.records&&raw.records.dailyActivity).forEach(function(x){if(x&&x.date)m.set(x.date,x)});
  arr(local).filter(function(x){return x&&x.profile===p&&x.date}).forEach(function(x){m.set(x.date,Object.assign({},m.get(x.date)||{},x))});
  return Array.from(m.values()).map(function(x){return{
    date:x.date,steps:num(x.steps)||0,
    distanceKm:r1((num(x.distanceMeters)||0)/1000),
    activeMinutes:num(x.activeMinutes)||0,
    activeCaloriesKcal:num(x.activeCaloriesKcal)!=null?num(x.activeCaloriesKcal):(num(x.caloriesKcal)||0)
  }}).sort(function(a,b){return String(b.date).localeCompare(String(a.date))});
}
function actSummary(a,d){var x=within(a,d);return{daysWithData:x.length,avgSteps:avg(x.map(function(v){return v.steps})),avgActiveMinutes:avg(x.map(function(v){return v.activeMinutes})),avgDistanceKm:avg(x.map(function(v){return v.distanceKm}))}}
function sleepSummary(a,d){var x=within(a,d);return{sessions:x.length,avgDurationMin:avg(x.map(function(v){return v.durationMin})),latest:x[0]||null}}
function signals(c){
  var out=[],w=c.metrics.weight,b=c.metrics.bloodPressure;
  if(w.delta7d!=null&&Math.abs(w.delta7d)>=.8)out.push({type:'weight_change_7d',text:'Testsúly változás 7 nap alatt: '+(w.delta7d>0?'+':'')+w.delta7d+' kg'});
  if(w.delta30d!=null&&Math.abs(w.delta30d)>=1.5)out.push({type:'weight_change_30d',text:'Testsúly változás 30 nap alatt: '+(w.delta30d>0?'+':'')+w.delta30d+' kg'});
  if(c.sleep.h72.avgDurationMin!=null&&c.sleep.h72.avgDurationMin<360)out.push({type:'short_sleep_72h',text:'A 72 órás alvásátlag 6 óra alatt van.'});
  if(c.activity.h72.avgSteps!=null&&c.activity.h72.avgSteps<3500)out.push({type:'low_activity_72h',text:'A 72 órás lépésszám átlaga alacsony: '+Math.round(c.activity.h72.avgSteps)+' lépés/nap.'});
  if(b.latest&&num(b.latest.systolic)>=140)out.push({type:'high_systolic_latest',text:'A legutóbbi szisztolés vérnyomás 140 Hgmm vagy magasabb.'});
  if(b.latest&&num(b.latest.diastolic)>=90)out.push({type:'high_diastolic_latest',text:'A legutóbbi diasztolés vérnyomás 90 Hgmm vagy magasabb.'});
  return out;
}
function summary(c){
  var a=['LÉNA HEALTH CONTEXT · '+c.profileName,'Frissítve: '+c.generatedAt],m=c.metrics;
  if(m.weight.latest)a.push('Testsúly: '+m.weight.latest.weightKg+' kg'+(m.weight.delta30d!=null?' · 30 nap '+(m.weight.delta30d>0?'+':'')+m.weight.delta30d+' kg':''));
  if(m.weight.latest&&num(m.weight.latest.bodyFatPercent)!=null)a.push('Testzsír: '+m.weight.latest.bodyFatPercent+'%');
  if(m.bloodPressure.latest)a.push('Vérnyomás: '+m.bloodPressure.latest.systolic+'/'+m.bloodPressure.latest.diastolic+' Hgmm'+(num(m.bloodPressure.latest.pulse)!=null?' · pulzus '+m.bloodPressure.latest.pulse+'/perc':''));
  if(m.glucose.latest)a.push('Vércukor: '+m.glucose.latest.bloodGlucose+' mmol/L');
  if(c.sleep.h72.avgDurationMin!=null)a.push('Alvás 72h átlag: '+Math.round(c.sleep.h72.avgDurationMin)+' perc');
  if(c.activity.h72.avgSteps!=null)a.push('Aktivitás 72h átlag: '+Math.round(c.activity.h72.avgSteps)+' lépés/nap');
  if(c.heartRate.h72Avg!=null)a.push('Pulzus 72h átlag: '+c.heartRate.h72Avg+'/perc');
  a.push('Leletek/archív dokumentumok: '+c.documents.count+' · Léna-magyarázat: '+c.documents.withExplanation);
  if(c.signals.length)a.push('Figyelemre méltó változások: '+c.signals.map(function(x){return x.text}).join(' | '));
  return a.join('\n');
}

async function build(profile,reason){
  var p=pkey(profile);
  if(running[p])return running[p];
  running[p]=(async function(){
    var imp=await latestImport(p);
    var rs=await Promise.all([
      allStore(HR,1,'profiles'),
      allStore(HR,1,'measurements'),
      allStore(HR,1,'documents'),
      allStore(HR,1,'appointments'),
      allStore(HR,1,'meta'),
      allStore(HC,2,'activity')
    ]);
    var legacy=legacyProfile(p);
    var prof=rs[0].find(function(x){return x&&x.profile===p})||(legacy&&legacy.profileData)||legacy||{profile:p};
    var meas=rs[1].filter(function(x){return x&&x.profile===p}).sort(function(a,b){return ts(b)-ts(a)});
    var raw=imp&&imp.bundle||null;
    var sl=sleepRows(raw),hr=heartRows(raw),ac=activityRows(raw,rs[5],p);
    var wl=latest(meas,function(x){var v=num(x.weightKg);return v!=null&&v>=20&&v<=400});
    var bp=latest(meas,function(x){return num(x.systolic)!=null&&num(x.diastolic)!=null});
    var gl=latest(meas,function(x){return num(x.bloodGlucose)!=null});
    var ox=latest(meas,function(x){return num(x.oxygenSaturation)!=null});
    var pr=meas.filter(function(x){return num(x.pulse)!=null});
    var di=documentsIndex(rs[2],legacy,p);

    var c={
      schema:'healthhub.lena.context/1.1-local',
      generatedAt:new Date().toISOString(),reason:reason||'refresh',
      profile:p,profileName:pname(p),
      profileCore:{
        birthDate:prof.birthDate||null,heightCm:num(prof.heightCm),weightKg:num(prof.weightKg),
        bloodType:prof.bloodType||null,allergies:prof.allergies||prof.allergy||null,
        knownConditions:prof.knownConditions||prof.conditions||null
      },
      medications:medicationList(rs[4],p,legacy),
      metrics:{
        weight:{
          latest:wl?{measuredAt:wl.measuredAt,weightKg:r1(wl.weightKg),bodyFatPercent:r1(wl.bodyFatPercent),source:wl.source||null}:null,
          delta7d:delta(meas,'weightKg',7,function(x){var v=num(x.weightKg);return v!=null&&v>=20}),
          delta30d:delta(meas,'weightKg',30,function(x){var v=num(x.weightKg);return v!=null&&v>=20})
        },
        bloodPressure:{
          latest:bp?{measuredAt:bp.measuredAt,systolic:num(bp.systolic),diastolic:num(bp.diastolic),pulse:num(bp.pulse),source:bp.source||null}:null,
          h72:{systolicAvg:avg(within(meas,3,function(x){return num(x.systolic)!=null}).map(function(x){return x.systolic})),diastolicAvg:avg(within(meas,3,function(x){return num(x.diastolic)!=null}).map(function(x){return x.diastolic}))},
          d7:{systolicAvg:avg(within(meas,7,function(x){return num(x.systolic)!=null}).map(function(x){return x.systolic})),diastolicAvg:avg(within(meas,7,function(x){return num(x.diastolic)!=null}).map(function(x){return x.diastolic}))}
        },
        pulse:{latest:latest(pr)?{measuredAt:latest(pr).measuredAt,value:num(latest(pr).pulse)}:null,h72Avg:avg(within(pr,3).map(function(x){return x.pulse})),d7Avg:avg(within(pr,7).map(function(x){return x.pulse}))},
        glucose:{latest:gl?{measuredAt:gl.measuredAt,bloodGlucose:num(gl.bloodGlucose),source:gl.source||null}:null},
        oxygen:{latest:ox?{measuredAt:ox.measuredAt,oxygenSaturation:num(ox.oxygenSaturation),source:ox.source||null}:null}
      },
      sleep:{h72:sleepSummary(sl,3),d7:sleepSummary(sl,7),d30:sleepSummary(sl,30),recent:sl.slice(0,14)},
      activity:{h72:actSummary(ac,3),d7:actSummary(ac,7),d30:actSummary(ac,30),recent:ac.slice(0,35)},
      heartRate:{latest:hr[0]||null,h72Avg:avg(within(hr,3).map(function(x){return x.bpm})),d7Avg:avg(within(hr,7).map(function(x){return x.bpm}))},
      appointments:rs[3].filter(function(x){return x&&x.profile===p}).slice(0,40),
      documents:{count:di.length,withExplanation:di.filter(function(x){return!!x.explanation}).length,index:di},
      healthConnect:{importedAt:imp&&imp.importedAt||null,exportedAt:raw&&raw.exportedAt||raw&&raw.rangeEnd||null,source:'local-cache'},
      signals:[]
    };
    c.signals=signals(c);c.summary=summary(c);
    localStorage.setItem(KEY+p,JSON.stringify(c));
    localStorage.setItem(KEY+p+'-status',JSON.stringify({ok:true,updatedAt:c.generatedAt,reason:c.reason}));
    try{window.dispatchEvent(new CustomEvent('healthhub:lena-context-updated',{detail:{profile:p,generatedAt:c.generatedAt,local:true}}))}catch(e){}
    renderStatus();
    return c;
  })().catch(function(e){
    console.error('Léna Context v289 build failed',e);
    localStorage.setItem(KEY+p+'-status',JSON.stringify({ok:false,updatedAt:new Date().toISOString(),error:String(e&&e.message||e)}));
    renderStatus();
    return null;
  }).finally(function(){running[p]=null});
  return running[p];
}
function fmt(s){if(!s)return'még nem';var d=new Date(s);return isNaN(d)?'még nem':d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function renderStatus(){
  var card=document.getElementById('hhUnifiedCloudVaultCard');if(!card)return;
  var old=document.getElementById('hhLenaCtx289');if(old)old.remove();
  var p=pkey(),st={};try{st=JSON.parse(localStorage.getItem(KEY+p+'-status')||'{}')}catch(e){}
  var el=document.createElement('div');el.id='hhLenaCtx289';el.className='hhUcMeta';el.style.lineHeight='1.55';
  el.innerHTML='<b style="color:#6c4fc4">🧠 Léna Health Context · '+pname(p)+'</b><br>'+
    'Helyi context: '+(st.ok?'✅ '+fmt(st.updatedAt):(st.error?'⚠ '+trim(st.error,90):'⏳ még nincs'))+
    '<br><span style="color:#8b98a5">Cloud: teszt alatt · v289 csak helyi gyűjtés</span>';
  card.appendChild(el);
}
function schedule(profile,reason,delay){
  var p=pkey(profile);
  clearTimeout(timers[p]);
  timers[p]=setTimeout(function(){build(p,reason).catch(function(){})},delay==null?700:delay);
}
window.hhRefreshLenaHealthContext289=function(p,r){return build(p||pkey(),r||'manual')};
window.hhGetLenaHealthContext289=function(p){try{return JSON.parse(localStorage.getItem(KEY+pkey(p))||'null')}catch(e){return null}};
window.hhGetLenaHealthContextText289=function(p){var x=window.hhGetLenaHealthContext289(p);return x&&x.summary||''};

window.addEventListener('healthhub:health-cloud-synced',function(e){schedule(e&&e.detail&&e.detail.profile,'health-connect-sync',650)});
window.addEventListener('healthhub:measurement-saved',function(e){schedule(e&&e.detail&&e.detail.profile,'measurement-saved',650)});
window.addEventListener('healthhub:profile-changed',function(e){renderStatus();schedule(e&&e.detail&&e.detail.profile||pkey(),'profile-changed',800)});
window.addEventListener('focus',function(){renderStatus();schedule(pkey(),'focus-refresh',1200)});

try{
  if(typeof window.renderHealthSection==='function'&&!window.renderHealthSection.__lena289){
    var oldRender=window.renderHealthSection;
    var wrapped=async function(){var r=await oldRender.apply(this,arguments);setTimeout(renderStatus,80);return r};
    wrapped.__lena289=true;window.renderHealthSection=wrapped;
  }
}catch(e){}

setTimeout(function(){renderStatus();schedule(pkey(),'startup',1200)},1000);
document.documentElement.dataset.healthhubLenaContext='1.289-local';
})();