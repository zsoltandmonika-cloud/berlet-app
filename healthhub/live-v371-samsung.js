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
function localDay(now){var d=new Date(now);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
var MAX_TODAY_SDK_AGE_MS=90*60*1000; // Today is live data. Historical completed days are unaffected.
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
 // Keep full Beta history in Dropbox, but show the newest 72 UNIQUE
 // hours, otherwise the first 72 old entries hide today's new readings.
 if(Array.isArray(inputHourly))inputHourly.filter(function(r){return r&&isDay(r.date)})
  .sort(function(a,b){return b.date.localeCompare(a.date)||Number(b.hour)-Number(a.hour)})
  .forEach(function(r){
  if(hourly.length>=72)return;
  if(Date.parse(r.date+'T00:00:00Z')>now+86400000)return;
  var h=number(r.hour,0,23),steps=number(r.steps,0,100000);
  if(h==null||h!==Math.floor(h)||steps==null)return;
  var key=r.date+'|'+h;if(seenHours.has(key))return;seenHours.add(key);
  hourly.push({date:r.date,hour:h,steps:steps,source:'samsung-direct'});
 });
 var sessions=[],seenSession=new Set();
 var inputSessions=raw.records&&raw.records.exerciseSessions;
 // Prefer the latest 600 valid sessions, not the first 600 rows of an
 // historical Beta archive. Keep the raw cloud archive untouched.
 if(Array.isArray(inputSessions))inputSessions.filter(function(r){return r&&dateMs(r.endTime)!=null})
  .sort(function(a,b){return dateMs(b.endTime)-dateMs(a.endTime)})
  .forEach(function(r){
  if(sessions.length>=600)return;
  var start=dateMs(r.startTime),end=dateMs(r.endTime);
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

 // Optional Samsung Watch9 source arrays. These are NOT Health Connect
 // records and are never inferred from steps or other people's profile.
 var rawRecords=raw.records||{};
 var sleepSessions=[],seenSleep=new Set();
 var sleepRaw=rawRecords.samsungSleepSessions;
 if(Array.isArray(sleepRaw))sleepRaw.forEach(function(r){
  if(!r||typeof r.uid!=='string'||!r.uid||seenSleep.has(r.uid))return;
  var start=dateMs(r.startTime),end=dateMs(r.endTime),date=r.date;
  if(start==null||end==null||end<=start||end-start>86400000||start>now+300000||
     end>now+300000||start<now-35*86400000||!isDay(date))return;
  seenSleep.add(r.uid);
  var row={uid:r.uid,date:date,startTime:r.startTime,endTime:r.endTime,
   source:'samsung-health-data-sdk-1.1.0'};
  var min=number(r.sleepMinutes,1,1440),score=number(r.sleepScore,0,100);
  if(min!=null)row.sleepMinutes=min;
  if(score!=null)row.sleepScore=score;
  if(Array.isArray(r.sessions))row.sessions=r.sessions.filter(function(x){
   if(!x)return false;var a=dateMs(x.startTime),b=dateMs(x.endTime);
   return a!=null&&b!=null&&b>a&&a>=start&&b<=end;
  }).slice(0,12);
  sleepSessions.push(row);
 });
 sleepSessions.sort(function(a,b){return dateMs(b.endTime)-dateMs(a.endTime)});
 sleepSessions=sleepSessions.slice(0,30);
 var energyScores=[],seenDates=new Set();
 if(Array.isArray(rawRecords.samsungEnergyScores))rawRecords.samsungEnergyScores.forEach(function(r){
  if(!r||!isDay(r.date)||seenDates.has(r.date))return;
  if(Date.parse(r.date+'T00:00:00Z')>now+86400000||
     Date.parse(r.date+'T00:00:00Z')<now-35*86400000)return;
  var score=number(r.energyScore,0,100);if(score==null)return;
  seenDates.add(r.date);
  energyScores.push({date:r.date,energyScore:score,source:'samsung-health-data-sdk-1.1.0'});
 });
 energyScores.sort(function(a,b){return b.date.localeCompare(a.date)});
 energyScores=energyScores.slice(0,30);
 function night(source,minKey,maxKey,singleKey,low,high){
  var rows=[],keys=new Set();
  if(!Array.isArray(source))return rows;
  source.forEach(function(r){
   if(!r||typeof r.sleepUid!=='string'||!r.sleepUid)return;
   var start=dateMs(r.startTime),end=dateMs(r.endTime);
   if(start==null||end==null||end<start||end>now+300000||
      start<now-35*86400000)return;
   var key=r.sleepUid+'|'+r.startTime;
   if(keys.has(key))return;
   var min=number(r[minKey],low,high),max=number(r[maxKey],low,high),
       value=number(r[singleKey],low,high);
   if(min==null&&max==null&&value==null)return;
   if(min!=null&&max!=null&&min>max)return;
   keys.add(key);
   var row={sleepUid:r.sleepUid,startTime:r.startTime,endTime:r.endTime,
       source:'samsung-health-data-sdk-1.1.0'};
   if(min!=null)row[minKey]=min;
   if(max!=null)row[maxKey]=max;
   if(value!=null)row[singleKey]=value;
   rows.push(row);
  });
  rows.sort(function(a,b){return dateMs(b.endTime)-dateMs(a.endTime)});
  return rows.slice(0,60);
 }
 var nightOxygen=night(rawRecords.samsungNightOxygen,'minPercent','maxPercent','percent',50,100);
 var nightSkinTemperature=night(rawRecords.samsungNightSkinTemperature,
      'minCelsius','maxCelsius','celsius',10,45);
 return {profile:p,exportedAt:raw.exportedAt,days:days,rawVersion:raw.schemaVersion,
  file:path(p),hourlySteps:hourly,exerciseSessions:sessions,
  sleepSessions:sleepSessions,energyScores:energyScores,nightOxygen:nightOxygen,
  nightSkinTemperature:nightSkinTemperature};
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
 var stamp=dateMs(result.data.exportedAt),now=Date.now();
 // The Samsung SDK JSON is a snapshot, not a live Samsung Health connection.
 // Never replace *today's* newer Health Connect values with a Samsung
 // snapshot older than 90 minutes. Keep completed days and source records.
 var staleToday=stamp==null || now-stamp>MAX_TODAY_SDK_AGE_MS;
 // Prefer a more recent, successful HC export whenever one exists for today.
 // It is not safe to silently overwrite a newer day's data with an older
 // snapshot, even when the snapshot itself is less than 90 minutes old.
 var today=localDay(now);
 var todayHC=(Array.isArray(c.daily)?c.daily:[]).find(function(d){return d.date===today});
 var hcStamp=todayHC&&dateMs(todayHC._hhBundleAt);
 var newerHc=hcStamp!=null&&stamp!=null&&hcStamp>stamp;
 var skipToday=staleToday||newerHc;
 result.data.staleToday=skipToday;
 result.data.staleReason=staleToday?'Samsung export túl régi a mai élő összesítőhöz':
  (newerHc?'Health Connect export újabb, mint a Samsung-pillanatkép':null);
 var out=Object.assign({},c);
 out.samsungHourlySteps=result.data.hourlySteps||[];
 out.samsungSessions=result.data.exerciseSessions||[];
 out.samsungSleepSessions=result.data.sleepSessions||[];
 out.samsungEnergyScores=result.data.energyScores||[];
 out.samsungNightOxygen=result.data.nightOxygen||[];
 out.samsungNightSkinTemperature=result.data.nightSkinTemperature||[];
 // These independently sourced fields coexist with Health Connect sleep records.
 // A missing measurement produces an empty array, never a synthetic value.
 out.samsungWellnessSource={profile:requestedProfile,exportedAt:result.data.exportedAt,
   sleepScore:out.samsungSleepSessions.find(function(x){return x.sleepScore!=null})||null,
   energyScore:out.samsungEnergyScores[0]||null,
   nightOxygen:out.samsungNightOxygen[0]||null,
   nightSkinTemperature:out.samsungNightSkinTemperature[0]||null};
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
  if(day.date===today&&skipToday){
   // A newer Health Connect export may have steps but NO active-time record.
   // If today's Samsung snapshot is still fresh, recover ONLY the missing,
   // directly measured active minutes; never replace a valid HC minute value.
   // Stale Samsung snapshots and other metrics retain the existing guard.
   if(!staleToday&&newerHc&&
      (day.activeMinutes==null||!Number.isFinite(Number(day.activeMinutes)))&&
      Object.prototype.hasOwnProperty.call(samsung,'activeMinutes')){
    var recovered=Object.assign({},day);
    recovered.activeMinutes=samsung.activeMinutes;
    recovered._hhSamsung=samsung;
    recovered._hhFieldSources=Object.assign({},day._hhFieldSources,{activeMinutes:'samsung-direct'});
    recovered._hhSamsungMeasuredAt=result.data.exportedAt;
    out.samsungTodayRecoveredActiveMinutes=true;
    found++;
    return recovered;
   }
   out.samsungTodaySkipped=true;
   return day;
  }
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
 if(out.samsungTodayRecoveredActiveMinutes){
  result.data.staleToday=false;
  result.data.staleReason='Friss Samsung aktív idő pótolta a hiányzó Health Connect mezőt; a többi HC adat változatlan.';
 }
 return out;
}
window.HH_SAMSUNG_SOURCE_V371={path:path,normalize:normalize,load:load,merge:merge,version:'388-watch9-wellness'};
})();