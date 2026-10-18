(function(){
'use strict';
/* HealthHub v651 · Read-only Sleep evidence alignment for Ask Léna.
 * Mirrors the canonical Sleep screen: per-profile Dropbox Health Connect
 * first, then ALL local Health Connect imports. No writes, no raw AI export.
 * The result overlays only the current in-memory research context.
 */
var SCHEMA='healthhub.sleep-evidence/1',MAX_AGE=95*86400000,MAX_FUTURE=300000,MAX_SESSIONS=80;
var last=null;
function valid(p){return p==='zsolt'||p==='monika'}
function parsed(s){var n=typeof s==='string'?Date.parse(s):NaN;return Number.isFinite(n)?n:null}
function normalize(rows,now){
 var byInterval=new Map();
 (Array.isArray(rows)?rows:[]).forEach(function(s){
  if(!s)return;
  var a=parsed(s.startTime),b=parsed(s.endTime);
  if(a==null||b==null||b<=a||b-a>16*3600000||b>now+MAX_FUTURE||b<now-MAX_AGE)return;
  var minutes=Math.round((b-a)/60000);
  if(minutes<1||minutes>960)return;
  var key=a+'|'+b;
  if(!byInterval.has(key))byInterval.set(key,{
   startTime:new Date(a).toISOString(),endTime:new Date(b).toISOString(),
   durationMin:minutes,sourcePackage:String(s.sourcePackage||'').slice(0,90)
  });
 });
 return Array.from(byInterval.values()).sort(function(a,b){return Date.parse(b.endTime)-Date.parse(a.endTime)}).slice(0,MAX_SESSIONS);
}
function localImports(profile){
 return new Promise(function(resolve){
  if(!window.indexedDB){resolve(null);return}
  var request,finished=false;
  function finish(x){if(finished)return;finished=true;resolve(x)}
  try{
   request=window.indexedDB.open('healthhub-connect-v1',2);
   request.onerror=function(){finish(null)};
   request.onsuccess=function(){
    var db=request.result,rows=[],latest=null,matched=false,tx;
    try{
     if(!db.objectStoreNames.contains('imports')){db.close();finish(null);return}
     tx=db.transaction('imports','readonly');
     var cursor=tx.objectStore('imports').openCursor();
     cursor.onerror=function(){db.close();finish(null)};
     cursor.onsuccess=function(){
      var c=cursor.result;
      if(!c){db.close();finish(matched?{rows:rows,exportedAt:latest}:null);return}
      var x=c.value;
      if(x&&x.profile===profile&&x.bundle&&x.bundle.records&&Array.isArray(x.bundle.records.sleepSessions)){
       matched=true;rows.push.apply(rows,x.bundle.records.sleepSessions.slice(0,300));
       var t=x.bundle.exportedAt||x.importedAt;
       if(parsed(t)!=null&&(!latest||parsed(t)>parsed(latest)))latest=t;
      }
      c.continue();
     };
    }catch(e){try{db.close()}catch(_){}finish(null)}
   };
  }catch(e){finish(null)}
 });
}
async function select(profile,now){
 var vault=window.HH_DROPBOX_VAULT,warning='';
 if(vault&&typeof vault.connected==='function'&&vault.connected()&&typeof vault.downloadJson==='function'){
  try{
   var raw=await vault.downloadJson('/HealthHub/profiles/'+profile+'-health-connect.json');
   if(raw!=null){
    if(String(raw.profile||'').toLowerCase()!==profile)
     throw Error('Sleep source profile mismatch');
    if(!raw.records||!Array.isArray(raw.records.sleepSessions))
     throw Error('Sleep source schema mismatch');
    return {source:'Dropbox Health Connect',verified:true,items:normalize(raw.records.sleepSessions,now),exportedAt:raw.exportedAt||null};
   }
  }catch(e){
   if(/Sleep source (profile|schema) mismatch/.test(String(e&&e.message)))throw e;
   warning='A Dropbox-alvásforrás nem volt elérhető; helyi import ellenőrizve.';
  }
 }
 var local=await localImports(profile);
 if(local){
  return {source:'helyi Health Connect importok',verified:true,items:normalize(local.rows,now),
   exportedAt:local.exportedAt,warning:warning};
 }
 return {source:'nem ellenőrizhető',verified:false,items:[],exportedAt:null,warning:warning||'Sem felhőbeli, sem helyi import nem ellenőrizhető.'};
}
function mean(xs){return xs.length?Math.round(xs.reduce(function(a,b){return a+b.durationMin},0)/xs.length*10)/10:null}
function summary(items,days,now){
 var matches=items.filter(function(s){var at=parsed(s.endTime);return at!=null&&at>=now-days*86400000});
 return {sessions:matches.length,avgDurationMin:mean(matches),latest:matches[0]||null};
}
async function reconcile(report,context,profile,opts){
 if(!valid(profile)||!report||report.profile!==profile||!context||context.profile!==profile)
  throw Error('Sleep evidence: profilazonosítási eltérés; a kutatás leállt.');
 var now=opts&&Number.isFinite(opts.now)?opts.now:Date.now();
 var selected=await select(profile,now);
 if(!valid(profile)||report.profile!==profile||context.profile!==profile)
  throw Error('Sleep evidence: profilváltás; a kutatás leállt.');
 var out=Object.assign({},context),sleep=Object.assign({},context.sleep||{});
 var record=report.sources&&report.sources.find(function(s){return s.id==='sleep'});
 var note='I-03 adatforrás: '+selected.source+'. '+(selected.warning||'');
 if(selected.verified){
  sleep.recent=selected.items;
  sleep.h72=summary(selected.items,3,now);
  sleep.d7=summary(selected.items,7,now);
  sleep.d30=summary(selected.items,30,now);
  sleep.evidence={schema:SCHEMA,source:selected.source,exportedAt:selected.exportedAt,
   status:selected.items.length?'verified':'verified-empty',sessions:selected.items.length,
   warning:selected.warning||''};
  if(record){
   var latest=selected.items[0]||null;
   record.entries=[];
   if(latest)record.entries.push({name:'Legutóbbi alvásszakasz',value:String(latest.durationMin),unit:'perc',observedAt:latest.endTime,detail:'Mért szakasz, nem feltétlen teljes éjszaka'});
   [['72 órás',sleep.h72],['7 napos',sleep.d7],['30 napos',sleep.d30]].forEach(function(pair){
    if(pair[1].avgDurationMin!=null)record.entries.push({name:pair[0]+' alvásszakasz-átlag',value:String(pair[1].avgDurationMin),unit:'perc',observedAt:null,detail:'Rögzített szakaszok átlaga'});
   });
   record.observedAt=latest?latest.endTime:null;
   record.status=!latest?'missing':now-parsed(latest.endTime)>14*86400000?'stale':'available';
   record.detail=note+(latest?'':' A kiválasztott hiteles forrásban nincs érvényes alvásszakasz.');
  }
 }else{
  sleep.evidence={schema:SCHEMA,source:selected.source,status:'unavailable',sessions:null,
   warning:selected.warning};
  if(record)record.detail=(record.detail||'')+' · '+note+' Korábbi kontextusérték ellenőrizetlen; 0/7 nem bizonyít adatvesztést.';
 }
 out.sleep=sleep;
 out.sleepSourceCheckedAt=new Date(now).toISOString();
 last={profile:profile,context:out,createdAt:Date.now()};
 if(Array.isArray(report.sources)){
  report.available=report.sources.filter(function(s){return s.status==='available'}).length;
  report.stale=report.sources.filter(function(s){return s.status==='stale'}).length;
  report.missing=report.sources.filter(function(s){return s.status==='missing'}).length;
 }
 return report;
}
function getContext(profile,fallback){
 if(last&&last.profile===profile&&Date.now()-last.createdAt<120000)return last.context;
 return fallback;
}
window.HH_SLEEP_EVIDENCE_V651={reconcile:reconcile,getContext:getContext,normalize:normalize,version:'651'};
})();