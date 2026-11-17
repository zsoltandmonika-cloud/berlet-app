/* Sleep Local-First v3. Profile-keyed, bounded, device-only measured sessions.
 * No tokens, raw Health Connect file, biometrics, prescriptions or uploads.
 * Always revalidate the canonical profile Dropbox export after the first paint.
 */
(function(root){
'use strict';
var DB='sho-sleep-local-v3',STORE='sessions',DAYS=95,MAX_BYTES=750000;
function owner(p){return p==='monika'||p==='zsolt'}
function open(){return new Promise(function(ok,no){
 var r=indexedDB.open(DB,1);
 r.onupgradeneeded=function(){var db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'profile'})};
 r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)};
 r.onblocked=function(){no(new Error('Sleep local cache blocked'))};
})}
function validTime(s){return typeof s==='string'&&Number.isFinite(Date.parse(s))}
function snapshot(p,raw){
 if(!owner(p)||!raw||raw.profile!==p||!raw.records)return null;
 var stamp=Date.parse(raw.exportedAt||''),now=Date.now();
 if(!Number.isFinite(stamp)||stamp>now+300000||stamp<now-DAYS*86400000)return null;
 var cut=now-DAYS*86400000,valid=[];
 (Array.isArray(raw.records.sleepSessions)?raw.records.sleepSessions:[]).forEach(function(s){
  if(!s||!validTime(s.startTime)||!validTime(s.endTime))return;
  var a=Date.parse(s.startTime),b=Date.parse(s.endTime);
  if(b<=a||b-a>16*3600000||b<cut||b>now+300000)return;
  var stages=(Array.isArray(s.stages)?s.stages:[]).filter(function(x){
   return x&&Number.isInteger(Number(x.stage))&&Number(x.stage)>=0&&Number(x.stage)<=7&&
    validTime(x.startTime)&&validTime(x.endTime)&&Date.parse(x.endTime)>Date.parse(x.startTime)&&
    Date.parse(x.startTime)>=a-300000&&Date.parse(x.endTime)<=b+300000;
  }).slice(0,1000).map(function(x){return {stage:Number(x.stage),startTime:x.startTime,endTime:x.endTime}});
  valid.push({id:String(s.id||s.startTime+'|'+s.endTime).slice(0,100),
   startTime:s.startTime,endTime:s.endTime,sourcePackage:String(s.sourcePackage||'Health Connect').slice(0,100),stages:stages});
 });
 valid.sort(function(a,b){return Date.parse(a.endTime)-Date.parse(b.endTime)});
 valid=valid.slice(-450);
 if(!valid.length)return null;
 var record={profile:p,exportedAt:raw.exportedAt,rows:valid,savedAt:new Date().toISOString()};
 return JSON.stringify(record).length<=MAX_BYTES?record:null;
}
async function save(profile,raw){
 var record=snapshot(profile,raw);if(!record)return false;
 var db=await open();try{return await new Promise(function(ok,no){
  var t=db.transaction(STORE,'readwrite'),st=t.objectStore(STORE),read=st.get(profile),written=false;
  read.onsuccess=function(){
   var previous=read.result&&Date.parse(read.result.exportedAt||'');
   if(Number.isFinite(previous)&&previous>Date.parse(record.exportedAt))return;
   st.put(record);written=true;
  };
  read.onerror=function(){no(read.error)};
  t.oncomplete=function(){ok(written)};t.onerror=function(){no(t.error)};t.onabort=function(){no(t.error)};
 })}finally{db.close()}
}
async function read(profile){
 if(!owner(profile))return null;
 var db=await open();try{return await new Promise(function(ok,no){
  var t=db.transaction(STORE,'readonly'),r=t.objectStore(STORE).get(profile);
  r.onsuccess=function(){
   var item=r.result,now=Date.now(),stamp=item&&Date.parse(item.exportedAt||'');
   if(!item||item.profile!==profile||!Array.isArray(item.rows)||!item.rows.length||
    !Number.isFinite(stamp)||stamp>now+300000||stamp<now-DAYS*86400000){ok(null);return}
   ok({profile:profile,exportedAt:item.exportedAt,rows:item.rows});
  };
  r.onerror=function(){no(r.error)};
 })}finally{db.close()}
}
root.HH_SLEEP_LOCAL_V3={read:read,save:save,version:'3',snapshot:snapshot};
})(window);
