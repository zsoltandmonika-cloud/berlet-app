(function(){
'use strict';
/* HealthHub v371: source-aware Samsung Health Data SDK ingestion protocol.
   This DOES NOT invoke Samsung's proprietary SDK from the browser.
   Samsung-native APK collector and vendor approval are required for data to arrive.
   Original Health Connect source is never overwritten on disk.
*/
var ROOT='/HealthHub/profiles/';
function profileOk(p){return p==='zsolt'||p==='monika'}
function finite(x){if(x==null||x==='')return null;var n=Number(x);return Number.isFinite(n)?n:null}
function number(x,lo,hi){var n=finite(x);return n!=null&&n>=lo&&n<=hi?n:null}
function isDay(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T12:00:00Z'))}
function dateMs(s){var n=Date.parse(s);return Number.isFinite(n)?n:null}
function path(p){return profileOk(p)?ROOT+p+'-samsung-health.json':null}
function normalize(p,raw){
 if(!profileOk(p)||!raw||raw.profile!==p||!/^healthhub\.samsung\.daily\/1(?:\.\d+)?$/.test(raw.schemaVersion||''))return null;
 var stamp=dateMs(raw.exportedAt),now=Date.now();
 if(stamp==null||stamp>now+300000)return null;
 var list=raw.records&&raw.records.dailySummary;
 if(!Array.isArray(list))return null;
 var days=new Map();
 list.forEach(function(r){
  if(!r||!isDay(r.date))return;
  var dateTs=Date.parse(r.date+'T00:00:00Z');
  if(dateTs>now+86400000||dateTs<now-400*86400000)return;
  var row={date:r.date},any=false;
  // Activity summary measured by Samsung SDK, not guessed from steps.
  var calorie=number(r.activeCaloriesKcal,0,25000);
  if(calorie!=null){row.activeCaloriesKcal=calorie;any=true}
  var time=number(r.activeMinutes,0,1440);
  if(time!=null){row.activeMinutes=time;any=true}
  var distance=number(r.distanceMeters,0,250000);
  if(distance!=null){row.distanceMeters=distance;any=true}
  var floors=number(r.floorsClimbed,0,1000);
  if(floors!=null){row.floorsClimbed=floors;any=true}
  var exerciseElevation=number(r.exerciseElevationGainMeters,0,12000);
  if(exerciseElevation!=null){row.exerciseElevationGainMeters=exerciseElevation;any=true}
  if(any)days.set(r.date,row);
 });
 // Optional v375 source records. Old v374 exports remain fully supported.
 var hourly=[],seenHours=new Set();
 var inputHourly=raw.records&&raw.records.hourlySteps;
 if(Array.isArray(inputHourly))inputHourly.slice(0,72).forEach(function(r){
  if(!r||!isDay(r.date)||Date.parse(r.date+'T00:00:00Z')>now+86400000)return;
  var h=number(r.hour,0,23),steps=number(r.steps,0,100000);
  if(h==null||h!==Math.floor(h)||steps==null)return;
  var key=r.date+'|'+h;if(seenHours.has(key))return;seenHours.add(key);
  hourly.push({date:r.date,hour:h,steps:steps,source:'samsung-direct'});
 });
 var sessions=[],seenSession=new Set();
 var inputSessions=raw.records&&raw.records.exerciseSessions;
 if(Array.isArray(inputSessions))inputSessions.slice(0,600).forEach(function(r){
  if(!r)return;var start=dateMs(r.startTime),end=dateMs(r.endTime);
  if(start==null||end==null||end<=start||end-start>86400000||start>now+300000||start<now-400*86400000)return;
  var typ=String(r.exerciseType||'OTHER').toUpperCase();
  if(!/^[A-Z_]{2,50}$/.test(typ))typ='OTHER';
  var key=String(start)+'|'+String(end)+'|'+typ;
  if(seenSession.has(key))return;seenSession.add(key);
  var dur=(end-start)/60000,dist=number(r.distanceMeters,0,250000),rise=number(r.altitudeGainMeters,0,12000);
  var name={WALKING:'Samsung séta',RUNNING:'Samsung futás',TRACK_RUNNING:'Samsung futás',HIKING:'Samsung túrázás',TREADMILL:'Samsung futás',BIKING:'Samsung kerékpár',STATIONARY_BIKING:'Samsung kerékpár'}[typ]||'Samsung edzés';
  var ss={id:'sdk-'+key,startTime:r.startTime,endTime:r.endTime,title:name,
   samsungExerciseType:typ,_samsung:true,source:'samsung-health-data-sdk-1.1.0'};
  if(dist!=null)ss.distanceKm=dist/1000;
  if(rise!=null)ss.altitudeGainMeters=rise;
  sessions.push(ss);
 });
 return {profile:p,exportedAt:raw.exportedAt,days:days,rawVersion:raw.schemaVersion,
  file:path(p),hourlySteps:hourly,exerciseSessions:sessions};
}
async function load(profile,vault){
 if(!profileOk(profile)||!vault||typeof vault.downloadJson!=='function'||!vault.connected||!vault.connected())
  return {status:'unavailable',data:null,profile:profile};
 try{
  var payload=await vault.downloadJson(path(profile));
  var value=normalize(profile,payload);
  if(!value)return {status:'invalid',data:null,profile:profile};
  return {status:'ready',data:value,profile:profile};
 }catch(e){
  // Missing optional file must never block canonical Health Connect sync.
  return {status:e&&e.status===409?'not_connected':'unavailable',data:null,profile:profile};
 }
}
function merge(c, result, requestedProfile){
 if(!c||!result||result.status!=='ready'||!result.data||result.data.profile!==requestedProfile)
  return c;
 var days=result.data.days,found=0;
 var out=Object.assign({},c);
 out.samsungHourlySteps=result.data.hourlySteps||[];
 out.samsungSessions=result.data.exerciseSessions||[];
 out.sessions=(Array.isArray(c.sessions)?c.sessions:[]).slice();
 // Prefer existing HC exercise session; enrich its missing distance from
 // measured Samsung workout, but never count the same session twice.
 out.samsungSessions.forEach(function(s){
  var start=Date.parse(s.startTime),end=Date.parse(s.endTime),match=out.sessions.find(function(x){
   return Math.abs(Date.parse(x.startTime)-start)<180000&&Math.abs(Date.parse(x.endTime)-end)<180000;
  });
  if(match){
   if(!(Number(match.distanceKm)>0)&&Number(s.distanceKm)>0){
    match=Object.assign({},match,{distanceKm:s.distanceKm,_hhSamsungExerciseDistance:true});
    var idx=out.sessions.findIndex(function(x){return x.id===match.id});if(idx>=0)out.sessions[idx]=match;
   }
  }else out.sessions.push(s);
 });
 out.sessions.sort(function(a,b){return Date.parse(b.endTime)-Date.parse(a.endTime)});
 out.daily=(Array.isArray(c.daily)?c.daily:[]).map(function(day){
  var samsung=days.get(day.date);if(!samsung)return day;
  found++;
  var next=Object.assign({},day);
  next._hhSamsung=samsung;
  next._hhHealthConnect={
   activeCaloriesKcal:day.activeCaloriesKcal,
   activeMinutes:day.activeMinutes,
   distanceMeters:day.distanceMeters,
   floorsClimbed:day.floorsClimbed
  };
  var sources={};
  // Do not fabricate the source: direct is an opt-in, separately uploaded SDK export.
  ['activeCaloriesKcal','activeMinutes','floorsClimbed'].forEach(function(key){
   if(Object.prototype.hasOwnProperty.call(samsung,key)){
    next[key]=samsung[key];sources[key]='samsung-direct';
   }
  });
  if(sources.activeCaloriesKcal)next.caloriesKcal=samsung.activeCaloriesKcal;
  if(Object.prototype.hasOwnProperty.call(samsung,'distanceMeters')){
   next._hhSamsungDistanceMeters=samsung.distanceMeters;
  }
  if(samsung.exerciseElevationGainMeters!=null && day.elevationGainMeters==null){
   next.elevationGainMeters=samsung.exerciseElevationGainMeters;
   next._hhExerciseElevationOnly=true;
   sources.elevationGainMeters='samsung-exercise';
  }
  next._hhFieldSources=sources;
  return next;
 });
 // Samsung-only day is not inserted, because a valid HC daily record is needed
 // for heart/step context and for preventing disconnected stale sources.
 out.samsungMergeCount=found;
 return out;
}
window.HH_SAMSUNG_SOURCE_V371={path:path,normalize:normalize,load:load,merge:merge,version:'371'};
})();