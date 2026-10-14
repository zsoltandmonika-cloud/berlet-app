(function(root){
'use strict';
/* Private, read-only Digital Wellbeing connector for the EXISTING HealthHub
   Dropbox App Folder. Only owner-authorized data is rendered; no demo fallback. */
const SCHEMA='healthhub.digital-wellbeing/1';
const SOURCE='android.usage-events.observed-app-foreground';
const HOUR=3600000,DAY=86400000;
const DATE=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
const APP_KEY='t68rmhh5f1l8d85';
function local(ms){const x={};for(const p of DATE.formatToParts(new Date(ms)))if(p.type!=='literal')x[p.type]=p.value;return {date:x.year+'-'+x.month+'-'+x.day,hour:Number(x.hour)};}
function validate(raw,profile,now=Date.now()){
 if(profile!=='zsolt'&&profile!=='monika')throw Error('Ismeretlen profil');
 if(!raw||raw.schema!==SCHEMA||raw.source!==SOURCE||raw.profileKey!==profile||
    raw.retentionDays!==30||raw.missingIsUnknown!==true)throw Error('Nem hitelesített forrás vagy hibás profil');
 if(!Number.isSafeInteger(raw.collectedAtMs)||raw.collectedAtMs>now+300000||
    raw.collectedAtMs<now-31*DAY)throw Error('Érvénytelen mérési idő');
 if(!Array.isArray(raw.hours)||raw.hours.length>744)throw Error('Érvénytelen mérési sorok');
 const seen=new Set();
 const hours=raw.hours.map(h=>{
   if(!h||!Number.isSafeInteger(h.hourStartMs)||h.hourStartMs%HOUR!==0||
      h.hourStartMs<raw.collectedAtMs-31*DAY||h.hourStartMs>=raw.collectedAtMs||
      !Number.isSafeInteger(h.observedForegroundMs)||h.observedForegroundMs<1||h.observedForegroundMs>HOUR||
      !Number.isSafeInteger(h.chatGptForegroundMs)||h.chatGptForegroundMs<0||h.chatGptForegroundMs>h.observedForegroundMs||
      !Number.isInteger(h.sessionFragments)||h.sessionFragments<1||h.sessionFragments>100000||
      seen.has(h.hourStartMs))throw Error('Érvénytelen vagy duplikált idősáv');
   seen.add(h.hourStartMs);
   return {hourStartMs:h.hourStartMs,observedForegroundMs:h.observedForegroundMs,
     chatGptForegroundMs:h.chatGptForegroundMs,sessionFragments:h.sessionFragments};
 });
 return {schema:SCHEMA,source:SOURCE,profileKey:profile,collectedAtMs:raw.collectedAtMs,
   hours,missingIsUnknown:true};
}
function dateKeys(now,days){
 const d=local(now).date.split('-').map(Number);
 return new Set(Array.from({length:days},(_,i)=>new Date(Date.UTC(d[0],d[1]-1,d[2]-i)).toISOString().slice(0,10)));
}
function summary(doc,days,now=Date.now()){
 if(![1,7,30].includes(days))throw Error('Érvénytelen intervallum');
 const keys=dateKeys(now,days),today=local(now).date;
 const byDate=new Map(),dayHours=Array(24).fill(null);
 let observed=0,chatgpt=0,evening=0,covered=0;
 for(const r of doc.hours){
   const loc=local(r.hourStartMs);
   if(!keys.has(loc.date)||r.hourStartMs>now)continue;
   observed+=r.observedForegroundMs;chatgpt+=r.chatGptForegroundMs;
   if(loc.hour>=20)evening+=r.observedForegroundMs;
   covered++;
   byDate.set(loc.date,(byDate.get(loc.date)||0)+r.observedForegroundMs);
   if(loc.date===today)dayHours[loc.hour]=(dayHours[loc.hour]||0)+r.observedForegroundMs;
 }
 const dayTotals=[...keys].sort().map(date=>({date,foregroundMs:byDate.get(date)??null}));
 return {observed,chatgpt,evening,covered,days,dayHours,dayTotals,
  lastCollectedAtMs:doc.collectedAtMs,missingIsUnknown:true};
}
async function cloudToken(){
 const live=root.HH_DROPBOX_VAULT;
 if(live&&live.connected&&live.connected()&&live.accessToken)return live.accessToken();
 const key='hh-dropbox-token-v2';
 let t;try{t=JSON.parse(localStorage.getItem(key)||'null');}catch(_){t=null;}
 if(!t||!t.refresh_token)throw Error('A HealthHub Dropbox Vault nincs csatlakoztatva ebben a böngészőben');
 if(t.access_token&&Number(t.expires_at)>Date.now()+60000)return t.access_token;
 const form=new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP_KEY});
 const r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
 if(!r.ok)throw Error('Dropbox hozzáférés lejárt; csatlakozz újra a HealthHub főoldalán');
 const j=await r.json();if(!j.access_token)throw Error('Dropbox hozzáférés hiányzik');
 t.access_token=j.access_token;t.expires_at=Date.now()+(Math.max(60,Number(j.expires_in)||14400)-60)*1000;
 localStorage.setItem(key,JSON.stringify(t));
 return t.access_token;
}
async function read(profile){
 if(profile!=='zsolt'&&profile!=='monika')throw Error('Profil hiba');
 const path='/HealthHub/profiles/'+profile+'-digital-wellbeing.json';
 const live=root.HH_DROPBOX_VAULT;
 if(live&&live.connected&&live.connected()&&live.downloadJson){
   try{return validate(await live.downloadJson(path),profile);}
   catch(e){if(e.status===409&&/not_found/i.test(e.message||''))return null;throw e;}
 }
 const token=await cloudToken();
 const r=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',
 headers:{Authorization:'Bearer '+token,'Dropbox-API-Arg':JSON.stringify({path})}});
 if(r.status===409)return null;
 if(!r.ok)throw Error('Dropbox adatolvasási hiba ('+r.status+')');
 return validate(await r.json(),profile);
}
root.HH_DW_VAULT_V507=Object.freeze({validate,summary,read,local,SCHEMA,SOURCE});
if(typeof module!=='undefined'&&module.exports)module.exports=root.HH_DW_VAULT_V507;
})(typeof window==='undefined'?{}:window);
