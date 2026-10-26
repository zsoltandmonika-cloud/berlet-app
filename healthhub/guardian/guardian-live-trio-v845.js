/* Family Guard v845 · selected-owner Battery / GPS / Health live trio.
 * Sources: v841 verified battery, v837 authenticated GPS, HealthHub v382
 * sleep index on v428 main night, Nutrition v625 sign-based kcal balance.
 * Read-only, no new Android permission, OAuth scope, uploads or sensor access.
 * Sleep/Nutrition colours describe diary trends, never clinical risk.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_TRIO_V845=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const MIN=60000,HOUR=3600000,DAY=24*HOUR,MAX_SLEEP_AGE=40*HOUR;
 const allowed=['zsolt','monika'];
 const tokenKey='hh-dropbox-token-v2',dropboxApp='t68rmhh5f1l8d85';
 function profileKey(storage){
  try{return storage?.getItem('hh-profile')==='m'?'monika':'zsolt'}
  catch(_){return 'zsolt'}
 }
 function time(x){return Date.parse(x)}
 function dateKey(ms){
  if(!Number.isFinite(ms))return '';
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(ms);
 }
 function budapestHour(ms){
  return Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',hour:'2-digit',hourCycle:'h23'}).format(ms));
 }
 function validSessions(rows,now=Date.now()){
  return (Array.isArray(rows)?rows:[]).filter(r=>{
   const a=time(r?.startTime),b=time(r?.endTime);
   return Number.isFinite(a)&&Number.isFinite(b)&&a<b&&b<=now+5*MIN&&b>now-95*DAY;
  }).slice().sort((a,b)=>time(a.endTime)-time(b.endTime));
 }
 function nightCandidate(s){
  const a=time(s.startTime),b=time(s.endTime);
  if(!(b-a>=90*MIN&&b-a<=16*HOUR))return false;
  let n=0,total=0;
  for(let x=a;x<b;x+=15*MIN){
   const h=budapestHour(Math.min(b,x+7.5*MIN));
   if(h>=21||h<9)n++;
   total++;
  }
  return total>0&&n/total>=.60;
 }
 function latestNight(rows,now=Date.now()){
  const nights=validSessions(rows,now).filter(nightCandidate);
  if(!nights.length)return null;
  const groups=[];
  for(const s of nights){
   const a=time(s.startTime),b=time(s.endTime),g=groups[groups.length-1];
   if(g&&a-g.end<=90*MIN&&b-g.start<=16*HOUR){
    g.end=Math.max(g.end,b);g.sessions.push(s);
   }else groups.push({start:a,end:b,sessions:[s]});
  }
  const best=groups[groups.length-1];
  return {startTime:new Date(best.start).toISOString(),
   endTime:new Date(best.end).toISOString(),sessions:best.sessions,
   stages:best.sessions.flatMap(s=>Array.isArray(s.stages)?s.stages:[])};
 }
 function union(intervals){
  intervals.sort((a,b)=>a[0]-b[0]);
  const out=[];
  for(const interval of intervals){
   const last=out[out.length-1];
   if(last&&interval[0]<=last[1])last[1]=Math.max(last[1],interval[1]);
   else out.push(interval.slice());
  }
  return out;
 }
 function sleepIndex(rows,now=Date.now()){
  const night=latestNight(rows,now);
  if(!night)return null;
  const start=time(night.startTime),end=time(night.endTime),windowMin=(end-start)/MIN;
  if(!(end>now-MAX_SLEEP_AGE&&end<=now+5*MIN&&windowMin>0&&windowMin<=16*60))return null;
  function intervals(codes){
   const seg=night.sessions.flatMap(s=>(Array.isArray(s.stages)?s.stages:[])
    .filter(st=>codes.includes(Number(st.stage)))
    .map(st=>[Math.max(start,time(st.startTime),time(s.startTime)),
     Math.min(end,time(st.endTime),time(s.endTime))])
    .filter(z=>Number.isFinite(z[0])&&Number.isFinite(z[1])&&z[1]>z[0]));
   return union(seg);
  }
  const asleep=intervals([2,4,5,6]);
  if(!asleep.length)return null;
  const actual=asleep.reduce((acc,ab)=>acc+(ab[1]-ab[0])/MIN,0);
  const coverage=intervals([1,2,3,4,5,6,7]).reduce((acc,ab)=>acc+(ab[1]-ab[0])/MIN,0)/windowMin;
  if(actual<15||actual>windowMin*1.02||coverage<.80)return null;
  const efficiency=actual/windowMin;
  let score=Math.round(
   65*Math.max(0,Math.min(1,actual/480))+
   35*Math.max(0,Math.min(1,(efficiency-.5)/.4)));
  if(actual<360)score=Math.min(score,59);
  else if(actual<420)score=Math.min(score,79);
  if(efficiency<.75)score=Math.min(score,79);
  return {score,tone:score<60?'bad':score<80?'warn':'good',
   date:dateKey(end),endAt:end,source:'HealthHub · utolsó éjszaka, Health Connect'};
 }
 function nutritionBalance(profile,doc,energy,now=Date.now()){
  if(!allowed.includes(profile)||!doc||doc.schemaVersion!=='healthhub.nutrition/1'||
   doc.profileKey!==profile)return null;
  const date=dateKey(now);
  const entries=(Array.isArray(doc.entries)?doc.entries:[]).filter(e=>
   e&&!e.deleted&&e.date===date&&e.nutrients&&
   typeof e.nutrients.kcal==='number'&&Number.isFinite(e.nutrients.kcal)&&
   e.nutrients.kcal>=0&&e.nutrients.kcal<=15000);
  if(!entries.length)return null; // Not logging meals ≠ eating zero kcal.
  const ts=time(energy?.updatedAt);
  if(!energy||energy.profile!==profile||energy.date!==date||
   energy.kind!=='total_burned_kcal'||typeof energy.kcal!=='number'||
   !Number.isFinite(energy.kcal)||energy.kcal<=0||!Number.isFinite(ts)||
   ts>now+5000||now-ts>=6*HOUR)return null;
  const net=Math.round(entries.reduce((x,e)=>x+e.nutrients.kcal,0)-energy.kcal);
  return {net,date,tone:net<0?'good':net>0?'bad':'warn',
   source:'Nutrition · mai bevitel − becsült teljes energiafelhasználás'};
 }
 function healthState(sleep,nutrition){
  const weight={good:0,warn:1,bad:2};
  const items=[sleep,nutrition].filter(x=>x&&Object.prototype.hasOwnProperty.call(weight,x.tone));
  if(!items.length)return {tone:'unknown',score:null,factors:[]};
  return {tone:items.reduce((t,x)=>weight[x.tone]>weight[t]?x.tone:t,'good'),
   score:sleep?.score??null,
   factors:items.map(x=>x===sleep?'Sleep':'Nutrition')};
 }
 function gpsState(browser,native,profile,now=Date.now(),revokedAt=NaN){
  const valid=(r,source)=>{
   if(!r||r.profile_key!==profile||!Number.isFinite(r.latitude)||
    !Number.isFinite(r.longitude)||Math.abs(r.latitude)>90||Math.abs(r.longitude)>180||
    !Number.isFinite(r.accuracy_m)||r.accuracy_m<0||r.accuracy_m>100)return null;
   const ts=time(r.updated_at);
   if(!Number.isFinite(ts)||ts>now+5000||now-ts>10*MIN)return null;
   return {ts,source};
  };
  let a=valid(browser,'browser'),b=valid(native,'native');
  if(Number.isFinite(revokedAt)&&a&&a.ts<=revokedAt)a=null;
  const recent=!a?b:!b?a:a.ts>=b.ts?a:b;
  if(!recent)return {state:'unknown',text:'Nincs jel'};
  return now-recent.ts<=(recent.source==='native'?75000:20000)?
   {state:'online',text:'Online',ts:recent.ts}:
   {state:'stale',text:'Régi jel',ts:recent.ts};
 }
 function permitted(auth,profile){
  return !!(auth?.authenticated&&(auth.familyAuthorized||auth.boundProfile===profile));
 }
 async function localSleep(profile){
  if(!w?.indexedDB)return [];
  return new Promise(resolve=>{
   const items=[];let done=false,db;
   const finish=()=>{if(done)return;done=true;try{db?.close?.()}catch(_){}resolve(items)};
   try{
    const req=w.indexedDB.open('healthhub-connect-v1');
    req.onerror=finish;
    req.onsuccess=()=>{
     db=req.result;
     if(!db.objectStoreNames.contains('imports')){finish();return}
     const cur=db.transaction('imports','readonly').objectStore('imports').openCursor(null,'prev');
     cur.onerror=finish;
     cur.onsuccess=()=>{
      const c=cur.result;if(!c){finish();return}
      const v=c.value;
      if(v?.profile===profile&&Array.isArray(v.bundle?.records?.sleepSessions))
       items.push(...v.bundle.records.sleepSessions);
      c.continue();
     };
    };
   }catch(_){finish()}
  });
 }
 function tokenStored(){
  try{
   const t=JSON.parse(w.localStorage.getItem(tokenKey)||'null');
   return typeof t?.refresh_token==='string'&&t.refresh_token.length>10?t:null;
  }catch(_){return null}
 }
 async function getToken(){
  const vault=w.HH_DROPBOX_VAULT;
  if(vault?.connected?.()&&typeof vault.accessToken==='function')return vault.accessToken();
  const t=tokenStored();if(!t)throw Error('Dropbox unavailable');
  if(t.access_token&&Number(t.expires_at)>Date.now()+MIN)return t.access_token;
  const req=await w.fetch('https://api.dropboxapi.com/oauth2/token',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:dropboxApp})});
  if(!req.ok)throw Error('Dropbox not authorized');
  const next=await req.json();if(!next.access_token)throw Error('Dropbox token missing');
  t.access_token=next.access_token;
  t.expires_at=Date.now()+(Number(next.expires_in)||14400)*1000-MIN;
  w.localStorage.setItem(tokenKey,JSON.stringify(t));
  return next.access_token;
 }
 async function readPrivateJson(path){
  const vault=w.HH_DROPBOX_VAULT;
  if(vault?.connected?.()&&typeof vault.downloadJson==='function')return vault.downloadJson(path);
  const token=await getToken();
  const req=await w.fetch('https://content.dropboxapi.com/2/files/download',{
   method:'POST',headers:{Authorization:'Bearer '+token,
    'Dropbox-API-Arg':JSON.stringify({path})},cache:'no-store'});
  if(req.status===409)return null;
  if(!req.ok)throw Error('Private source unavailable');
  return req.json();
 }
 function readLocalNutrition(profile){
  try{const s=JSON.parse(w.localStorage.getItem('hh-nutrition-PREVIEW-v592-'+profile)||'null');
   return s?.profileKey===profile&&s.schemaVersion==='healthhub.nutrition/1'?s:null;
  }catch(_){return null}
 }
 function readEnergy(profile){
  try{return JSON.parse(w.localStorage.getItem('hh-nutrition-total-energy-'+profile)||'null')}
  catch(_){return null}
 }
 function init(){
  const d=w?.document;
  if(!d)return null;
  const root=d.getElementById('guardianTrioV845'),
   gps=d.getElementById('guardianGpsTextV845'),
   gpsCard=d.getElementById('guardianGpsCardV845'),
   health=d.getElementById('guardianHealthTextV845'),
   heart=d.getElementById('guardianHealthCardV845'),
   pop=d.getElementById('guardianHealthPopupV845'),
   scoreText=d.getElementById('guardianHealthSleepDetailV845'),
   sleepInfo=d.getElementById('guardianHealthSleepMetaV845'),
   nutriText=d.getElementById('guardianHealthNutriDetailV845'),
   nutriInfo=d.getElementById('guardianHealthNutriMetaV845'),
   note=d.getElementById('guardianHealthNoteV845'),
   sleepRow=d.getElementById('guardianHealthSleepRowV845'),
   nutriRow=d.getElementById('guardianHealthNutriRowV845'),
   batteryCaption=d.getElementById('guardianBatteryCaptionV845');
  if(!root||!gps||!gpsCard||!health||!heart||!pop||!scoreText||!sleepInfo||!nutriText||!nutriInfo||!note||!sleepRow||!nutriRow||!batteryCaption)return null;
  let generation=0,busy=false,rerun=false,lastProfile=profileKey(w.localStorage),updatedAt=0,
   cachedSleep=null,cachedNutrition=null,cachedGPS=null,lastHealthFetch=0;
  const selected=()=>profileKey(w.localStorage);
  const auth=()=>w.HH_GUARDIAN_LIVE_V785;
  function show(snapshot){
   const g=snapshot?.gps||{state:'unknown',text:'Nincs jel'};
   gps.textContent=g.text;
   gpsCard.dataset.state=g.state;
   gpsCard.setAttribute('aria-label','GPS · '+g.text);
   const sleep=snapshot?.sleep||null,nutrition=snapshot?.nutrition||null;
   const h=healthState(sleep,nutrition);
   heart.dataset.rag=h.tone;
   // v847: the small Health tile displays the observed score alone.
   // Keep the explicit /100 scale only in the expanded Sleep detail.
   health.textContent=sleep?String(sleep.score):'—';
   const owner=lastProfile==='monika'?'Mónika':'Zsolt';
   batteryCaption.textContent=owner+' telefon';
   sleepRow.dataset.rag=sleep?.tone||'unknown';
   nutriRow.dataset.rag=nutrition?.tone||'unknown';
   const overall={good:'kedvező',warn:'figyelendő',bad:'figyelmet igényel',unknown:'nincs adat'};
   heart.setAttribute('aria-label',owner+' · napi Health státusz · '+overall[h.tone]+'. Koppints a részletekhez');
   scoreText.textContent=sleep?sleep.score+' / 100':'—';
   sleepInfo.textContent=sleep?sleep.date+' · '+sleep.source:'Nincs friss, ellenőrizhető éjszakai alvásindex';
   nutriText.textContent=nutrition?(nutrition.net<0?'−':nutrition.net>0?'+':'')+
    Math.abs(nutrition.net)+' kcal':'—';
   nutriInfo.textContent=nutrition?nutrition.date+' · '+nutrition.source:
    'Nincs friss napi bevitel + teljes energiafelhasználás adat';
   note.textContent='A szív színe az elérhető Sleep és Nutrition RAG közül az óvatosabbat követi. '+ 
    'Tájékoztató napi státusz, nem orvosi pontszám. Koppints a panelre a bezáráshoz.';
  }
  function close(){
   pop.hidden=true;heart.setAttribute('aria-expanded','false');
  }
  function open(){
   pop.hidden=false;heart.setAttribute('aria-expanded','true');
  }
  heart.addEventListener('click',()=>pop.hidden?open():close());
  pop.addEventListener('click',close);
  d.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  function invalidate(){
   generation++;lastProfile=selected();cachedSleep=null;cachedNutrition=null;cachedGPS=null;
   lastHealthFetch=0;updatedAt=0;close();show(null);
  }
  async function fetchHealth(profile,stamp){
   let rows=[],nutrition=null;
   try{
    const raw=await readPrivateJson('/HealthHub/profiles/'+profile+'-health-connect.json');
    if(raw?.profile===profile)rows=raw.records?.sleepSessions||[];
    else rows=await localSleep(profile);
   }catch(_){rows=await localSleep(profile)}
   try{
    const raw=await readPrivateJson('/HealthHub/profiles/'+profile+'-nutrition.json');
    if(raw?.profileKey===profile&&raw?.schemaVersion==='healthhub.nutrition/1')
     nutrition=raw;
    else nutrition=readLocalNutrition(profile);
   }catch(_){nutrition=readLocalNutrition(profile)}
   return {sleep:sleepIndex(rows,stamp),nutrition};
  }
  async function fetchGps(profile){
   const live=auth(),client=live?.getClient?.();
   if(!client)return {state:'unknown',text:'Nincs jel'};
   let browser=null,native=null,revokeAt=NaN;
   try{
    const resp=await client.from('hh_guardian_live_locations')
     .select('profile_key,latitude,longitude,accuracy_m,updated_at')
     .eq('profile_key',profile).maybeSingle();
    if(!resp.error&&resp.data)browser=resp.data;
   }catch(_){}
   try{
    const relay=w.HH_GUARDIAN_NATIVE_V156;
    if(relay?.connected?.()){
     const result=await relay.read(profile);
     if(result.status==='ok')native=result.data;
     if(result.status==='revoked')revokeAt=time(result.updated_at);
    }
   }catch(_){}
   return {browser,native,revokeAt};
  }
  async function refresh(){
   if(d.hidden)return;
   const p=selected();
   if(lastProfile!==p)invalidate();
   if(!permitted(auth(),p)){invalidate();return}
   if(busy){rerun=true;return}
   busy=true;const ticket=++generation;
   const stamp=Date.now(),needHealth=stamp-lastHealthFetch>2*MIN;
   try{
    const [g,h]=await Promise.all([
     fetchGps(p),needHealth?fetchHealth(p,stamp):Promise.resolve(null)
    ]);
    if(ticket!==generation||selected()!==p||d.hidden||!permitted(auth(),p))return;
    cachedGPS=g;
    if(needHealth&&h){cachedSleep=h.sleep;cachedNutrition=h.nutrition;lastHealthFetch=stamp}
    const n=nutritionBalance(p,cachedNutrition,readEnergy(p),Date.now());
    show({gps:gpsState(g.browser,g.native,p,Date.now(),g.revokeAt),
     sleep:cachedSleep,nutrition:n});
    updatedAt=Date.now();
   }catch(_){
    if(ticket===generation)show({gps:{state:'unknown',text:'Nincs jel'},
     sleep:cachedSleep,nutrition:nutritionBalance(p,cachedNutrition,readEnergy(p))});
   }finally{
    busy=false;
    if(rerun){rerun=false;w.setTimeout?.(refresh,0)}
   }
  }
  // Preserve the old battery reader. Its already initialized nodes now live
  // in the first card; no additional battery poll, no left-hand duplicate.
  const profileButton=d.getElementById('guardianProfileSwitch');
  profileButton?.addEventListener('click',()=>w.setTimeout?.(()=>{invalidate();refresh()},0));
  w.addEventListener?.('storage',e=>{if(e.key==='hh-profile'){invalidate();refresh()}});
  w.addEventListener?.('hh-guardian-auth-changed',()=>{invalidate();refresh()});
  d.addEventListener?.('visibilitychange',()=>{if(d.hidden){invalidate()}else refresh()});
  w.addEventListener?.('pageshow',refresh);
  w.setInterval?.(refresh,30000);
  close();show(null);refresh();
  return {refresh,close,get value(){return {profile:lastProfile,updatedAt}}};
 }
 let controller=null;
 function start(){if(!controller)controller=init();return controller}
 if(w?.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',start);
  else start();
 }
 return {profileKey,validSessions,nightCandidate,latestNight,sleepIndex,nutritionBalance,
  healthState,gpsState,permitted,start,version:'845'};
});
