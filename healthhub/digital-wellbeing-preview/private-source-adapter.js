/* STAGING ONLY: never loaded by public preview or used for authentication.
 * Calling app must check private server authorization and user consent FIRST.
 * No HTTP, storage, logging or transmission. Source = local Android pilot.
 */
(function(host){
'use strict';
const SCHEMA='healthhub.digital-usage.detail-pilot/1', SOURCE='android.usage-events.observed-app-foreground';
const HOUR=3600000, DAY=86400000, MAX=24*31*250, PACKAGE=/^[a-zA-Z0-9_.:-]{1,180}$/;
const dt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
function budapest(ms){
  const p=Object.fromEntries(dt.formatToParts(new Date(ms))
    .filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return {date:p.year+'-'+p.month+'-'+p.day,hour:Number(p.hour)};
}
function validate(input,permission){
  if(!permission||permission.consentConfirmed!==true||!['zsolt','monika'].includes(permission.profileKey))
    throw Error('Missing server-authorized profile or explicit consent');
  if(!input||input.schema!==SCHEMA||input.source!==SOURCE||input.profileKey!==permission.profileKey)
    throw Error('Unknown source or profile mismatch');
  const now=permission.nowMs===undefined?Date.now():permission.nowMs;
  if(!Number.isSafeInteger(now)||now<0||!Number.isSafeInteger(input.collectedAtMs)||
     input.collectedAtMs>now+300000||input.collectedAtMs<now-45*DAY)
    throw Error('Unverifiable timestamp');
  if(input.retentionDays!==30||!Array.isArray(input.hours)||input.hours.length>MAX)
    throw Error('Invalid bounded input');
  const keys=new Set(), totals=new Map();
  const hours=input.hours.map(row=>{
    if(!row||!Number.isSafeInteger(row.hourStartMs)||row.hourStartMs<0||
       row.hourStartMs%HOUR!==0||row.hourStartMs>input.collectedAtMs||
       row.hourStartMs<input.collectedAtMs-31*DAY||
       typeof row.packageName!=='string'||!PACKAGE.test(row.packageName)||
       !Number.isSafeInteger(row.observedForegroundMs)||row.observedForegroundMs<=0||
       row.observedForegroundMs>HOUR||
       !Number.isSafeInteger(row.sessionFragments)||row.sessionFragments<1||
       row.sessionFragments>100000)throw Error('Invalid app-hour observation');
    const k=row.hourStartMs+'|'+row.packageName;
    if(keys.has(k))throw Error('Duplicated app-hour observation');
    keys.add(k);
    const sum=(totals.get(row.hourStartMs)||0)+row.observedForegroundMs;
    if(sum>HOUR)throw Error('Foreground duration exceeds hour');
    totals.set(row.hourStartMs,sum);
    return {hourStartMs:row.hourStartMs,packageName:row.packageName,
      observedForegroundMs:row.observedForegroundMs,sessionFragments:row.sessionFragments};
  });
  return {profileKey:input.profileKey,source:SOURCE,collectedAtMs:input.collectedAtMs,
    observedUtcHourBins:totals.size,hours};
}
function summarize(doc,options){
  if(!doc||!Array.isArray(doc.hours))throw Error('Validate document first');
  const now=options&&options.nowMs!==undefined?options.nowMs:Date.now();
  const days=options&&options.days||1;
  if(![1,7,30].includes(days))throw Error('Unsupported time window');
  const today=budapest(now).date;
  const d=today.split('-').map(Number);
  const utcMidnight=Date.UTC(d[0],d[1]-1,d[2]);
  const allowed=new Set(Array.from({length:days},(_,i)=>
    new Date(utcMidnight-i*DAY).toISOString().slice(0,10)));
  const included=doc.hours.filter(row=>row.hourStartMs<=now&&
    allowed.has(budapest(row.hourStartMs).date));
  const app=new Map(),date=new Map(),utcHours=new Map(),hours=Array(24).fill(null);
  let total=0,evening=0,chatgpt=0;
  for(const row of included){
    const value=row.observedForegroundMs,key=budapest(row.hourStartMs);
    total+=value;
    app.set(row.packageName,(app.get(row.packageName)||0)+value);
    date.set(key.date,(date.get(key.date)||0)+value);
    utcHours.set(row.hourStartMs,(utcHours.get(row.hourStartMs)||0)+value);
    if(key.hour>=20&&key.hour<=23)evening+=value;
    if(row.packageName==='com.openai.chatgpt')chatgpt+=value;
    if(key.date===today)hours[key.hour]=(hours[key.hour]||0)+value;
  }
  return {profileKey:doc.profileKey,source:doc.source,localZone:'Europe/Budapest',
    localToday:today,days,observedForegroundMs:total,eveningForegroundMs:evening,
    chatGptForegroundMs:chatgpt,observedUtcHourBins:utcHours.size,
    todayObservedHours:hours,
    topApps:[...app].sort((a,b)=>b[1]-a[1]).map(([packageName,observedForegroundMs])=>
      ({packageName,observedForegroundMs})),
    byLocalDate:[...date].sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([date,foregroundMs])=>({date,foregroundMs})),missingIsUnknown:true};
}
const api=Object.freeze({validate,summarize,SCHEMA,SOURCE});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else if(host)host.HH_DW_PRIVATE_ADAPTER_STAGING=api;
})(typeof window==='undefined'?null:window);
