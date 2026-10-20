/* HealthHub Nutrition Intelligence v626 · live private family diary
 * Private family food log. Dropbox/App Folder is the canonical sync target;
 * localStorage is only the offline browser cache. No personal data in GitHub.
 * Uses conditional Dropbox revisions and record IDs to avoid blind overwrites.
 */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const SCHEMA='healthhub.nutrition/1', APP_KEY='t68rmhh5f1l8d85';
const LS='hh-nutrition-PREVIEW-v592-'; // Retained for lossless migration of existing on-device Nutrition entries.
const metrics=['kcal','protein','carbs','fat','fiber','vitc','b6','calcium','magnesium','potassium','omega3'];
const foods=[
 {id:'banana',name:'Banán',kind:'food',category:'Gyümölcs',icon:'🍌',piece:120,per:{kcal:89,protein:1.1,carbs:22.8,fat:.3,fiber:2.6,vitc:8.7,b6:.367,magnesium:27,potassium:358,calcium:5}},
 {id:'apple',name:'Alma',kind:'food',category:'Gyümölcs',icon:'🍎',piece:160,per:{kcal:52,protein:.3,carbs:13.8,fat:.2,fiber:2.4,vitc:4.6,calcium:6,magnesium:5,potassium:107}},
 {id:'orange',name:'Narancs',kind:'food',category:'Gyümölcs',icon:'🍊',piece:140,per:{kcal:47,protein:.9,carbs:11.8,fat:.1,fiber:2.4,vitc:53.2,calcium:40,magnesium:10,potassium:181}},
 {id:'egg',name:'Főtt tojás',kind:'food',category:'Hús és tojás',icon:'🥚',piece:50,per:{kcal:155,protein:12.6,carbs:1.1,fat:10.6,fiber:0,calcium:50,magnesium:10,potassium:126}},
 {id:'chicken',name:'Csirkemell, sült',kind:'food',category:'Hús és tojás',icon:'🍗',per:{kcal:165,protein:31,carbs:0,fat:3.6,fiber:0,calcium:15,magnesium:29,potassium:256}},
 {id:'salmon',name:'Lazac, sült',kind:'food',category:'Hús és tojás',icon:'🐟',per:{kcal:206,protein:22.1,carbs:0,fat:12.4,fiber:0,calcium:9,magnesium:30,potassium:384,omega3:2150}},
 {id:'bread',name:'Teljes kiőrlésű kenyér',kind:'food',category:'Gabonafélék',icon:'🍞',piece:40,per:{kcal:247,protein:13,carbs:41,fat:4.2,fiber:7,calcium:107,magnesium:82,potassium:230}},
 {id:'oats',name:'Zabpehely',kind:'food',category:'Gabonafélék',icon:'🥣',per:{kcal:389,protein:16.9,carbs:66.3,fat:6.9,fiber:10.6,calcium:54,magnesium:177,potassium:429}},
 {id:'carrot',name:'Sárgarépa',kind:'food',category:'Zöldség',icon:'🥕',piece:70,per:{kcal:41,protein:.9,carbs:9.6,fat:.2,fiber:2.8,vitc:5.9,calcium:33,magnesium:12,potassium:320}},
 {id:'tomato',name:'Paradicsom',kind:'food',category:'Zöldség',icon:'🍅',piece:120,per:{kcal:18,protein:.9,carbs:3.9,fat:.2,fiber:1.2,vitc:13.7,calcium:10,magnesium:11,potassium:237}},
 {id:'cucumber',name:'Uborka',kind:'food',category:'Zöldség',icon:'🥒',piece:150,per:{kcal:15,protein:.7,carbs:3.6,fat:.1,fiber:.5,vitc:2.8,calcium:16,magnesium:13,potassium:147}},
 {id:'yoghurt',name:'Natúr joghurt',kind:'food',category:'Tejtermék',icon:'🥛',per:{kcal:63,protein:5.3,carbs:7,fat:1.6,calcium:183,magnesium:17,potassium:234}},
 {id:'milk15',name:'Tej, 1,5%',kind:'drink',category:'Italok',icon:'🥛',per:{kcal:46,protein:3.4,carbs:4.8,fat:1.5,calcium:120,magnesium:11,potassium:150}},
 {id:'milk01',name:'Tej, 0,1%',kind:'drink',category:'Italok',icon:'🥛',per:{kcal:35,protein:3.4,carbs:5,fat:.1,calcium:120,magnesium:11,potassium:150}},
 {id:'milklactose',name:'Laktózmentes tej, 1,5%',kind:'drink',category:'Italok',icon:'🥛',per:{kcal:46,protein:3.4,carbs:4.8,fat:1.5,calcium:120,magnesium:11,potassium:150}},
 {id:'water',name:'Víz',kind:'drink',category:'Italok',icon:'💧',per:{kcal:0,protein:0,carbs:0,fat:0}},
 {id:'coffee',name:'Feketekávé',kind:'drink',category:'Italok',icon:'☕',per:{kcal:1,protein:.1,carbs:0,fat:0}},
 {id:'juice',name:'100%-os narancslé',kind:'drink',category:'Italok',icon:'🍊',per:{kcal:45,protein:.7,carbs:10.4,fat:.2,vitc:50,potassium:200}},
 {id:'tea',name:'Tea, cukor nélkül',kind:'drink',category:'Italok',icon:'🍵',per:{kcal:1,protein:0,carbs:0,fat:0}},
 {id:'ladyfinger',name:'Babapiskóta',kind:'food',category:'Édesség',icon:'🍪',piece:7,per:{kcal:390,protein:8,carbs:75,fat:5}},
 {id:'sugar',name:'Kockacukor',kind:'food',category:'Édesség',icon:'🧊',piece:4,per:{kcal:400,protein:0,carbs:100,fat:0}},
 {id:'cin',name:'Fahéjas cukor',kind:'food',category:'Édesség',icon:'✨',per:{kcal:395,protein:0,carbs:98,fat:0}}
];
const ENTRIES=['Reggeli','Tízórai','Ebéd','Uzsonna','Vacsora','Egyéb'];
const MEAL_ICONS=['☕','🍎','🍽️','🍪','🌙','➕'];
const normalizeMeal=meal=>ENTRIES.includes(meal)?meal:(meal==='Egyéb / Brunch'?'Egyéb':null);
let entryMealManuallyChosen=false;
const DOM=['milkMl','milkType','sugarCubes','cubeGrams','cinnamonGrams','ladyCount','ladyGrams','presetMeal','presetTime'];
let active='', currentFood='', currentPreset='morning', currentEdit='', bodyKind='', activeType='food';
let audio=null, syncTimers={}, syncRunning={}, lastCloud={}, onload=0, pendingSound=false;
const zero=()=>Object.fromEntries(metrics.map(k=>[k,0]));
const fmt=(x,max=1)=>Number(x||0).toLocaleString('hu-HU',{maximumFractionDigits:max});
const safeText=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,min,max)=>{const x=Number(v);return Number.isFinite(x)&&x>=min&&x<=max?x:null;};
const isDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const pad=n=>String(n).padStart(2,'0');
const localDate=(d=new Date())=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');
const localTime=(d=new Date())=>pad(d.getHours())+':'+pad(d.getMinutes());
const uid=()=>root.crypto&&root.crypto.randomUUID?root.crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);
const pkey=()=>{const main=root.localStorage.getItem('hh-profile');const saved=root.localStorage.getItem('hh-nutrition-PREVIEW-profile');return(main==='m'||(main!=='z'&&saved==='m'))?'monika':'zsolt';};
const profileName=k=>k==='monika'?'Mónika':'Zsolt';
const clone=x=>JSON.parse(JSON.stringify(x));
function stamp(){return new Date().toISOString();}
function makeDefaultPreset(profile,afternoon){
 return {milkMl:150,milkType:profile==='monika'?'milklactose':(afternoon?'milk01':'milk15'),sugarCubes:afternoon?3:(profile==='monika'?1:2),cubeGrams:4,cinnamonGrams:afternoon?2:0,ladyCount:afternoon?4:0,ladyGrams:7,meal:afternoon?'Uzsonna':'Reggeli',updatedAt:'1970-01-01T00:00:00Z'};
}
function fresh(profile){
 return {schemaVersion:SCHEMA,profileKey:profile,updatedAt:stamp(),entries:[],body:[],catalog:[],units:[],quickRecipes:[],quickRecipeOrder:{ids:[],updatedAt:'1970-01-01T00:00:00Z'},hydrationCounterReset:null,goal:{kcal:null,tolerance:150,updatedAt:'1970-01-01T00:00:00Z'},presets:{morning:makeDefaultPreset(profile,false),afternoon:makeDefaultPreset(profile,true)}};
}
function normalize(x,profile){
 let d=fresh(profile);
 if(!x||x.schemaVersion!==SCHEMA||x.profileKey!==profile)return d;
 d.updatedAt=x.updatedAt||d.updatedAt;
 // Persist the latest visual hydration reset with the profile's Dropbox document.
 const hydrationReset=x.hydrationCounterReset;
 if(hydrationReset&&isDay(hydrationReset.date)&&Number.isFinite(Number(hydrationReset.offsetMl))&&Number(hydrationReset.offsetMl)>=0&&Number(hydrationReset.offsetMl)<=1e9&&typeof hydrationReset.updatedAt==='string'&&Number.isFinite(Date.parse(hydrationReset.updatedAt))){
  d.hydrationCounterReset={date:hydrationReset.date,offsetMl:Number(hydrationReset.offsetMl),updatedAt:hydrationReset.updatedAt};
 }
 ['entries','body','catalog','units','quickRecipes'].forEach(k=>{if(Array.isArray(x[k]))d[k]=x[k].filter(v=>v&&typeof v.id==='string'&&v.id.length<150).slice(-50000);});
 if(x.quickRecipeOrder&&Array.isArray(x.quickRecipeOrder.ids)){d.quickRecipeOrder={ids:[...new Set(x.quickRecipeOrder.ids.filter(v=>typeof v==='string'&&/^quick:[a-z0-9_-]{1,80}$/i.test(v)))].slice(0,250),updatedAt:typeof x.quickRecipeOrder.updatedAt==='string'?x.quickRecipeOrder.updatedAt:'1970-01-01T00:00:00Z'};}
 if(x.goal&&typeof x.goal==='object'){const kcal=x.goal.kcal==null?null:num(x.goal.kcal,800,6000);d.goal={kcal,tolerance:num(x.goal.tolerance,0,1000)??150,updatedAt:x.goal.updatedAt||d.goal.updatedAt};}
 for(const key of ['morning','afternoon'])if(x.presets&&x.presets[key]){
   const q=x.presets[key];const base=d.presets[key];d.presets[key]={...base,...q,updatedAt:q.updatedAt||base.updatedAt};
 }
 return d;
}
function read(profile){try{return normalize(JSON.parse(localStorage.getItem(LS+profile)||'null'),profile)}catch(_){return fresh(profile)}}
function write(profile,doc){
 doc.updatedAt=stamp();localStorage.setItem(LS+profile,JSON.stringify(doc));
 if(profile===active)render();
 queueSync(profile);
}
function update(fn){const k=active,d=read(k);fn(d);write(k,d);}
function mergeRows(a,b){
 const out=new Map();
 [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])].forEach(row=>{
  if(!row||!row.id)return;let old=out.get(row.id);
  if(!old||String(row.updatedAt||row.createdAt||'')>=String(old.updatedAt||old.createdAt||''))out.set(row.id,row);
 });return Array.from(out.values());
}
function merge(local,remote,profile){
 let l=normalize(local,profile),r=normalize(remote,profile),o=normalize(l,profile);
 for(const key of ['entries','body','catalog','units','quickRecipes'])o[key]=mergeRows(l[key],r[key]);
 o.quickRecipeOrder=String(r.quickRecipeOrder.updatedAt||'')>String(l.quickRecipeOrder.updatedAt||'')?r.quickRecipeOrder:l.quickRecipeOrder;
 o.goal=String(r.goal.updatedAt||'')>String(l.goal.updatedAt||'')?r.goal:l.goal;
 for(const key of ['morning','afternoon'])o.presets[key]=String(r.presets[key].updatedAt||'')>String(l.presets[key].updatedAt||'')?r.presets[key]:l.presets[key];
 // The most recently committed profile-scoped visual reset wins, without touching entries.
 const leftReset=l.hydrationCounterReset,rightReset=r.hydrationCounterReset;
 o.hydrationCounterReset=!leftReset?rightReset:!rightReset?leftReset:
   (String(rightReset.updatedAt)>String(leftReset.updatedAt)?rightReset:leftReset);
 o.updatedAt=String(r.updatedAt||'')>String(l.updatedAt||'')?r.updatedAt:l.updatedAt;
 return o;
}
function catalog(){const d=read(active);return [...foods,...d.catalog.filter(x=>x&&!x.deleted)].sort((a,b)=>(a.category||'').localeCompare(b.category||'','hu')||a.name.localeCompare(b.name,'hu'));}
function foodBy(id){return catalog().find(f=>f.id===id)||null;}
function calc(per,grams){const out={};for(const k of metrics){out[k]=per[k]==null?null:Number((Number(per[k])*grams/100).toFixed(3));}return out;}
function sum(items){
 const out=Object.fromEntries(metrics.map(k=>[k,null]));
 for(const item of items)for(const k of metrics)if(item[k]!=null){out[k]=(out[k]??0)+Number(item[k]);}
 return out;
}
function currentDay(){return $('logDate').value||localDate();}
function setProfile(next,fromUi){
 active=next;document.documentElement.dataset.profile=next;
 root.localStorage.setItem('hh-nutrition-PREVIEW-profile',next==='monika'?'m':'z');
 if(fromUi){
  root.localStorage.setItem('hh-profile',next==='monika'?'m':'z');
  try{root.dispatchEvent(new CustomEvent('healthhub:profile-changed',{detail:{profile:next,source:'nutrition'}}))}catch(_){}
 }
 $('profileBtn').textContent=profileName(next)+' ⇄';
 if($('morningLabel'))$('morningLabel').textContent=fmt(read(next).presets.morning.sugarCubes,0)+' kockacukor · egyedi recept';
 render();
 refreshActivity(next);syncProfile(next).catch(()=>{});
}

