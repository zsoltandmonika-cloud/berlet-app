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
  if(any)days.set(r.date,row);
 });
 return {profile:p,exportedAt:raw.exportedAt,days:days,rawVersion:raw.schemaVersion,file:path(p)};
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