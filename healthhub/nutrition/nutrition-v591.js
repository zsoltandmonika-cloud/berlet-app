/* HealthHub Nutrition Intelligence v591
 * Private family food log. Dropbox/App Folder is the canonical sync target;
 * localStorage is only the offline browser cache. No personal data in GitHub.
 * Uses conditional Dropbox revisions and record IDs to avoid blind overwrites.
 */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const SCHEMA='healthhub.nutrition/1', APP_KEY='t68rmhh5f1l8d85';
const LS='hh-nutrition-v591-', TOKEN='hh-dropbox-token-v2';
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
const ENTRIES=['Reggeli','Tízórai','Ebéd','Uzsonna','Vacsora','Egyéb / Brunch'];
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
const pkey=()=>root.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
const profileName=k=>k==='monika'?'Mónika':'Zsolt';
const clone=x=>JSON.parse(JSON.stringify(x));
function stamp(){return new Date().toISOString();}
function makeDefaultPreset(profile,afternoon){
 return {milkMl:150,milkType:profile==='monika'?'milklactose':(afternoon?'milk01':'milk15'),sugarCubes:afternoon?3:(profile==='monika'?1:2),cubeGrams:4,cinnamonGrams:afternoon?2:0,ladyCount:afternoon?4:0,ladyGrams:7,meal:afternoon?'Uzsonna':'Reggeli',updatedAt:'1970-01-01T00:00:00Z'};
}
function fresh(profile){
 return {schemaVersion:SCHEMA,profileKey:profile,updatedAt:stamp(),entries:[],body:[],catalog:[],units:[],goal:{kcal:null,tolerance:150,updatedAt:'1970-01-01T00:00:00Z'},presets:{morning:makeDefaultPreset(profile,false),afternoon:makeDefaultPreset(profile,true)}};
}
function normalize(x,profile){
 let d=fresh(profile);
 if(!x||x.schemaVersion!==SCHEMA||x.profileKey!==profile)return d;
 ['entries','body','catalog','units'].forEach(k=>{if(Array.isArray(x[k]))d[k]=x[k].filter(v=>v&&typeof v.id==='string'&&v.id.length<150).slice(-50000);});
 if(x.goal&&typeof x.goal==='object'){const kcal=x.goal.kcal==null?null:num(x.goal.kcal,800,6000);d.goal={kcal,tolerance:num(x.goal.tolerance,0,1000)??150,updatedAt:x.goal.updatedAt||d.goal.updatedAt};}
 for(const key of ['morning','afternoon'])if(x.presets&&x.presets[key]){
   const q=x.presets[key];const base=d.presets[key];d.presets[key]={...base,...q,updatedAt:q.updatedAt||base.updatedAt};
 }
 return d;
}
function read(profile){try{return normalize(JSON.parse(localStorage.getItem(LS+profile)||'null'),profile)}catch(_){return fresh(profile)}}
function write(profile,doc){
 doc.updatedAt=stamp();localStorage.setItem(LS+profile,JSON.stringify(doc));
 root.dispatchEvent(new CustomEvent('healthhub:nutrition-changed',{detail:{profile,at:doc.updatedAt}}));
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
 for(const key of ['entries','body','catalog','units'])o[key]=mergeRows(l[key],r[key]);
 o.goal=String(r.goal.updatedAt||'')>String(l.goal.updatedAt||'')?r.goal:l.goal;
 for(const key of ['morning','afternoon'])o.presets[key]=String(r.presets[key].updatedAt||'')>String(l.presets[key].updatedAt||'')?r.presets[key]:l.presets[key];
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
 root.localStorage.setItem('hh-profile',next==='monika'?'m':'z');
 $('profileBtn').textContent=profileName(next)+' ⇄';
 $('morningLabel').textContent=(next==='monika'?'1':'2')+' kockacukor alaprecept · módosítható';
 render();if(fromUi)root.dispatchEvent(new CustomEvent('healthhub:profile-changed',{detail:{profile:next}}));
 refreshActivity(next);syncProfile(next).catch(()=>{});
}
function render(){
 const d=read(active),date=currentDay();
 $('todayLabel').textContent=date===localDate()?'Mai nap':date;
 const entries=d.entries.filter(e=>!e.deleted&&e.date===date);
 const vals=sum(entries.map(x=>x.nutrients||{})),kcal=vals.kcal??0,goal=d.goal.kcal;
 $('balanceLabel').textContent=goal?'NAPI KALÓRIA · KERETBŐL HÁTRA':'NAPI KALÓRIA · ELFOGYASZTVA';
 const b=$('balanceCard'),t=$('balanceValue');b.classList.remove('good','warn','bad');t.classList.remove('good','warn','bad');
 if(goal!=null){
  const remain=goal-kcal,lo=goal-d.goal.tolerance,hi=goal+d.goal.tolerance;
  const isToday=date===localDate();const ongoingDay=isToday&&new Date().getHours()<20;
  const color=kcal>hi?'bad':ongoingDay?'good':kcal>=lo?'good':'warn';
  b.classList.add(color);t.classList.add(color);t.textContent=(remain>=0?'':'−')+fmt(Math.abs(remain),0)+' kcal';
  $('balanceText').textContent='Elfogyasztva: '+fmt(kcal,0)+' kcal · Cél: '+fmt(goal,0)+' kcal · '+(ongoingDay?'A zöld azt jelzi, hogy eddig a kereten belül vagy. A nap végén a céltartomány is számít.':'A zöld a beállított napi céltartományt jelöli.');
  $('progress').style.width=Math.min(100,100*kcal/goal)+'%';
 }else{
  t.textContent=fmt(kcal,0)+' kcal';$('balanceText').textContent='A személyes kalóriakeret még nincs beállítva. A bevitel ettől függetlenül naplózható.';$('progress').style.width='0%';
 }
 for(const k of ['protein','carbs','fat','fiber','vitc','b6','calcium','magnesium','potassium','omega3']){
   $(k).textContent=vals[k]==null?'—':fmt(vals[k],k==='b6'?2:1);
 }
 let fluid=0, fluidFound=false;
 for(const e of entries)if(Number.isFinite(e.volumeMl)){fluid+=e.volumeMl;fluidFound=true}
 $('fluids').textContent=fluidFound?fmt(fluid,0):'—';
 const log=$('log');log.replaceChildren();
 if(!entries.length){log.innerHTML='<p class="empty">Még nincs bevitel erre a napra. A reggeli cappuccino egy jó kezdet. ☕</p>';}
 entries.sort((a,b)=>b.time.localeCompare(a.time)).forEach(e=>{
  const line=document.createElement('div');line.className='entry';
  const left=document.createElement('div'),right=document.createElement('aside');
  const name=document.createElement('strong');name.textContent=(e.icon||'🍽️')+' '+e.name;
  const smaller=document.createElement('small');smaller.textContent=e.time+' · '+e.meal+(e.quantityText?' · '+e.quantityText:'')+(e.source==='estimated'?' · becsült':'');
  left.append(name,smaller);
  const c=document.createElement('b');c.textContent=fmt(e.nutrients&&e.nutrients.kcal,0)+' kcal';
  const edit=document.createElement('button');edit.type='button';edit.className='mini';edit.textContent='Szerk.';edit.addEventListener('click',()=>editEntry(e));
  const del=document.createElement('button');del.type='button';del.className='mini';del.textContent='×';del.title='Bevitel törlése';del.addEventListener('click',()=>{if(confirm('Törlöd a bejegyzést?'))update(d=>{const row=d.entries.find(x=>x.id===e.id);if(row){row.deleted=true;row.updatedAt=stamp();}})});
  const actions=document.createElement('div');actions.className='controls';actions.style.justifyContent='flex-end';actions.append(edit,del);right.append(c,actions);line.append(left,right);log.append(line);
 });
 renderBody();renderInsights();
}
function renderBody(){
 const date=currentDay(),rows=read(active).body.filter(e=>e.date===date&&!e.deleted).sort((a,b)=>b.time.localeCompare(a.time));
 const view=$('bodyLog');view.replaceChildren();
 if(!rows.length){view.textContent='Még nincs esemény a kiválasztott napon.';return;}
 for(const row of rows){const p=document.createElement('div');p.style.padding='6px 0';
  p.textContent=row.time+' · '+(row.kind==='urine'?'Vizelet':'Széklet')+(row.bristol?' · Bristol '+row.bristol:'')+(row.note?' · '+row.note:'')+' ';
  const remove=document.createElement('button');remove.className='mini';remove.type='button';remove.textContent='×';remove.title='Törlés';
  remove.addEventListener('click',()=>update(d=>{const b=d.body.find(x=>x.id===row.id);if(b){b.deleted=true;b.updatedAt=stamp();}}));p.append(remove);view.append(p);
 }
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
function connected(){try{return Boolean(JSON.parse(localStorage.getItem(TOKEN)||'null')?.refresh_token)}catch(_){return false;}}
async function token(){
 let t=JSON.parse(localStorage.getItem(TOKEN)||'null');
 if(!t||!t.refresh_token)throw Error('A Dropbox nincs kapcsolva. HealthHub Home → Cloud Vault.');
 if(t.access_token&&Number(t.expires_at)>Date.now()+60000)return t.access_token;
 const body=new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP_KEY});
 const res=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 if(!res.ok)throw Error('Dropbox munkamenet lejárt. Csatlakoztasd újra a főoldalon.');
 const obj=await res.json();if(!obj.access_token)throw Error('Hiányzó felhőhozzáférés');
 t.access_token=obj.access_token;t.expires_at=Date.now()+(Number(obj.expires_in||14400)-60)*1000;
 localStorage.setItem(TOKEN,JSON.stringify(t));return t.access_token;
}
const pathFor=p=>'/HealthHub/profiles/'+p+'-nutrition.json';
async function download(p){
 const t=await token(),res=await fetch('https://content.dropboxapi.com/2/files/download',{
  method:'POST',headers:{Authorization:'Bearer '+t,'Dropbox-API-Arg':JSON.stringify({path:pathFor(p)})}});
 if(res.status===409){const err=await res.text();if(/not_found/i.test(err))return {doc:null,rev:null};throw Error('Dropbox letöltés sikertelen (409)');}
 if(!res.ok)throw Error('Dropbox letöltés sikertelen ('+res.status+')');
 let meta={};try{meta=JSON.parse(res.headers.get('Dropbox-API-Result')||'{}')}catch(_){}
 const doc=await res.json();if(doc&&doc.schemaVersion!==SCHEMA)throw Error('Nem támogatott Nutrition adatstruktúra');
 if(doc&&doc.profileKey!==p)throw Error('Profilütközés a központi naplóban');
 return {doc,rev:meta.rev||null};
}
async function upload(p,doc,rev){
 const t=await token(),arg={path:pathFor(p),mode:rev?{'.tag':'update',update:rev}:'add',autorename:false,mute:true,strict_conflict:!rev};
 const res=await fetch('https://content.dropboxapi.com/2/files/upload',{
  method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/octet-stream','Dropbox-API-Arg':JSON.stringify(arg)},body:JSON.stringify(doc)});
 if(res.status===409)return {conflict:true};
 if(!res.ok)throw Error('Dropbox feltöltés sikertelen ('+res.status+')');
 return {conflict:false,meta:await res.json()};
}
function queueSync(p){
 if(syncTimers[p])clearTimeout(syncTimers[p]);
 syncTimers[p]=setTimeout(()=>{syncTimers[p]=null;syncProfile(p).catch(()=>{});},750);
}
async function syncProfile(p){
 if(!connected()){if(p===active)displayStatus('Helyben mentve · Dropbox nincs kapcsolva',true);return false;}
 if(syncRunning[p])return syncRunning[p];
 const work=(async()=>{
  if(p===active)displayStatus('Dropbox szinkron…');
  try{
   for(let tries=0;tries<4;tries++){
    const current=await download(p);
    let merged=merge(read(p),current.doc,p);
    // Re-entering this frequently used module must not rewrite an unchanged cloud file.
    const relevant=x=>JSON.stringify({entries:x.entries,body:x.body,catalog:x.catalog,units:x.units,goal:x.goal,presets:x.presets});
    if(current.doc&&relevant(merged)===relevant(normalize(current.doc,p))){
     const latest=merge(merged,read(p),p);
     localStorage.setItem(LS+p,JSON.stringify(latest));
     if(p===active){displayStatus('☁ Dropbox szinkronizálva');render();}
     if(relevant(latest)!==relevant(merged))queueSync(p);
     return true;
    }
    const save=await upload(p,merged,current.rev);
    if(save.conflict)continue;
    // Local changes made while uploading are folded back in; never revert them.
    const latest=merge(merged,read(p),p);
    localStorage.setItem(LS+p,JSON.stringify(latest));
    lastCloud[p]=Date.now();
    if(p===active){displayStatus('☁ Dropbox szinkronizálva');render();}
    if(['entries','body','catalog','units'].some(key=>JSON.stringify(merged[key])!==JSON.stringify(latest[key]))||JSON.stringify(merged.goal)!==JSON.stringify(latest.goal)||JSON.stringify(merged.presets)!==JSON.stringify(latest.presets))queueSync(p);
    return true;
   }
   throw Error('Konkurens felhőmódosítás, szinkron ismétlése szükséges');
  }catch(e){
   if(p===active)displayStatus('Helyben mentve · '+e.message,true);
   return false;
  }
 })();
 syncRunning[p]=work;
 try{return await work}finally{syncRunning[p]=null}
}
function sounds(){return localStorage.getItem('hh-nutrition-sound')!=='off'}
function tone(type){
 if(!sounds())return;
 try{
  if(!audio){const C=root.AudioContext||root.webkitAudioContext;if(!C)return;audio=new C();}
  if(audio.state==='suspended')audio.resume();
  const now=audio.currentTime;
  const notes=type==='success'?[[523,.11],[659,.18],[784,.24],[1047,.29]]:[[900,.04]];
  notes.forEach(([hz,dur],i)=>{const osc=audio.createOscillator(),g=audio.createGain();osc.type='sine';osc.frequency.value=hz;
   const at=now+i*(type==='success'?.075:0);g.gain.setValueAtTime(.0001,at);
   g.gain.exponentialRampToValueAtTime(type==='success'?.026:.012,at+.012);
   g.gain.exponentialRampToValueAtTime(.0001,at+dur+.035);osc.connect(g);g.connect(audio.destination);osc.start(at);osc.stop(at+dur+.045);});
 }catch(_){}
 try{if(navigator.vibrate)navigator.vibrate(type==='success'?[18,40,24]:9)}catch(_){}
}
function success(){tone('success');$('buddy').classList.add('cheer');setTimeout(()=>$('buddy').classList.remove('cheer'),450);}
function mealForTime(time){
 const hour=Number(String(time).split(':')[0]);
 return hour<10?'Reggeli':hour<12?'Tízórai':hour<15?'Ebéd':hour<18?'Uzsonna':hour<21?'Vacsora':'Egyéb / Brunch';
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
 $('meal').value=item?.meal||mealForTime($('entryTime').value);
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
 const meal=$('meal').value,oldId=currentEdit,rec={
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
 $('presetMeal').value=item?.meal||p.meal;$('presetTime').value=item?.time||localTime();
 presetPreview();$('presetDialog').showModal();tone('tap');
}
function savePresetOnly(){
 try{
  const recipe=readPresetInputs(),which=currentPreset;
  recipe.meal=$('presetMeal').value;recipe.updatedAt=stamp();
  update(d=>{d.presets[which]=recipe});
  $('presetDialog').close();success();
 }catch(e){$('presetError').textContent=e.message;}
}
function savePresetEntry(e){
 e.preventDefault();
 try{
  const q=readPresetInputs(),time=$('presetTime').value;
  if(!/^\d\d:\d\d$/.test(time))throw Error('Érvényes időpont szükséges.');
  const meal=$('presetMeal').value,id=currentEdit||uid(),which=currentPreset;
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
 $('bristolWrap').hidden=kind==='urine';$('bodyDialog').showModal();
}
function saveBody(e){
 e.preventDefault();const time=$('bodyTime').value;
 if(!/^\d\d:\d\d$/.test(time)){$('bodyError').textContent='Érvénytelen időpont';return;}
 const rec={id:uid(),kind:bodyKind,date:currentDay(),time,bristol:bodyKind==='stool'?$('bristol').value:'',note:$('bodyNote').value.trim(),createdAt:stamp(),updatedAt:stamp()};
 update(d=>d.body.push(rec));$('bodyDialog').close();success();
}
async function refreshActivity(profile){
 // Same verified source shape as the canonical Activity v191 cloudBundle parser:
 // health-connect.json -> {profile,exportedAt,records:{dailyActivity:[...]}}.
 // Do NOT treat caloriesKcal as active energy: it may represent TOTAL energy.
 const serial=++onload;
 $('activity').textContent='—';$('activitySource').textContent='Nincs ellenőrzött aktívkalória';
 if(!connected())return;
 try{
  const t=await token();
  const p='/HealthHub/profiles/'+profile+'-health-connect.json';
  const r=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',
   headers:{Authorization:'Bearer '+t,'Dropbox-API-Arg':JSON.stringify({path:p})}});
  if(serial!==onload||profile!==active)return;
  if(!r.ok){$('activitySource').textContent='HC adat nem érhető el';return;}
  const raw=await r.json();
  if(serial!==onload||profile!==active)return;
  if(!raw||raw.profile!==profile||!raw.records||!Array.isArray(raw.records.dailyActivity)){
   $('activitySource').textContent='Profil vagy adatforrás eltérés';return;
  }
  const date=currentDay(), row=raw.records.dailyActivity.find(x=>x&&x.date===date);
  if(!row||!Object.prototype.hasOwnProperty.call(row,'activeCaloriesKcal')){
   $('activitySource').textContent='Aktív kcal nincs a HC exportban';return;
  }
  const kcal=num(row.activeCaloriesKcal,0,25000),exportMs=Date.parse(raw.exportedAt||'');
  if(kcal==null||!Number.isFinite(exportMs)||exportMs>Date.now()+300000){
   $('activitySource').textContent='Nem hitelesíthető HC energiaadat';return;
  }
  if(date===localDate()&&Date.now()-exportMs>6*3600000){
   $('activitySource').textContent='HC export régi · szinkron szükséges';return;
  }
  $('activity').textContent=fmt(kcal,0);
  $('activitySource').textContent='aktív kcal · HC · '+new Date(exportMs).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'});
 }catch(_){if(serial===onload&&profile===active)$('activitySource').textContent='Aktivitási forrás jelenleg nem hozzáférhető';}
}
function events(){
 const click=(id,fn)=>$(id).addEventListener('click',fn);
 click('profileBtn',()=>{tone('tap');setProfile(active==='zsolt'?'monika':'zsolt',true)});
 click('soundBtn',()=>{const next=sounds()?'off':'on';localStorage.setItem('hh-nutrition-sound',next);$('soundBtn').textContent=next==='off'?'♪ némítva':'♫ hang';if(next==='on')tone('tap')});
 click('insight7',()=>{insightDays=7;renderInsights();tone('tap')});
 click('insight30',()=>{insightDays=30;renderInsights();tone('tap')});
 click('goalBtn',openGoal);click('morning',()=>openPreset('morning'));click('afternoon',()=>openPreset('afternoon'));
 click('editMorning',()=>openPreset('morning'));click('editAfternoon',()=>openPreset('afternoon'));
 click('addFood',()=>openEntry('food'));click('addDrink',()=>openEntry('drink'));
 click('newFood',()=>{$('customError').textContent='';$('customDialog').showModal()});
 click('customUnit',openUnit);
 click('syncBtn',()=>syncProfile(active));
 click('urineBtn',()=>openBody('urine'));click('stoolBtn',()=>openBody('stool'));click('bodyHistoryBtn',()=>renderBody());
 click('savePreset',savePresetOnly);
 $('foodSearch').addEventListener('input',redrawSelect);
 $('foodSelect').addEventListener('change',()=>{currentFood=$('foodSelect').value;redrawUnits();tone('tap')});
 for(const id of ['quantity','unit'])$(id).addEventListener('change',entryPreview);
 $('quantity').addEventListener('input',entryPreview);
 $('entryTime').addEventListener('change',()=>{$('meal').value=mealForTime($('entryTime').value)});
 DOM.forEach(id=>$(id).addEventListener('input',presetPreview));
 $('entryForm').addEventListener('submit',saveFood);$('presetForm').addEventListener('submit',savePresetEntry);
 $('goalForm').addEventListener('submit',saveGoal);$('customForm').addEventListener('submit',saveCustom);
 $('unitForm').addEventListener('submit',saveUnit);$('bodyForm').addEventListener('submit',saveBody);
 document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.close).close()));
 $('logDate').addEventListener('change',()=>{if(!isDay($('logDate').value))$('logDate').value=localDate();render();refreshActivity(active)});
 window.addEventListener('storage',e=>{if(e.key==='hh-profile'){const desired=pkey();if(desired!==active)setProfile(desired,false)}else if(e.key===LS+active)render();});
}
function start(){
 $('logDate').value=localDate();$('soundBtn').textContent=sounds()?'♫ hang':'♪ némítva';
 events();setProfile(pkey(),false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