const JAR_KEY='hh-nutrition-jar-reset-v1-';
const JAR_LOG='hh-nutrition-jar-events-v1-';
function jarEvents(profile){try{return JSON.parse(localStorage.getItem(JAR_LOG+profile)||'[]')}catch(_){return []}}
function logJar(profile,date,kind,ml){
 const all=jarEvents(profile);all.push({date,time:new Date().toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}),kind,ml});
 localStorage.setItem(JAR_LOG+profile,JSON.stringify(all.slice(-500)));
}
function dailyJarOffset(profile,date){try{const x=JSON.parse(localStorage.getItem(JAR_KEY+profile+'-'+date)||'null');return Math.max(0,Number(x&&x.offset)||0)}catch(_){return 0}}
function resetHydrationCounter(){
 checkJarMidnight();
 const date=localDate();
 if(currentDay()!==date)return; // Historical diary totals cannot be reset by tapping.
 const profile=active;
 update(d=>{
  const total=d.entries.filter(e=>!e.deleted&&e.date===date&&Number.isFinite(e.volumeMl))
    .reduce((sum,e)=>sum+e.volumeMl,0);
  d.hydrationCounterReset={date,offsetMl:Math.max(0,total),updatedAt:stamp()};
 });
 tone('water');
}
function resetJar(){
 // The button intentionally empties the pitcher without deleting food/drink records.
 // Play an unobtrusive water-pour cue on the actual user click (respecting sound settings).
 tone('water');
 const date=currentDay(),raw=read(active).entries.filter(e=>!e.deleted&&e.date===date&&Number.isFinite(e.volumeMl)).reduce((sum,e)=>sum+e.volumeMl,0);
 localStorage.setItem(JAR_KEY+active+'-'+date,JSON.stringify({offset:raw,updatedAt:stamp()}));
 logJar(active,date,'Kézi Ürítés',raw);render();
}
let jarCalendarDay=null;
function checkJarMidnight(){
 const today=localDate();
 if(jarCalendarDay&&jarCalendarDay!==today){
  for(const profile of ['zsolt','monika'])logJar(profile,today,'Automatikus napi nullázás',0);
  jarCalendarDay=today;$('logDate').value=today;render();
 }else if(!jarCalendarDay){jarCalendarDay=today}
}

