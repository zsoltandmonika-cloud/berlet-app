/* HealthHub v534: SELF-CONTAINED, synthetic-only Digital Wellbeing test bench.
 * No real data, Android, Dropbox, storage, credentials or network operations.
 * Injected UTC time -> same hour eligibility rule as Android CloudSync.kt.
 * Result is passed through the REAL web vault validate()/summary().
 */
(function(root){
'use strict';
const HOUR=3_600_000,MINUTE=60_000,DAY=86_400_000;
const BASE=Date.parse('2026-10-14T22:00:00Z'); // 2026-10-15 00:00 Budapest
const LOCAL_CONSENT=Date.parse('2026-10-14T19:19:00Z'); // 21:19 Budapest
const CLOUD_CONSENT=Date.parse('2026-10-14T21:05:00Z'); // 23:05 Budapest
const OLD=Date.parse('2026-10-14T20:00:00Z'); // 22:00 Budapest
const FIRST=BASE;
const PRE_IDS=['com.example.mail','com.example.chat','com.example.maps','com.example.browser','com.example.video','com.example.camera'];
const AFTER_IDS=['com.example.mail','com.example.browser'];
function row(hourStartMs,packageName,observedForegroundMs){
 return {hourStartMs,packageName,observedForegroundMs,sessionFragments:1};
}
const rawRows=[
 ...PRE_IDS.map(x=>row(OLD,x,300_000)),
 ...AFTER_IDS.map(x=>row(FIRST,x,600_000))
];
function ceilUtcHour(ms){return Math.floor((ms+HOUR-1)/HOUR)*HOUR}
function simulate(options,api){
 if(!api||typeof api.validate!=='function'||typeof api.summary!=='function')throw Error('Validator unavailable');
 const minutes=Number(options.minutes);
 if(!Number.isInteger(minutes)||minutes < -120||minutes>180)throw Error('Synthetic clock outside test range');
 const mode=options.mode||'normal';
 if(!['normal','missing-coarse','unshared','invalid-hour'].includes(mode))throw Error('Unknown test fixture');
 const now=BASE+minutes*MINUTE;
 const localConsent=LOCAL_CONSENT,cloudConsent=mode==='unshared'?null:CLOUD_CONSENT;
 const firstAllowed=cloudConsent ? Math.max(now-30*DAY,ceilUtcHour(Math.max(localConsent,cloudConsent))) : null;
 const closedEnd=Math.floor(now/HOUR)*HOUR;
 const local=rawRows.filter(x=>x.hourStartMs+HOUR<=now);
 const coarse=[
  {hourStartMs:OLD,observedForegroundMs:1_800_000,chatGptForegroundMs:0,sessionFragments:6},
  {hourStartMs:FIRST,observedForegroundMs:1_200_000,chatGptForegroundMs:0,sessionFragments:2}
 ].filter(x=>x.hourStartMs<closedEnd && (mode!=='missing-coarse'||x.hourStartMs!==FIRST));
 const eligible=cloudConsent ? local.filter(x=>x.hourStartMs>=firstAllowed):[];
 const coarseKeys=new Set(coarse.map(x=>x.hourStartMs));
 const published=eligible.filter(x=>coarseKeys.has(x.hourStartMs)).map(x=>({...x}));
 const faults=[];
 if(mode==='invalid-hour'&&published.length)published[0].observedForegroundMs=HOUR+1;
 const byHour=new Map();
 for(const item of published){
  const ms=(byHour.get(item.hourStartMs)||0)+item.observedForegroundMs;
  byHour.set(item.hourStartMs,ms);
  if(ms>HOUR){faults.push('A bizonyított használat túllépi az egyórás plafont; a feltöltés tiltva.');break;}
 }
 let valid=null,daySummary=null;
 if(!faults.length){
  const snapshot={
   schema:api.SCHEMA,source:api.SOURCE,profileKey:'monika',
   retentionDays:30,missingIsUnknown:true,shared:true,
   appDetailShared:cloudConsent!==null,appHours:published,
   hours:coarse,collectedAtMs:now
  };
  try{
   valid=api.validate(snapshot,'monika',now);
   daySummary=api.summary(valid,1,now);
  }catch(error){faults.push(String(error.message||error));}
 }
 const result={
  now,mode,closedEnd,firstAllowed,localRows:local.length,
  eligibleRows:eligible.length,publishedRows:faults.length?0:published.length,
  coarseRows:coarse.length,passed:faults.length===0,
  error:faults[0]||'',topApps:daySummary?daySummary.topApps:[],
  summarySource:'Digital Wellbeing éles webes validátor és összesítő',
  validation:valid?'PASS':'BLOCKED'
 };
 return Object.freeze(result);
}
const api=Object.freeze({simulate,BASE,LOCAL_CONSENT,CLOUD_CONSENT,OLD,FIRST,ceilUtcHour});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.HH_DIGITAL_TIME_MACHINE_V534=api;
function init(){
 const clock=document.getElementById('hhTestMinute');
 if(!clock)return;
 const cloud=document.getElementById('hhFixture'),note=document.getElementById('hhTestNote');
 const real=root.HH_DW_VAULT_V507;
 const formatter=new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 const label=ms=>ms==null?'Nincs hozzájárulás':formatter.format(new Date(ms));
 function update(){
  try{
   const r=simulate({minutes:Number(clock.value),mode:cloud.value},real);
   const values={
    hhTestClock:label(r.now),
    hhTestFirst:r.firstAllowed===null?'Nem engedélyezett':label(r.firstAllowed),
    hhTestLocal:String(r.localRows),
    hhTestEligible:String(r.eligibleRows),
    hhTestCloud:String(r.publishedRows),
    hhTestCoarse:String(r.coarseRows)
   };
   for(const [id,v] of Object.entries(values))document.getElementById(id).textContent=v;
   note.className=r.passed?'ok':'blocked';
   let status='A szintetikus feltöltési és webes ellenőrzés sikeres.';
   if(r.mode==='unshared')status='A részletes megosztás KI: nincs jogosult alkalmazássor. Az összesített mérések külön kezelhetők.';
   else if(r.error)status='Elutasítva: '+r.error;
   else if(r.eligibleRows===0)status='Az engedélyezett teljes órasáv még nem zárult le. Ez jogos 0, nem Dropbox-hiba.';
   else if(r.publishedRows===0)status='Van jogosult app-adat, de nincs megfelelő összesített órasáv. Ezt már külön ki kell vizsgálni.';
   else status='Az érvényes alkalmazássorok átjutnak a szűrésen. Az éles webes validátor és napi összesítés elfogadta őket.';
   note.textContent=status;
   document.getElementById('hhTestValid').textContent=r.validation;
   document.getElementById('hhTestApps').textContent=r.topApps.map(x=>x[0]+' · '+Math.round(x[1]/MINUTE)+' perc').join('  |  ')||'A teszt szerint nincs részletes napi megjeleníthető adat.';
  }catch(error){note.textContent='Teszthiba: '+String(error.message||error);note.className='blocked'}
 }
 for(const b of document.querySelectorAll('[data-clock-offset]'))b.addEventListener('click',()=>{clock.value=b.dataset.clockOffset;update()});
 clock.addEventListener('input',update);cloud.addEventListener('change',update);
 update();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
}
})(typeof window==='undefined'?{}:window);