// Prefer an exact local-midnight rollover. The existing 30s and visibility
// checks remain fallbacks for backgrounded/throttled Android browsers.
function scheduleMidnightRollover(){
 const now=new Date(),next=new Date(now);
 next.setHours(24,0,0,0);
 root.setTimeout(()=>{
  checkJarMidnight();
  scheduleMidnightRollover();
 },Math.max(1000,next.getTime()-now.getTime()+120));
}
function render(){
 const d=read(active),date=currentDay();
 $('todayLabel').textContent=date===localDate()?'Mai nap':date;
 if($('morningLabel'))$('morningLabel').textContent=fmt(d.presets.morning.sugarCubes,0)+' kockacukor · egyedi recept';
 const entries=d.entries.filter(e=>!e.deleted&&e.date===date);
 const vals=sum(entries.map(x=>x.nutrients||{})),kcal=vals.kcal??0,goal=d.goal.kcal;
 $('ringKcal').textContent=fmt(kcal,0);
 // Burned energy must be a real complete-day or day-to-date record from the correct profile.
 // Never infer it from steps, activity calories alone, or fake a zero.
 const energyRecord=(()=>{try{
  const live=window.hhNutritionDailyEnergy;
  const saved=JSON.parse(localStorage.getItem('hh-nutrition-total-energy-'+active)||'null');
  const valid=e=>e&&e.profile===active&&e.date===date&&e.kind==='total_burned_kcal'&&Number.isFinite(Number(e.kcal))&&Number(e.kcal)>0&&
    typeof e.updatedAt==='string'&&Number.isFinite(Date.parse(e.updatedAt))&&
    Date.now()-Date.parse(e.updatedAt)>=0&&Date.now()-Date.parse(e.updatedAt)<6*3600000;
  return valid(live)?live:(valid(saved)?saved:null);
 }catch(_){return null}})();
 const burnt=energyRecord?Number(energyRecord.kcal):null;
 // The visible integer and its colour must use the same rounded value.
 // A zero balance is amber; an unavailable Activity record stays neutral grey.
 const netKcal=burnt==null?null:Math.round(kcal-burnt);
 const netStatus=netKcal==null?'unknown':netKcal<0?'negative':netKcal>0?'positive':'zero';
 $('hhBurntKcal').textContent=burnt==null?'—':fmt(burnt,0);
 $('hhNetKcal').textContent=netKcal==null?'—':(netKcal<0?'−':netKcal>0?'+':'')+fmt(Math.abs(netKcal),0);
 $('hhEnergyStatus').textContent=burnt==null?'Teljes napi energia: még nem kapcsolódott':'Napi teljes energiafelhasználás · '+(energyRecord.source||'szinkronizált adat');
 const netEl=$('hhNetRing');
 netEl.dataset.netStatus=netStatus;
 $('balanceCard').dataset.netStatus=netStatus;
 netEl.classList.toggle('pending',netKcal==null);
 netEl.setAttribute('aria-label',netKcal==null?'Napi egyenleg: nincs energiafelhasználási adat':'Napi egyenleg: '+(netKcal<0?'mínusz ':netKcal>0?'plusz ':'')+fmt(Math.abs(netKcal),0)+' kilokalória');

 $('hhMacroProtein').textContent=vals.protein==null?'—':fmt(vals.protein,0)+' g';
 $('hhMacroCarbs').textContent=vals.carbs==null?'—':fmt(vals.carbs,0)+' g';
 $('hhMacroFat').textContent=vals.fat==null?'—':fmt(vals.fat,0)+' g';
 // Macro bars express each known macro's proportion of caloric macronutrients;
 // never interpret missing nutrition as zero.
 const macroEnergy=[vals.protein,vals.carbs,vals.fat],energySum=macroEnergy.every(v=>Number.isFinite(v))?macroEnergy[0]*4+macroEnergy[1]*4+macroEnergy[2]*9:null;
 document.querySelectorAll('.hh-body-macros span').forEach((el,i)=>{
  const kcalEnergy=energySum>0?macroEnergy[i]*(i===2?9:4):0;
  el.style.setProperty('--macro-pct',energySum>0?Math.max(0,Math.min(100,100*kcalEnergy/energySum)).toFixed(1)+'%':'0%');
 });

 $('ringCaption').textContent=goal?' / '+fmt(goal,0)+' kcal':'mai bevitel';
 $('balanceRing').style.setProperty('--pct',(goal?Math.max(0,Math.min(100,kcal/goal*100)):0)+'%');
 $('balanceLabel').textContent='NAPI KALÓRIA ÖSSZEFOGLALÓ';
 const b=$('balanceCard'),t=$('balanceValue');b.classList.remove('good','warn','bad');t.classList.remove('good','warn','bad');
 if(goal!=null){
  const remain=goal-kcal,lo=goal-d.goal.tolerance,hi=goal+d.goal.tolerance;
  const isToday=date===localDate();const ongoingDay=isToday&&new Date().getHours()<20;
  const color=kcal>hi?'bad':ongoingDay?'good':kcal>=lo?'good':'warn';
  b.classList.add(color);t.classList.add(color);t.textContent=(remain>=0?'':'−')+fmt(Math.abs(remain),0)+' kcal';
  $('balanceText').textContent=burnt==null?'Az egyenleghez szinkronizált teljes energiafelhasználás szükséges.':'Bevitel − teljes elégetett kalória. Mínusz: zöld · plusz: piros · nulla: amber.';
  $('progress').style.width=Math.min(100,100*kcal/goal)+'%';
 }else{
  t.textContent=fmt(kcal,0)+' kcal';$('balanceText').textContent=(burnt==null?'Állítsd be a napi kalóriacélt; a bevitel addig is naplózható.':'Napi egyenleg: bevitel − elégetett energia. A napi cél külön beállítható.');$('progress').style.width='0%';
 }
 for(const k of ['protein','carbs','fat','fiber','vitc','b6','calcium','magnesium','potassium','omega3']){
   $(k).textContent=vals[k]==null?'—':fmt(vals[k],k==='b6'?2:1);
 }
 // Keep the true day total separate from the current pitcher fill.
 // Empty Jar is a visual pitcher reset; drink entries remain in the journal.
 let fluid=0, fluidFound=false;
 for(const e of entries)if(Number.isFinite(e.volumeMl)){fluid+=e.volumeMl;fluidFound=true}
 const fluidTotal=Math.max(0,fluid);
 // The pitcher represents consumption since the most recent visual reset.
 // Tapping the big number and "Ürítés" reset independent displays, but
 // either action must bring the water-level bar back to zero.
 const jarOffset=dailyJarOffset(active,date);
 $('fluids').textContent=fluidFound?fmt(fluidTotal,0):'—';
 const waterGoal=Number(localStorage.getItem('hh-nutrition-hydration-goal-'+active));
 const validWaterGoal=Number.isFinite(waterGoal)&&waterGoal>=250&&waterGoal<=6000;
 $('hhWaterGoal').value=validWaterGoal?String(waterGoal):'';
 // The displayed counter may be restarted; the diary/Dropbox keeps the full daily total.
 const reset=d.hydrationCounterReset;
 const counterOffset=date===localDate()&&reset&&reset.date===date?Math.max(0,Number(reset.offsetMl)||0):0;
 const displayTotal=Math.max(0,fluidTotal-counterOffset);
 const pitcherCurrent=Math.max(0,fluidTotal-Math.max(jarOffset,counterOffset));
 const amountButton=$('hhWaterAmount');
 amountButton.textContent=fmt(displayTotal,0)+' ml';
 amountButton.disabled=date!==localDate();
 amountButton.title=date===localDate()?'Koppints a számláló nullázásához. A napló megmarad.':'Korábbi nap: csak olvasható';
 amountButton.setAttribute('aria-label',date===localDate()?'Aktuális '+fmt(displayTotal,0)+' milliliter. Koppints a számláló visszaállításához. A naplózott italok megmaradnak.':'Korábbi napi folyadék összesen '+fmt(fluidTotal,0)+' milliliter.');
 $('hhWaterTarget').textContent=validWaterGoal?'Személyes napi cél: '+fmt(waterGoal,0)+' ml':'Személyes napi cél: még nincs beállítva';
 renderHydrationStatus({fluidTotal:displayTotal,fluidFound,waterGoal,validWaterGoal,date});
 const waterPct=validWaterGoal?Math.max(0,Math.round(pitcherCurrent/waterGoal*100)):null;
 const fillHeight=waterPct==null?0:Math.min(100,waterPct)*0.70;
 $('hhWaterLevel').style.height=fillHeight+'%';
 const waterGauge=$('hhWaterGaugeFill');
 if(waterGauge){
  const fraction=waterPct==null?0:Math.min(100,waterPct)/100;
  waterGauge.style.transform='scaleY('+fraction+')';
  waterGauge.parentElement.setAttribute('aria-label',waterPct==null?'Kancsó vízszintje: nincs beállított cél':'Kancsó vízszintje: '+waterPct+'%, az utolsó ürítés óta '+fmt(pitcherCurrent,0)+' ml');
 }
 $('hhWaterLevel').dataset.empty=fillHeight===0?'true':'false';
 $('hhWaterLevel').parentElement.style.setProperty('--hh-fluid-fill',fillHeight+'%');
 $('hhWaterPct').textContent=waterPct==null?'—':waterPct+'%';

 const log=$('log');
 const openedMeals=new Set(Array.from(log.querySelectorAll('details.hh-meal-diary-group[open]')).map(el=>el.dataset.meal));
 log.replaceChildren();
 // Diary hydration summary is derived from dated entries, never a second or
 // duplicated stored intake record. Thus edits, deletes, Dropbox merge and
 // historical date selection all update the correct profile/day total.
 const dayWater=document.createElement('div');
 dayWater.className='entry hh-day-water-summary';
 dayWater.setAttribute('role','note');
 const dayWaterCopy=document.createElement('span');
 dayWaterCopy.textContent='💧 '+(date===localDate()?'Mai':'Napi')+' naplózott folyadék · '+date;
 const dayWaterTotal=document.createElement('b');
 dayWaterTotal.textContent=fmt(fluidTotal,0)+' ml';
 dayWater.append(dayWaterCopy,dayWaterTotal);log.append(dayWater);
 for(const e of jarEvents(active).filter(e=>e.date===date)){const el=document.createElement('div');el.className='entry';el.textContent='↺ '+e.time+' · '+e.kind+' · napló megőrizve';log.append(el)}
 if(!entries.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Még nincs bevitel erre a napra. A reggeli cappuccino egy jó kezdet. ☕';log.append(empty);}
 const mealGrid=document.createElement('div');mealGrid.className='hh-meal-diary-grid';
 mealGrid.setAttribute('aria-label','Étkezésenkénti napi bontás');
 const sortedEntries=[...entries].sort((a,b)=>String(b.time||'').localeCompare(String(a.time||'')));
 const firstFilled=ENTRIES.find(m=>sortedEntries.some(e=>(normalizeMeal(e.meal)||'Egyéb')===m));
 ENTRIES.forEach((meal,index)=>{
  const matching=sortedEntries.filter(e=>(normalizeMeal(e.meal)||'Egyéb')===meal);
  const section=document.createElement('details');
  section.className='hh-meal-diary-group';section.dataset.meal=meal;
  section.open=openedMeals.has(meal)||(!openedMeals.size&&meal===firstFilled);
  const summary=document.createElement('summary');
  const label=document.createElement('strong');label.textContent=MEAL_ICONS[index]+' '+meal;
  const number=document.createElement('b');
  const values=matching.map(e=>e.nutrients?.kcal).filter(v=>v!=null&&Number.isFinite(Number(v)));
  number.textContent=values.length?fmt(values.reduce((a,b)=>a+Number(b),0),0)+' kcal':'— kcal';
  const count=document.createElement('small');count.textContent=matching.length+' bevitel';
  summary.append(label,number,count);section.append(summary);
  const body=document.createElement('div');body.className='hh-meal-diary-content';
  if(!matching.length){
   const empty=document.createElement('p');empty.className='empty';
   empty.textContent='Nincs rögzített '+meal.toLocaleLowerCase('hu-HU')+' erre a napra.';
   body.append(empty);
  }
  matching.forEach(e=>{

  const line=document.createElement('div');line.className='entry';
  const left=document.createElement('div'),right=document.createElement('aside');
  const name=document.createElement('strong');name.textContent=(e.icon||'🍽️')+' '+e.name;
  const smaller=document.createElement('small');smaller.textContent=e.time+' · '+e.meal+(e.quantityText?' · '+e.quantityText:'')+(e.source==='estimated'?' · becsült':'');
  left.append(name,smaller);
  const c=document.createElement('b');c.textContent=e.nutrients?.kcal==null?'— kcal':fmt(e.nutrients.kcal,0)+' kcal';
  const edit=document.createElement('button');edit.type='button';edit.className='mini';edit.textContent='Szerk.';edit.addEventListener('click',()=>editEntry(e));
  const del=document.createElement('button');del.type='button';del.className='mini';del.textContent='×';del.title='Bevitel törlése';del.addEventListener('click',()=>{if(confirm('Törlöd a bejegyzést?'))update(d=>{const row=d.entries.find(x=>x.id===e.id);if(row){row.deleted=true;row.updatedAt=stamp();}})});
  const actions=document.createElement('div');actions.className='controls';actions.style.justifyContent='flex-end';actions.append(edit,del);right.append(c,actions);line.append(left,right);body.append(line);
  });
  section.append(body);mealGrid.append(section);
 });
 log.append(mealGrid);
 // HH Buddy shows the net energy sign, not a medical verdict.
 // Calorie deficit/surplus alone cannot determine whether a day is healthy.
 const moodBox=$('hhBuddyMood');
 if(moodBox){
  const meta={
   negative:{face:'happy',label:'Mínuszban vagyunk',desc:'A becsült energiafelhasználás meghaladja a rögzített bevitelt.'},
   zero:{face:'regular',label:'Egyensúlyban',desc:'A megjelenített napi energiaegyenleg nulla.'},
   positive:{face:'sad',label:'Napi többlet',desc:'A rögzített bevitel meghaladja a becsült energiafelhasználást.'},
   unknown:{face:'unknown',label:'Adatokat várok',desc:'A napi teljes energiafelhasználás még nem áll rendelkezésre.'}
  }[netStatus];
  const contextText=$('balanceText').textContent;
  moodBox.dataset.face=meta.face;
  $('balanceText').textContent=meta.label;
  moodBox.title=meta.desc+' '+contextText+' A hangulatjel a kalóriaegyenleget szemlélteti, nem egészségügyi minősítés.';
  moodBox.setAttribute('aria-label','HH Buddy: '+meta.label+'. '+meta.desc);
 }
 renderBody();renderInsights();
}
/* Time-proportional hydration display: informational only, not medical guidance.
   Goal and visible totals remain specific to the active profile and diary date.
   Never celebrate implausible stress-test totals as a healthy hydration pattern. */
/* Full daily hydration goal comparison.
   Colours describe target arithmetic only, not whether the quantity is medically safe. */
function renderHydrationStatus({fluidTotal,fluidFound,waterGoal,validWaterGoal,date}){
 const panel=$('hhHydrationStatus'),planEl=$('hhHydrationPlan'),pill=$('hhHydrationPill'),note=$('hhHydrationNote');
 if(!panel||!planEl||!pill||!note)return;
 const currentDate=localDate(),isToday=date===currentDate,hasHistory=date<currentDate;
 const eyebrow=panel.querySelector('.hh-hydration-eyebrow');
 if(eyebrow)eyebrow.textContent=hasHistory?'NAPLÓZOTT · AZNAP':isToday?'AKTUÁLIS · MA':'JÖVŐBELI NAP';
 const planLabel=panel.querySelector('[data-hh-hydration-plan-label]');
 if(planLabel)planLabel.textContent='Napi terv:';
 const planned=validWaterGoal?waterGoal:null;
 planEl.textContent=planned==null?'—':fmt(planned,0)+' ml';
 let rag='unknown',state='Napi cél nincs beállítva';
 if(validWaterGoal&&date>currentDate)state='Jövőbeli nap';
 else if(validWaterGoal){
  if(fluidTotal<waterGoal){rag='bad';state='Napi cél alatt'}
  else if(fluidTotal===waterGoal){rag='warn';state='Napi cél pontosan teljesítve'}
  else{rag='good';state='Napi cél fölött'}
 }
 panel.dataset.rag=rag;
 pill.textContent=state;
 note.textContent='A szín csak a beállított napi célhoz viszonyít, nem egészségügyi minősítés.';
 panel.setAttribute('aria-label','Napi folyadék: '+(fluidFound?fmt(fluidTotal,0)+' ml':'nincs naplózott ital')+'. '+(planned==null?'Nincs beállított napi cél.':'Napi terv '+fmt(planned,0)+' ml.')+' '+state+'. A cél túllépése nem jelent egészségügyi ajánlást.');
}

function renderBodySummary(rows){
 const wrap=$('hhRhythmSummary728');if(!wrap)return;
 wrap.replaceChildren();
 const ragApi=root.HH_OBSERVATION_RAG_V728;
 for(const kind of ['stool','urine']){
  const row=rows.find(x=>x.kind===kind);
  const code=kind==='stool'?'BS':'AJ';
  const raw=row?(kind==='stool'?row.bristol:row.urineColor):null;
  const info=row?ragApi?.classify?.(kind,raw):null;
  const level=info?.grade;
  const item=document.createElement('span');item.className='hhRhythmSummaryBadge';
  item.setAttribute('aria-label',code+' · '+(row?'rögzítve':'nincs mai bejegyzés')+
   (level!=null?' · '+level:'')+(info?' · '+info.label:''));
  const checked=document.createElement('span');
  checked.className=row?'hhRhythmSummarySaved':'hhRhythmSummaryMissing';
  checked.textContent=row?'✓':'·';
  const title=document.createElement('b');
  title.textContent=code+' '+(level!=null?level+'/'+(kind==='stool'?'7':'8'):'—');
  const rag=document.createElement('span');rag.className='hhRhythmSummaryRag';
  rag.dataset.rag=info?.tone||'unknown';
  rag.title=row?(info?.label||'Nincs besorolás'):'Nincs mai bejegyzés';
  rag.setAttribute('aria-hidden','true');
  item.append(checked,title,rag);wrap.append(item);
 }
}
function renderBody(){
 const date=currentDay(),rows=read(active).body.filter(e=>e.date===date&&!e.deleted)
  .sort((a,b)=>b.time.localeCompare(a.time));
 const view=$('bodyLog');view.replaceChildren();view.classList.add('hhRhythmDiary');
 renderBodySummary(rows); // Always visible in BODY BALANCE summary, even when collapsed.
 if(!rows.length){view.textContent='Még nincs esemény a kiválasztott napon.';return;}
 const ragApi=root.HH_OBSERVATION_RAG_V728;
 for(const row of rows){
  const stool=row.kind==='stool',kind=stool?'stool':'urine';
  const rawGrade=stool?row.bristol:row.urineColor;
  const rag=ragApi?.classify?.(kind,rawGrade)||{tone:'unknown',label:'Besorolás nem elérhető',grade:null};
  const line=document.createElement('div');line.className='hhRhythmRow';
  const check=document.createElement('span');check.className='hhRhythmCheck';check.textContent='✓';
  check.title='Rögzített naplóbejegyzés';check.setAttribute('aria-label','Sikeresen rögzítve');
  const main=document.createElement('span');main.className='hhRhythmMain';
  const title=document.createElement('span');title.className='hhRhythmTitle';
  title.textContent=(stool?'BS · Bristol-skála':'AJ · Apple Juice')+
    (rag.grade!=null?' · '+rag.grade+'/'+(stool?'7':'8'):' · Fokozat nélkül');
  main.append(title);
  if(row.note){const note=document.createElement('span');note.className='hhRhythmNote';note.textContent=row.note;main.append(note);}
  const clock=document.createElement('time');clock.className='hhRhythmTime';clock.textContent=row.time;
  const dot=document.createElement('span');dot.className='hhRhythmDot';dot.dataset.rag=rag.tone;
  dot.title=rag.label+' · tájékoztató, nem diagnózis';
  dot.setAttribute('role','img');dot.setAttribute('aria-label',dot.title);
  const remove=document.createElement('button');remove.className='mini hhRhythmRemove';remove.type='button';
  remove.textContent='×';remove.title='Bejegyzés törlése';
  remove.addEventListener('click',()=>update(d=>{const b=d.body.find(x=>x.id===row.id);
   if(b){b.deleted=true;b.updatedAt=stamp();}
  }));
  line.append(check,main,clock,dot,remove);view.append(line);
 }
 const legend=document.createElement('div');legend.className='hhRhythmLegend';
 legend.textContent='A zöld ✓ a mentést igazolja. A RAG-szín a választott fokozat tájékoztató mintázata, nem diagnózis.';
 view.append(legend);
}

let insightDays=7;
function renderInsights(){
 const end=currentDay(),d=read(active);
 const endTs=Date.parse(end+'T12:00:00Z');
 const start=new Date(endTs-(insightDays-1)*86400000).toISOString().slice(0,10);
 const rows=d.entries.filter(e=>!e.deleted&&e.date>=start&&e.date<=end);
 const byDate=new Map();
 for(const e of rows){let list=byDate.get(e.date)||[];list.push(e);byDate.set(e.date,list);}
 const completed=[...byDate.keys()].filter(date=>byDate.get(date).length>0),n=completed.length;
 $('insightPeriod').textContent=insightDays+' nap · '+start+' – '+end+' · naplózott napok: '+n+'/'+insightDays;
 if(!n){$('insightText').textContent='Erre az időszakra még nincs rögzített étkezés. Amint kerülnek be adatok, itt megjelenik az összesítés.';return;}
 let total=0,prot=0,protDays=0;
 for(const day of completed){const nutrients=sum(byDate.get(day).map(e=>e.nutrients||{}));total+=nutrients.kcal??0;if(nutrients.protein!=null){prot+=nutrients.protein;protDays++;}}
 let message='A '+n+' naplózott napon az átlagos rögzített energiabevitel '+fmt(total/n,0)+' kcal/nap.';
 if(protDays)message+=' A fehérjebevitel átlaga '+fmt(prot/protDays,1)+' g/nap a rendelkezésre álló adatok alapján.';
 if(n<insightDays)message+=' '+(insightDays-n)+' napra nincs bevitel rögzítve, ezért a teljes időszak átlagát ebből nem lehet megbízhatóan megállapítani.';
 if(n>=5&&d.goal.kcal!=null){
  const dayTotals=completed.map(day=>sum(byDate.get(day).map(e=>e.nutrients||{})).kcal??0);
  const within=dayTotals.filter(x=>x>=d.goal.kcal-d.goal.tolerance&&x<=d.goal.kcal+d.goal.tolerance).length;
  message+=' A személyes céltartomány '+within+' naplózott napon teljesült.';
 }
 $('insightText').textContent=message;
}
function displayStatus(text,bad=false){$('syncStatus').textContent=text;$('syncStatus').style.color=bad?'#ffb0bf':'';}
function reportNutritionSync(profile,state,message){
 if(profile!==active)return;
 try{root.dispatchEvent(new CustomEvent('healthhub:nutrition-sync-state',{
  detail:{profile,state,message,at:stamp()}
 }))}catch(_){}
}

/* Dropbox is the canonical Nutrition journal. Browser cache survives offline operation.
 * Never overwrite remote blindly: download + merge + conditional revision upload.
 */
const syncPending={};
function queueSync(profile){
 syncPending[profile]=true;
 if(profile===active){
  displayStatus('◌ Nutrition mentve helyben · automatikus Dropbox-szinkron…');
  reportNutritionSync(profile,'pending','Mentve helyben · szinkronra vár');
 }
 if(syncTimers[profile])clearTimeout(syncTimers[profile]);
 syncTimers[profile]=setTimeout(()=>{
  delete syncTimers[profile];
  syncProfile(profile).catch(()=>{});
 },900);
}
async function syncProfile(profile){
 if(!['zsolt','monika'].includes(profile))return false;
 const api=window.HH_NUTRITION_CLOUD_V626;
 if(!api||!api.connected()){
  if(profile===active){
   displayStatus('○ Csak helyi mentés · Dropbox csatlakoztatása a HealthHubban');
   reportNutritionSync(profile,'local','Csak helyben · Dropbox nincs csatlakoztatva');
  }
  return false;
 }
 if(syncRunning[profile]){syncPending[profile]=true;return false;}
 if(syncTimers[profile]){clearTimeout(syncTimers[profile]);delete syncTimers[profile]}
 syncRunning[profile]=true;syncPending[profile]=false;
 if(profile===active){
  displayStatus('⟳ Nutrition Dropbox-szinkron…');
  reportNutritionSync(profile,'syncing','Feltöltés a központi Dropboxba…');
 }
 try{
  let saved=null,cloudData=null,attempt=0;
  for(;attempt<4;attempt++){
   const remote=await api.download(profile);
   cloudData=remote.data;
   const latest=read(profile);
   const combined=cloudData?merge(latest,cloudData,profile):latest;
   try{
    saved=await api.upload(profile,combined,remote.rev);
    // A felhőbe küldés közben létrejött új helyi bejegyzéseket is megőrizzük.
    const finalDoc=merge(read(profile),combined,profile);
    localStorage.setItem(LS+profile,JSON.stringify(finalDoc));
    if(JSON.stringify(finalDoc)!==JSON.stringify(combined))syncPending[profile]=true;
    if(profile===active){
     render();
     displayStatus(syncPending[profile]?'⟳ Új bejegyzések mentése folyamatban':'✓ Dropbox Nutrition · szinkronizálva');
     reportNutritionSync(profile,syncPending[profile]?'pending':'synced',syncPending[profile]?'Új mentés feltöltése folyamatban':'✓ Szinkron kész · minden eszközön elérhető');
    }
    try{window.dispatchEvent(new CustomEvent('healthhub:nutrition-updated',{
     detail:{profile:profile,updatedAt:stamp(),source:'nutrition-cloud',synced:!syncPending[profile]}
    }))}catch(_){}
    return true;
   }catch(e){
    if(e&&e.status===409&&attempt<3)continue;
    throw e;
   }
  }
  throw new Error('Több eszköz egyidejű mentése miatt a szinkron nem fejeződött be');
 }catch(error){
  if(profile===active){
   const reason=String(error&&error.message||'nem elérhető').slice(0,105);
   displayStatus('⚠ Helyi mentés megmaradt · Dropbox: '+reason,true);
   reportNutritionSync(profile,'error','⚠ Nem szinkronizált · '+reason);
  }
  return false;
 }finally{
  syncRunning[profile]=false;
  if(syncPending[profile])queueSync(profile);
 }
}
function sounds(){return localStorage.getItem('hh-nutrition-PREVIEW-sound')!=='off'}
function tone(type){
 if(!sounds())return;
 try{
  if(!audio){const C=root.AudioContext||root.webkitAudioContext;if(!C)return;audio=new C();}
  if(audio.state==='suspended')audio.resume();
  const now=audio.currentTime;
  if(type==='water'){
   // Procedural soft water pour: brief filtered splash + three small bubble notes.
   // Generated locally, with no media download or user audio data.
   const duration=.48,frameCount=Math.ceil(audio.sampleRate*duration);
   const buf=audio.createBuffer(1,frameCount,audio.sampleRate);
   const samples=buf.getChannelData(0);
   for(let i=0;i<frameCount;i++)samples[i]=Math.random()*2-1;
   const stream=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
   stream.buffer=buf;filter.type='lowpass';
   filter.frequency.setValueAtTime(2600,now);
   filter.frequency.exponentialRampToValueAtTime(600,now+.44);
   gain.gain.setValueAtTime(.0001,now);
   gain.gain.exponentialRampToValueAtTime(.022,now+.055);
   gain.gain.exponentialRampToValueAtTime(.010,now+.20);
   gain.gain.exponentialRampToValueAtTime(.0001,now+.47);
   stream.connect(filter);filter.connect(gain);gain.connect(audio.destination);
   stream.start(now);stream.stop(now+duration);
   [[.075,540],[.16,430],[.255,355]].forEach(([offset,frequency])=>{
    const bubble=audio.createOscillator(),level=audio.createGain(),at=now+offset;
    bubble.type='sine';
    bubble.frequency.setValueAtTime(frequency,at);
    bubble.frequency.exponentialRampToValueAtTime(frequency*.57,at+.085);
    level.gain.setValueAtTime(.0001,at);
    level.gain.exponentialRampToValueAtTime(.012,at+.012);
    level.gain.exponentialRampToValueAtTime(.0001,at+.1);
    bubble.connect(level);level.connect(audio.destination);
    bubble.start(at);bubble.stop(at+.105);
   });
   return;
  }
  const notes=type==='success'?[[523,.11],[659,.18],[784,.24],[1047,.29]]:[[900,.04]];
  notes.forEach(([hz,dur],i)=>{const osc=audio.createOscillator(),g=audio.createGain();osc.type='sine';osc.frequency.value=hz;
   const at=now+i*(type==='success'?.075:0);g.gain.setValueAtTime(.0001,at);
   g.gain.exponentialRampToValueAtTime(type==='success'?.026:.012,at+.012);
   g.gain.exponentialRampToValueAtTime(.0001,at+dur+.035);osc.connect(g);g.connect(audio.destination);osc.start(at);osc.stop(at+dur+.045);});
 }catch(_){}
 try{if(navigator.vibrate)navigator.vibrate(type==='success'?[18,40,24]:9)}catch(_){}
}
let buddyMessageTimer=null,buddyAnimTimer=null;
function buddySay(message,positive=false){
 const toast=$('buddyToast'),caption=$('buddyNote'),label=$('buddyToastText'),buddy=$('buddy');
 if(!toast||!buddy||!caption||!label)return;
 label.textContent=message;
 caption.textContent=positive?'NUTRI BUDDY · TADAAA!':'NUTRI BUDDY 🐿️';
 toast.hidden=false;
 buddy.classList.remove('cheer');
 if(buddyAnimTimer)clearTimeout(buddyAnimTimer);
 if(positive){
  // CSS-only character movement on click, no permanent background animation.
  void buddy.offsetWidth;
  buddy.classList.add('cheer');
  buddyAnimTimer=setTimeout(()=>buddy.classList.remove('cheer'),650);
 }
 if(buddyMessageTimer)clearTimeout(buddyMessageTimer);
 buddyMessageTimer=setTimeout(()=>{
  toast.hidden=true;caption.textContent='NUTRI BUDDY 🐿️';
 },positive?2800:2400);
}
function success(){
 tone('success');
 buddySay('TADAAA! A naplód frissült. ☕🥗',true);
}
function greetBuddy(){
 const doc=read(active),day=currentDay(),rows=doc.entries.filter(e=>!e.deleted&&e.date===day);
 const kcal=rows.reduce((n,e)=>n+(Number(e.nutrients&&e.nutrients.kcal)||0),0);
 let m='Helló '+profileName(active)+'! ☕ A chipmunk készen áll a napi kalandokra.';
 if(!rows.length)m='Reggeli cappuccino? A mókus már felébredt! ☕🐿️';
 else if(doc.goal.kcal!=null){
  const remaining=Math.round(doc.goal.kcal-kcal);
  m=remaining>=0
   ?'Ma '+fmt(kcal,0)+' kcal került a naplóba. Még '+fmt(remaining,0)+' kcal van a beállított keretig.'
   :'Ma '+fmt(kcal,0)+' kcal szerepel a naplóban. Nézzük az egyensúlyt együtt, ítélkezés nélkül.';
 }else m='Már '+rows.length+' finomságot rögzítettél ma. A mókus mindet számon tartja! 🐿️';
 buddySay(m,false);tone('tap');
}
function mealForTime(time){
 const hour=Number(String(time).split(':')[0]);
 return hour<10?'Reggeli':hour<12?'Tízórai':hour<15?'Ebéd':hour<18?'Uzsonna':hour<21?'Vacsora':'Egyéb';
}
function availableUnits(food){
 const units=[{name:'g',gram:1},{name:'dkg',gram:10},{name:'kg',gram:1000}];
 if(food.kind==='drink')units.push({name:'ml',gram:1},{name:'dl',gram:100},{name:'liter',gram:1000},{name:'pohár (250 ml)',gram:250},{name:'csésze (150 ml)',gram:150},{name:'flakon (500 ml)',gram:500});
 if(food.piece)units.unshift({name:'darab',gram:Number(food.piece)});
 for(const u of read(active).units.filter(x=>!x.deleted&&x.foodId===food.id))units.push({name:u.name,gram:u.grams});
 return units;
}
function redrawSelect(){
 const kind=activeType,search=$('foodSearch').value.trim().toLocaleLowerCase('hu-HU');
 const list=catalog().filter(f=>f.kind===kind&&(!search||(f.name+' '+f.category).toLocaleLowerCase('hu-HU').includes(search)));
 const select=$('foodSelect');select.replaceChildren();
 for(const f of list){const o=new Option((f.icon||'🍽️')+' '+f.category+' · '+f.name,f.id);select.add(o);}
 if(!list.length){currentFood='';$('entryPreview').textContent='Nincs találat. Új élelmiszer a Saját étel gombbal vehető fel.';return;}
 if(!list.some(f=>f.id===currentFood))currentFood=list[0].id;
 select.value=currentFood;redrawUnits();
}
function redrawUnits(){
 const f=foodBy(currentFood);if(!f)return;
 const units=availableUnits(f),select=$('unit'),old=select.value;select.replaceChildren();
 units.forEach(u=>{const opt=new Option(u.name,u.name);opt.dataset.grams=u.gram;select.add(opt)});
 const favorite=f.piece?'darab':(f.kind==='drink'?'pohár (250 ml)':'g');
 select.value=units.some(u=>u.name===old)?old:(units.some(u=>u.name===favorite)?favorite:units[0].name);
 $('quantity').value=f.piece?'1':(f.kind==='drink'?'1':'100');
 entryPreview();
}
function chosenUnit(){
 const selected=$('unit').selectedOptions[0];return selected?Number(selected.dataset.grams):0;
}
function entryPreview(){
 const f=foodBy(currentFood),qty=num($('quantity').value,.01,10000);
 if(!f||qty==null)return;
 const grams=qty*chosenUnit(),result=calc(f.per,grams);
 $('entryPreview').innerHTML='<span class="nutrition-icon">'+safeText(f.icon||'🍽️')+'</span> <strong>'+fmt(result.kcal,0)+' kcal</strong><br>'+fmt(grams,1)+' g (számított adag) · Fehérje '+fmt(result.protein)+' g · Szénhidrát '+fmt(result.carbs)+' g · Zsír '+fmt(result.fat)+' g'+(result.vitc!=null?'<br>🍊 C-vitamin: '+fmt(result.vitc)+' mg':'')+'<br><span class="note">Alapadat: tájékoztató becslés / 100 g. A mértékegység tömege szerkeszthető.</span>';
}
function openEntry(kind,item=null){
 activeType=kind;currentEdit=item?.id||'';currentFood=item?.foodId||'';
 $('entryTitle').textContent=item?'Bevitel szerkesztése':(kind==='drink'?'🥤 Ital hozzáadása':'🍎 Étel hozzáadása');
 $('entryError').textContent='';$('foodSearch').value='';$('entryTime').value=item?.time||localTime();
 entryMealManuallyChosen=false;
 $('meal').value=normalizeMeal(item?.meal)||mealForTime($('entryTime').value);
 syncMealButtons('hhMealChoices','meal');
 redrawSelect();
 if(item&&foodBy(item.foodId)){
   currentFood=item.foodId;redrawSelect();
   const units=availableUnits(foodBy(currentFood));
   if(units.some(u=>u.name===item.unit)){$('unit').value=item.unit;$('quantity').value=item.quantity;}
   entryPreview();
 }
 $('entryDialog').showModal();tone('tap');
}
function saveFood(e){
 e.preventDefault();
 const f=foodBy(currentFood),q=num($('quantity').value,.01,10000),grams=q*chosenUnit();
 if(!f||q==null||!Number.isFinite(grams)||grams<=0||grams>15000){$('entryError').textContent='Válassz élelmiszert és érvényes adagot.';return;}
 const unit=$('unit').value,time=$('entryTime').value;
 if(!/^\d\d:\d\d$/.test(time)){$('entryError').textContent='Érvényes időpont szükséges.';return;}
 const meal=normalizeMeal($('meal').value);
 if(!meal){$('entryError').textContent='Válassz étkezési kategóriát.';return;}
 const oldId=currentEdit,rec={
  id:oldId||uid(),createdAt:stamp(),updatedAt:stamp(),date:currentDay(),time,meal,kind:f.kind,
  foodId:f.id,name:f.name,icon:f.icon,quantity:q,unit,quantityText:fmt(q)+' '+unit,volumeMl:f.kind==='drink'?grams:null,
  nutrients:calc(f.per,grams),source:'estimated'
 };
 update(d=>{const i=d.entries.findIndex(x=>x.id===rec.id);if(i>=0)rec.createdAt=d.entries[i].createdAt; if(i>=0)d.entries[i]=rec;else d.entries.push(rec);});
 $('entryDialog').close();success();
}
function readPresetInputs(){
 const out={milkType:$('milkType').value,meal:$('presetMeal').value};
 for(const [key,min,max] of [['milkMl',0,1000],['sugarCubes',0,30],['cubeGrams',.5,15],['cinnamonGrams',0,100],['ladyCount',0,50],['ladyGrams',.5,40]]){
  const val=num($(key).value,min,max);if(val==null)throw Error('Hibás mennyiség: '+key);
  out[key]=val;
 }
 if(!Number.isInteger(out.sugarCubes)||!Number.isInteger(out.ladyCount))throw Error('A darabszám legyen egész.');
 if(!['milk15','milk01','milklactose'].includes(out.milkType))throw Error('Érvénytelen tejtípus');
 return out;
}
function presetNutrients(p){
 const milk=foods.find(x=>x.id===p.milkType),sugar=foods.find(x=>x.id==='sugar'),lady=foods.find(x=>x.id==='ladyfinger'),cin=foods.find(x=>x.id==='cin');
 const parts=[calc(milk.per,p.milkMl),calc(sugar.per,p.sugarCubes*p.cubeGrams),calc(cin.per,p.cinnamonGrams),calc(lady.per,p.ladyCount*p.ladyGrams)];
 const totals=sum(parts);totals.kcal=(totals.kcal||0)+2;return totals;
}
function presetPreview(){
 try{const q=readPresetInputs(),nut=presetNutrients(q);
  $('presetPreview').innerHTML='☕ <strong>'+fmt(nut.kcal,0)+' kcal</strong><br>Tej '+fmt(q.milkMl,0)+' ml · '+q.sugarCubes+' kockacukor ('+fmt(q.sugarCubes*q.cubeGrams,1)+' g)'+(q.cinnamonGrams?' · fahéjas cukor '+fmt(q.cinnamonGrams)+' g':'')+(q.ladyCount?' · '+q.ladyCount+' babapiskóta':'')+'<br>Fehérje '+fmt(nut.protein)+' g · Szénhidrát '+fmt(nut.carbs)+' g · Zsír '+fmt(nut.fat)+' g<br><span class="note">Induló mennyiségek: szerkeszthető becslések, nem gyártói tápértékek.</span>';
 }catch(e){$('presetPreview').textContent=e.message;}
}
function openPreset(which,item=null){
 currentPreset=which;currentEdit=item?.id||'';
 $('presetTitle').textContent=(which==='morning'?'☕ Reggeli':'☕ Délutáni')+' cappuccino · '+profileName(active);
 $('presetError').textContent='';
 const p=item?.components||read(active).presets[which];
 for(const key of ['milkMl','milkType','sugarCubes','cubeGrams','cinnamonGrams','ladyCount','ladyGrams'])$(key).value=p[key];
 $('presetMeal').value=normalizeMeal(item?.meal)||normalizeMeal(p.meal)||mealForTime(localTime());$('presetTime').value=item?.time||localTime();
 syncMealButtons('hhPresetMealChoices','presetMeal');
 presetPreview();$('presetDialog').showModal();tone('tap');
}
function savePresetOnly(){
 try{
  const recipe=readPresetInputs(),which=currentPreset;
  recipe.meal=normalizeMeal($('presetMeal').value)||'Egyéb';recipe.updatedAt=stamp();
  update(d=>{d.presets[which]=recipe});
  $('presetDialog').close();success();
 }catch(e){$('presetError').textContent=e.message;}
}
function savePresetEntry(e){
 e.preventDefault();
 try{
  const q=readPresetInputs(),time=$('presetTime').value;
  if(!/^\d\d:\d\d$/.test(time))throw Error('Érvényes időpont szükséges.');
  const meal=normalizeMeal($('presetMeal').value);
  if(!meal)throw Error('Válassz étkezési kategóriát.');
  const id=currentEdit||uid(),which=currentPreset;
  const rec={id,createdAt:stamp(),updatedAt:stamp(),date:currentDay(),time,meal,kind:'drink',foodId:'preset:'+which,
   icon:'☕',name:which==='morning'?'Reggeli cappuccino':'Light cappuccino, fahéjas cukor és babapiskóta',
   quantityText:q.sugarCubes+' kockacukor'+(q.ladyCount?' · '+q.ladyCount+' piskóta':''),
   volumeMl:q.milkMl+35,nutrients:presetNutrients(q),components:clone(q),source:'estimated'};
  update(d=>{const idx=d.entries.findIndex(x=>x.id===id);
   if(idx>=0)rec.createdAt=d.entries[idx].createdAt;
   if(idx>=0)d.entries[idx]=rec;else d.entries.push(rec);});
  $('presetDialog').close();success();
 }catch(e){$('presetError').textContent=e.message;}
}
function editEntry(row){
 if(row.quickRecipeId){alert('Ez egy mentéskori recept-pillanatkép. A Quick Recipe Studio a jövőbeni bevitelt módosítja; a naplózott példány a napi naplóban megőrzött. Hibás bevitelt törölhetsz, majd újra rögzíthetsz.');return;}
 if(row.components){openPreset(row.foodId.endsWith('afternoon')?'afternoon':'morning',row);return;}
 openEntry(row.kind,row);
}
function openGoal(){
 const goal=read(active).goal;$('goalKcal').value=goal.kcal??'';$('goalTolerance').value=goal.tolerance;$('goalError').textContent='';$('goalDialog').showModal();
}
function saveGoal(e){e.preventDefault();const kcal=$('goalKcal').value.trim()?num($('goalKcal').value,800,6000):null,tol=num($('goalTolerance').value,0,1000);
 if(($('goalKcal').value.trim()&&kcal==null)||tol==null){$('goalError').textContent='A megadott keret vagy tartomány érvénytelen.';return;}
 update(d=>d.goal={kcal,tolerance:tol,updatedAt:stamp()});$('goalDialog').close();success();
}
function saveCustom(e){
 e.preventDefault();const name=$('customName').value.trim(),per={},kind=$('customKind').value;
 if(name.length<2||name.length>100){$('customError').textContent='Érvénytelen elnevezés.';return;}
 for(const [key,el,max] of [['kcal','customKcal',900],['protein','customProtein',100],['carbs','customCarbs',100],['fat','customFat',100]]){
  const v=num($(el).value,0,max);if(v==null){$('customError').textContent='Érvénytelen tápérték: '+key;return;}per[key]=v;
 }
 const entry={id:'user:'+uid(),name,kind,category:$('customCategory').value,icon:kind==='drink'?'🥤':'🍽️',per,createdAt:stamp(),updatedAt:stamp()};
 update(d=>d.catalog.push(entry));$('customDialog').close();$('customForm').reset();success();
}
function openUnit(){
 const select=$('unitFood');select.replaceChildren();
 catalog().forEach(f=>select.add(new Option(f.name,f.id)));
 $('unitError').textContent='';$('unitName').value='';$('unitGrams').value='';$('unitDialog').showModal();
}
function saveUnit(e){
 e.preventDefault();const foodId=$('unitFood').value,name=$('unitName').value.trim(),grams=num($('unitGrams').value,.1,3000);
 if(!foodBy(foodId)||name.length<2||grams==null){$('unitError').textContent='Érvényes élelmiszer, egységnév és grammtömeg szükséges.';return;}
 update(d=>d.units.push({id:uid(),foodId,name,grams,updatedAt:stamp()}));$('unitDialog').close();success();
}
function openBody(kind){
 bodyKind=kind;$('bodyTitle').textContent=kind==='urine'?'Vizelet · Napi ritmus':'Széklet · Napi ritmus';
 $('bodyTime').value=localTime();$('bristol').value='';$('bodyNote').value='';$('bodyError').textContent='';
 $('bristolWrap').hidden=kind==='urine';if($('urineColorWrap')){$('urineColorWrap').hidden=kind!=='urine';$('urineColor').value='';}$('bodyDialog').showModal();
}
function saveBody(e){
 e.preventDefault();const time=$('bodyTime').value;
 if(!/^\d\d:\d\d$/.test(time)){$('bodyError').textContent='Érvénytelen időpont';return;}
 const urineColor=bodyKind==='urine'&&$('urineColor')?$('urineColor').value:'';
 if(urineColor&&!/^[1-8]$/.test(urineColor)){$('bodyError').textContent='Válassz érvényes színfokozatot (1–8).';return;}
 const rec={id:uid(),kind:bodyKind,date:currentDay(),time,bristol:bodyKind==='stool'?$('bristol').value:'',urineColor:urineColor||'',note:$('bodyNote').value.trim(),createdAt:stamp(),updatedAt:stamp()};
 update(d=>d.body.push(rec));$('bodyDialog').close();success();
}

async function refreshActivity(profile){
 const date=currentDay(),api=window.HH_CALORIE_ENGINE_V363;
 const indicator=$('activitySource');
 if(indicator)indicator.textContent='Activity-adatok frissítése…';
 try{
  const record=api&&api.estimateForNutrition?await api.estimateForNutrition(profile,date):{error:'Activity Calorie Engine nem töltődött be'};
  if(profile!==active||date!==currentDay())return;
  const valid=record&&record.kind==='total_burned_kcal'&&record.profile===profile&&record.date===date&&Number.isFinite(record.kcal)&&record.kcal>0;
  if(valid){
   localStorage.setItem('hh-nutrition-total-energy-'+profile,JSON.stringify(record));
   $('activity').textContent=fmt(record.kcal,0)+' kcal';
   render();
   if(indicator)indicator.textContent='Activity · teljes energia, becslés';
  }else{
   localStorage.removeItem('hh-nutrition-total-energy-'+profile);
   $('activity').textContent='—';
   render();
   const reason=record&&record.error||'Nincs számítható Activity-energiaadat';
   if(indicator)indicator.textContent=reason;
   $('hhEnergyStatus').textContent=reason;
  }
 }catch(_){
  if(profile!==active||date!==currentDay())return;
  localStorage.removeItem('hh-nutrition-total-energy-'+profile);
  $('activity').textContent='—';
  render();
  if(indicator)indicator.textContent='Az Activity-adatkapcsolat jelenleg nem elérhető';
  $('hhEnergyStatus').textContent='Activity-adatkapcsolat jelenleg nem elérhető';
 }
}
function logWater250(){
 checkJarMidnight(); // Never attach a one-tap water glass to yesterday after midnight.
 const water=foodBy('water');
 if(!water){buddySay('A víz adatai nem találhatók a katalógusban.');return;}
 const now=stamp(),row={id:uid(),createdAt:now,updatedAt:now,date:currentDay(),
  time:localTime(),meal:mealForTime(localTime()),kind:'drink',
  foodId:'water',name:'Víz',icon:'💧',quantity:250,unit:'ml',
  quantityText:'250 ml',volumeMl:250,nutrients:calc(water.per,250),source:'estimated'};
 update(d=>d.entries.push(row));
 success();
}
function jumpTo(id){
 const node=$(id);if(!node)return;
 node.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
}
function openNamedFood(id,kind='food'){
 openEntry(kind);
 const food=foodBy(id);
 if(!food)return;
 currentFood=id;
 $('foodSearch').value='';
 redrawSelect();
 $('foodSelect').value=id;
 redrawUnits();
}
function syncMealButtons(containerId,selectId){
 const wrapper=$(containerId),select=$(selectId);
 if(!wrapper||!select)return;
 wrapper.querySelectorAll('button[data-meal]').forEach(button=>{
  const checked=button.dataset.meal===select.value;
  button.setAttribute('aria-pressed',String(checked));
  button.classList.toggle('selected',checked);
 });
}
function bindMealButtons(containerId,selectId,trackManual){
 const wrapper=$(containerId),select=$(selectId);
 if(!wrapper||!select)return;
 wrapper.hidden=false;
 const native=select.closest('.field');if(native)native.classList.add('hh-meal-native-enhanced');
 wrapper.querySelectorAll('button[data-meal]').forEach(button=>{
  button.addEventListener('click',()=>{
   select.value=button.dataset.meal;
   if(trackManual)entryMealManuallyChosen=true;
   syncMealButtons(containerId,selectId);
  });
 });
 select.addEventListener('change',()=>syncMealButtons(containerId,selectId));
 syncMealButtons(containerId,selectId);
}
function events(){
 bindMealButtons('hhMealChoices','meal',true);
 bindMealButtons('hhPresetMealChoices','presetMeal',false);
 const click=(id,fn)=>$(id).addEventListener('click',fn);
 click('profileBtn',()=>{tone('tap');setProfile(active==='zsolt'?'monika':'zsolt',true)});
 click('buddy',greetBuddy);

 click('insight7',()=>{insightDays=7;renderInsights();tone('tap')});
 click('insight30',()=>{insightDays=30;renderInsights();tone('tap')});
 click('goalBtn',openGoal);if($('morning'))click('morning',()=>openPreset('morning'));if($('afternoon'))click('afternoon',()=>openPreset('afternoon'));
 click('editMorning',()=>openPreset('morning'));click('editAfternoon',()=>openPreset('afternoon'));
 click('addFood',()=>openEntry('food'));click('addDrink',()=>openEntry('drink'));
 click('waterQuick',logWater250);
 click('waterQuickAdd',logWater250);
 click('hhJarReset',resetJar);
 click('hhWaterAmount',resetHydrationCounter);
 click('hhWaterSave',()=>{
  const raw=$('hhWaterGoal').value.trim(),v=Number(raw);
  if(!raw||!Number.isFinite(v)||v<250||v>6000){alert('Adj meg 250 és 6000 ml közötti folyadékcélt.');return;}
  localStorage.setItem('hh-nutrition-hydration-goal-'+active,String(Math.round(v)));
  render();tone('tap');
 });

 click('photoCoffee',()=>openPreset('morning'));
 click('photoBanana',()=>openNamedFood('banana'));
 click('photoSalad',()=>openNamedFood('chicken'));
 click('photoAfternoon',()=>openPreset('afternoon'));
 click('newFood',()=>{$('customError').textContent='';$('customDialog').showModal()});
 click('customUnit',openUnit);
 click('syncNutritionNow',()=>{syncProfile(active).catch(()=>{})});
 click('urineBtn',()=>openBody('urine'));click('stoolBtn',()=>openBody('stool'));click('bodyHistoryBtn',()=>renderBody());
 click('savePreset',savePresetOnly);
 $('foodSearch').addEventListener('input',redrawSelect);
 $('foodSelect').addEventListener('change',()=>{currentFood=$('foodSelect').value;redrawUnits();tone('tap')});
 for(const id of ['quantity','unit'])$(id).addEventListener('change',entryPreview);
 $('quantity').addEventListener('input',entryPreview);
 $('entryTime').addEventListener('change',()=>{
  if(!entryMealManuallyChosen){
   $('meal').value=mealForTime($('entryTime').value);
   syncMealButtons('hhMealChoices','meal');
  }
 });
 DOM.forEach(id=>$(id).addEventListener('input',presetPreview));
 $('entryForm').addEventListener('submit',saveFood);$('presetForm').addEventListener('submit',savePresetEntry);
 $('goalForm').addEventListener('submit',saveGoal);$('customForm').addEventListener('submit',saveCustom);
 $('unitForm').addEventListener('submit',saveUnit);$('bodyForm').addEventListener('submit',saveBody);
 document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.close).close()));
 $('logDate').addEventListener('change',()=>{if(!isDay($('logDate').value))$('logDate').value=localDate();render();refreshActivity(active)});
 window.addEventListener('storage',e=>{if(e.key==='hh-nutrition-PREVIEW-profile'||e.key==='hh-profile'){const desired=pkey();if(desired!==active)setProfile(desired,false)}else if(e.key===LS+active)render();});
}
/* Quick Recipe Wheel beta: canonical profile-scoped recipe storage and diary writes. */
root.HH_NUTRITION_QUICK_API={
 getProfile:()=>active,
 getData:()=>clone(read(active)),
 syncNow:()=>syncProfile(active),
 getPresetNutrients:key=>clone(presetNutrients(read(active).presets[key])),
 getFoodNutrients:(id,grams)=>{const f=foodBy(id);return f?clone(calc(f.per,grams)):null},
 reorderRecipes:ids=>{
  if(!Array.isArray(ids)||ids.length>250||ids.some(id=>typeof id!=='string'||!/^quick:[a-z0-9_-]{1,80}$/i.test(id))||new Set(ids).size!==ids.length)throw Error('Érvénytelen körhinta-sorrend');
  update(d=>{d.quickRecipeOrder={ids:ids.slice(),updatedAt:stamp()};});
 },
  saveRecipe:recipe=>{
  if(!recipe||typeof recipe.id!=='string'||!/^quick:[a-z0-9_-]{1,80}$/i.test(recipe.id))throw Error('Érvénytelen receptazonosító');
  const name=String(recipe.name||'').trim(),kcal=Number(recipe.nutrients&&recipe.nutrients.kcal);
  if(name.length<2||name.length>80||!Number.isFinite(kcal)||kcal<0||kcal>5000)throw Error('Érvénytelen név vagy kalória');
  const now=stamp(),row={...clone(recipe),name,updatedAt:now};
  update(d=>{const idx=d.quickRecipes.findIndex(q=>q.id===row.id);if(idx>=0)d.quickRecipes[idx]=row;else d.quickRecipes.push(row)});
 },
 recordRecipe:(recipe,mealOverride=null)=>{
  if(!recipe||typeof recipe.name!=='string'||!recipe.nutrients)throw Error('Hiányzó receptadat');
  const kcal=Number(recipe.nutrients.kcal);if(!Number.isFinite(kcal)||kcal<0||kcal>5000)throw Error('Érvénytelen recept kalória');
  const now=stamp(),time=localTime(),nut={};
  if($('logDate'))$('logDate').value=localDate(); // Quick log always records and displays today's diary.
  for(const key of metrics){const x=recipe.nutrients[key];nut[key]=x==null?null:Number(x);if(nut[key]!=null&&(!Number.isFinite(nut[key])||nut[key]<0))throw Error('Érvénytelen tápérték');}
  const rec={id:uid(),createdAt:now,updatedAt:now,date:localDate(),time,
   meal:normalizeMeal(mealOverride)||normalizeMeal(recipe.meal)||mealForTime(time),
   kind:recipe.kind==='drink'?'drink':'food',foodId:recipe.id,
   name:String(recipe.name).slice(0,80),icon:String(recipe.icon||'🍽️').slice(0,8),
   quantityText:'1 előre beállított adag',volumeMl:recipe.kind==='drink'&&Number.isFinite(Number(recipe.volumeMl))&&Number(recipe.volumeMl)>0?Number(recipe.volumeMl):null,nutrients:nut,
   source:'estimated',quickRecipeId:recipe.id,quickRecipeSnapshot:{name:recipe.name,ingredients:String(recipe.ingredients||'').slice(0,2000)}};
  update(d=>d.entries.push(rec));
  return {name:rec.name,kcal,profile:active,date:rec.date};
 },
 refresh:()=>render()
};
function start(){
 $('logDate').value=localDate();
 events();setProfile(pkey(),false);
 checkJarMidnight();scheduleMidnightRollover();setInterval(checkJarMidnight,30000);
 // Reconcile this profile's Dropbox data while foregrounded. Other devices
 // see saved image references and recipe changes after reopening or within 2 min.
 let lastRemoteRefresh=Date.now();
 function refreshFromCloud(){
  if(document.hidden||!window.HH_NUTRITION_CLOUD_V626?.connected())return;
  if(Date.now()-lastRemoteRefresh<45000)return;
  lastRemoteRefresh=Date.now();
  syncProfile(active).catch(()=>{});
 }
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){checkJarMidnight();refreshFromCloud();}
 });
 root.addEventListener('focus',()=>{checkJarMidnight();refreshFromCloud();});
 root.setInterval(refreshFromCloud,120000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
