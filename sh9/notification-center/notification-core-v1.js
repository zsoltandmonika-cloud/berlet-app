/* SHO Notification Core v1
 * Extensible on-device registry and inbox. No health telemetry, backend, push, GPS or permissions.
 * Health-sensitive types are definitions ONLY until an authenticated backend transport is available.
 */
(function(w){
'use strict';
if(w.SHO_NOTIFICATION_CORE_V1)return;
const PREFIX='sho-notification-v1:',MANIFESTS=PREFIX+'modules',PROFILE_KEY='hh-profile';
const builtin=[
 {id:'healthhub',name:{hu:'HealthHub',en:'HealthHub'},icon:'heart-pulse',events:[
  {key:'pulse_high',group:{hu:'Szív és keringés',en:'Heart and circulation'},name:{hu:'Magas pulzus',en:'High heart rate'},sensitive:true,settings:[{key:'threshold',kind:'number',min:40,max:220,default:120,unit:'bpm'}]},
  {key:'oxygen_low',group:{hu:'Szív és keringés',en:'Heart and circulation'},name:{hu:'Alacsony véroxigén',en:'Low blood oxygen'},sensitive:true,settings:[{key:'threshold',kind:'number',min:80,max:100,default:92,unit:'%'}]},
  {key:'medicine',group:{hu:'Gyógyszerek',en:'Medications'},name:{hu:'Gyógyszerbevétel',en:'Medication reminder'},sensitive:true},
  {key:'doctor',group:{hu:'Időpontok',en:'Appointments'},name:{hu:'Orvosi időpont',en:'Doctor appointment'},sensitive:true,settings:[{key:'leadMinutes',kind:'select',options:[15,30,60,1440],default:60,unit:'perc'}]},
  {key:'nutrition',group:{hu:'Táplálkozás',en:'Nutrition'},name:{hu:'Napi célok',en:'Daily nutrition goals'},sensitive:true}
 ]},
 {id:'sleep',name:{hu:'Alvás',en:'Sleep'},icon:'moon',events:[
  {key:'short_sleep',group:{hu:'Alvásminőség',en:'Sleep quality'},name:{hu:'Kevés alvás',en:'Insufficient sleep'},sensitive:true,settings:[{key:'threshold',kind:'number',min:3,max:12,default:6,unit:'óra'}]},
  {key:'bedtime',group:{hu:'Emlékeztetők',en:'Reminders'},name:{hu:'Lefekvési emlékeztető',en:'Bedtime reminder'},sensitive:true}
 ]},
 {id:'sportcentral',name:{hu:'SportCentral',en:'SportCentral'},icon:'trophy',events:[
  {key:'match_start',group:{hu:'Mérkőzések',en:'Matches'},name:{hu:'Kedvenc csapat mérkőzése',en:'Favorite team match'},settings:[{key:'leadMinutes',kind:'select',options:[5,15,30,60],default:15,unit:'perc'}]},
  {key:'schedule_change',group:{hu:'Időpontváltozások',en:'Schedule changes'},name:{hu:'Mérkőzés időpontja megváltozott',en:'Match schedule changed'}},
  {key:'broadcast',group:{hu:'Közvetítések',en:'Broadcasts'},name:{hu:'TV-közvetítés kezdete',en:'Broadcast starting'},settings:[{key:'leadMinutes',kind:'select',options:[5,15,30],default:15,unit:'perc'}]},
  {key:'result',group:{hu:'Mérkőzések',en:'Matches'},name:{hu:'Végeredmény',en:'Final result'}},
  {key:'tickets',group:{hu:'Jegyek',en:'Tickets'},name:{hu:'Jegyek elérhetők',en:'Tickets available'}}
 ]},
 {id:'smarttrip',name:{hu:'Smart Trip AI',en:'Smart Trip AI'},icon:'train-front',events:[
  {key:'departure',group:{hu:'Utazás',en:'Travel'},name:{hu:'Közelgő indulás',en:'Upcoming departure'},settings:[{key:'leadMinutes',kind:'select',options:[15,30,60,120],default:30,unit:'perc'}]},
  {key:'transfer',group:{hu:'Csatlakozás',en:'Transfers'},name:{hu:'Átszállás közeledik',en:'Upcoming transfer'}},
  {key:'change',group:{hu:'Forgalom',en:'Disruptions'},name:{hu:'Menetrendi változás',en:'Schedule change'}}
 ]},
 {id:'tasks',name:{hu:'Feladatok',en:'Tasks'},icon:'list-checks',events:[
  {key:'new',group:{hu:'Családi feladatok',en:'Family tasks'},name:{hu:'Új feladat érkezett',en:'New task received'}},
  {key:'due',group:{hu:'Határidők',en:'Deadlines'},name:{hu:'Feladat határideje',en:'Task due soon'},settings:[{key:'leadMinutes',kind:'select',options:[15,60,1440],default:60,unit:'perc'}]},
  {key:'completed',group:{hu:'Családi feladatok',en:'Family tasks'},name:{hu:'Feladat teljesítve',en:'Task completed'}}
 ]},
 {id:'wallet',name:{hu:'Smart Valet',en:'Smart Valet'},icon:'wallet',events:[
  {key:'pass_expiry',group:{hu:'Bérletek',en:'Passes'},name:{hu:'Bérlet lejárata',en:'Pass expiry'},settings:[{key:'leadMinutes',kind:'select',options:[1440,4320,10080],default:1440,unit:'perc'}]},
  {key:'document_expiry',group:{hu:'Dokumentumok',en:'Documents'},name:{hu:'Dokumentum lejárata',en:'Document expiry'}}
 ]},
 {id:'familyguard',name:{hu:'Family Guard',en:'Family Guard'},icon:'shield-check',events:[
  {key:'arrival',group:{hu:'Helyzetek',en:'Locations'},name:{hu:'Megérkezés · Place Alert',en:'Arrival · Place Alert'}},
  {key:'departure',group:{hu:'Helyzetek',en:'Locations'},name:{hu:'Távozás · Place Alert',en:'Departure · Place Alert'}},
  {key:'battery_low',group:{hu:'Eszközök',en:'Devices'},name:{hu:'Alacsony akkumulátor',en:'Low battery'}}
 ]}
];
const memory={}; // Only fallback for blocked localStorage; no secret keys.
function rawGet(k){try{return w.localStorage?.getItem(k)||null}catch(_){return memory[k]||null}}
function rawSet(k,value){try{if(w.localStorage){w.localStorage.setItem(k,value);return true}}catch(_){}memory[k]=value;return false}
function read(k,fallback){try{const v=JSON.parse(rawGet(k));return v===null?fallback:v}catch(_){return fallback}}
function set(k,value){rawSet(k,JSON.stringify(value));signal()}
function profile(value){return value==='m'||value==='monika'?'m':value==='z'||value==='zsolt'?'z':rawGet(PROFILE_KEY)==='m'?'m':'z'}
function cleanLabel(value,limit=120){return String(value??'').replace(/[<>]/g,'').slice(0,limit)}
function cleanLocalized(v,limit=120){return {hu:cleanLabel(typeof v==='string'?v:v?.hu||'',limit),en:cleanLabel(typeof v==='string'?v:v?.en||v?.hu||'',limit)}}
function validateManifest(input){
 if(!input||!/^[a-z][a-z0-9_-]{1,35}$/.test(input.id)||!Array.isArray(input.events)||input.events.length>40||!input.events.length)return null;
 const events=[],keys=new Set();
 for(const e of input.events){
  if(!e||!/^[a-z][a-z0-9_]{1,39}$/.test(e.key)||keys.has(e.key))return null;
  keys.add(e.key);
  const settings=(Array.isArray(e.settings)?e.settings:[]).slice(0,6).map(s=>{
   if(!s||!['threshold','leadMinutes'].includes(s.key)||!['number','select'].includes(s.kind))return null;
   const def=Number(s.default);
   if(!Number.isFinite(def))return null;
   if(s.kind==='number'){
    const min=Number(s.min),max=Number(s.max);
    if(!Number.isFinite(min)||!Number.isFinite(max)||min>=max||def<min||def>max)return null;
    return {key:s.key,kind:'number',min,max,default:def,unit:cleanLabel(s.unit,12)};
   }
   const options=(Array.isArray(s.options)?s.options:[]).map(Number).filter(Number.isFinite).slice(0,20);
   if(!options.length||!options.includes(def))return null;
   return {key:s.key,kind:'select',options,default:def,unit:cleanLabel(s.unit,12)};
  });
  if(settings.some(x=>!x))return null;
  events.push({key:e.key,group:cleanLocalized(e.group||'Általános'),name:cleanLocalized(e.name||e.key),sensitive:e.sensitive===true,settings});
 }
 return {id:input.id,name:cleanLocalized(input.name||input.id),icon:cleanLabel(input.icon||'bell',32),events};
}
const registry=new Map();
for(const m of builtin)registry.set(m.id,validateManifest(m));
for(const m of (Array.isArray(read(MANIFESTS,[]))?read(MANIFESTS,[]):[]).slice(0,30)){
 const safe=validateManifest(m);
 if(safe&&!registry.has(safe.id))registry.set(safe.id,safe);
}
function defs(){return Array.from(registry.values()).flatMap(m=>m.events.map(e=>({...e,id:m.id+'.'+e.key,moduleId:m.id,moduleName:m.name,icon:m.icon})))}
function moduleList(){return Array.from(registry.values()).map(m=>({id:m.id,name:m.name,icon:m.icon,count:m.events.length}))}
function getDefinition(id){return defs().find(x=>x.id===id)||null}
function registerModule(manifest){
 const m=validateManifest(manifest);
 if(!m||builtin.some(x=>x.id===m.id))return false;
 if(!registry.has(m.id)&&registry.size>=35)return false;
 registry.set(m.id,m);
 rawSet(MANIFESTS,JSON.stringify(Array.from(registry.values()).filter(x=>!builtin.some(b=>b.id===x.id))));
 signal();return true;
}
function soundKey(p){return PREFIX+'chime-enabled:'+profile(p)}
function soundEnabled(p){return rawGet(soundKey(p))!=='false'}
function setSoundEnabled(p,on){if(typeof on!=='boolean')return false;rawSet(soundKey(p),String(on));signal();return true}
function prefKey(p){return PREFIX+'preferences:'+profile(p)}
function inboxKey(p){return PREFIX+'inbox:'+profile(p)}
function ackKey(p){return PREFIX+'last-open:'+profile(p)}
function preferences(p){const saved=read(prefKey(p),{});return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{}}
function preference(p,type){
 const def=getDefinition(type);if(!def)return null;
 const saved=preferences(p)[type]||{},fields={};
 for(const item of def.settings)fields[item.key]=Number.isFinite(Number(saved[item.key]))?Number(saved[item.key]):item.default;
 return {enabled:typeof saved.enabled==='boolean'?saved.enabled:true,...fields};
}
function updatePreference(p,type,patch){
 const def=getDefinition(type);if(!def||!patch||typeof patch!=='object')return false;
 const old=preferences(p),value=preference(p,type);
 if(typeof patch.enabled==='boolean')value.enabled=patch.enabled;
 for(const field of def.settings)if(Object.prototype.hasOwnProperty.call(patch,field.key)){
  const n=Number(patch[field.key]);
  if(!Number.isFinite(n)||field.kind==='number'&&(n<field.min||n>field.max)||field.kind==='select'&&!field.options.includes(n))return false;
  value[field.key]=n;
 }
 old[type]=value;set(prefKey(p),old);return true;
}
function inbox(p){const value=read(inboxKey(p),[]);return Array.isArray(value)?value.filter(x=>x&&typeof x==='object').slice(0,100):[]}
function all(p){return inbox(p).sort((a,b)=>b.createdAt-a.createdAt)}
function state(p){
 const items=all(p),unread=items.filter(x=>!x.readAt),ack=Number(rawGet(ackKey(p)))||0;
 return {unread:unread.length,attention:unread.filter(x=>x.createdAt>ack).length,total:items.length};
}
function signal(){try{w.dispatchEvent(new CustomEvent('sho:notifications-changed'))}catch(_){}}
function safeHref(target){
 if(!target)return '';
 try{
  const url=new URL(String(target),w.location.href);
  return url.origin===w.location.origin&&url.pathname.startsWith('/berlet-app/')?url.pathname+url.search+url.hash:'';
 }catch(_){return ''}
}

/* Golden Standard routes: matching module and trusted same-origin target only. */
const MODULE_TARGETS=Object.freeze({
 healthhub:'/berlet-app/healthhub/',
 sleep:'/berlet-app/healthhub/?sho=sleep',
 sportcentral:'/berlet-app/sh9/sport/',
 smarttrip:'/berlet-app/sh9/smart-travel/',
 tasks:'/berlet-app/sh9/family-hub/',
 wallet:'/berlet-app/sh9/?sho=wallet',
 familyguard:'/berlet-app/healthhub/guardian/'
});
function moduleTarget(type){
 const def=getDefinition(type);
 return def?MODULE_TARGETS[def.moduleId]||'':'';
}
function ownedTarget(moduleId,url){
 const path=url.pathname;
 switch(moduleId){
  case 'healthhub':return path.startsWith('/berlet-app/healthhub/')&&!path.startsWith('/berlet-app/healthhub/guardian/');
  case 'sleep':return (path==='/berlet-app/healthhub/'||path==='/berlet-app/healthhub/index.html')&&url.searchParams.get('sho')==='sleep';
  case 'sportcentral':return path.startsWith('/berlet-app/sh9/sport/');
  case 'smarttrip':return path.startsWith('/berlet-app/sh9/smart-travel/');
  case 'tasks':return path.startsWith('/berlet-app/sh9/family-hub/');
  case 'familyguard':return path.startsWith('/berlet-app/healthhub/guardian/');
  case 'wallet':return (path==='/berlet-app/sh9/'||path==='/berlet-app/sh9/index.html')&&url.searchParams.get('sho')==='wallet';
  default:return false;
 }
}
function resolveTarget(entry){
 const def=getDefinition(entry?.type);
 if(!def)return '';
 const fallback=MODULE_TARGETS[def.moduleId]||'';
 const href=safeHref(entry.targetUrl);
 if(!href)return fallback;
 try{return ownedTarget(def.moduleId,new URL(href,w.location.origin))?href:fallback}
 catch(_){return fallback}
}
function taskTarget(payload,def){
 if(def.moduleId!=='tasks'||typeof payload.taskId!=='string')return '';
 const id=payload.taskId;
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)?
  MODULE_TARGETS.tasks+'?task='+encodeURIComponent(id):'';
}

function publish(payload){
 if(!payload||!getDefinition(payload.type))return null;
 const def=getDefinition(payload.type),p=profile(payload.profile);
 // Private medical events must never be copied into shared on-device browser storage.
 if(def.sensitive||preference(p,payload.type).enabled===false)return null;
 const items=inbox(p),now=Date.now(),dedupe=cleanLabel(payload.dedupeKey,80);
 if(dedupe&&items.some(x=>x.dedupeKey===dedupe&&now-x.createdAt<12*60*60*1000))return null;
 const item={id:'sho-'+now+'-'+Math.random().toString(36).slice(2,9),profile:p,type:payload.type,
  title:cleanLabel(payload.title||def.name.hu),message:cleanLabel(payload.message,320),
  createdAt:now,readAt:0,targetUrl:safeHref(payload.targetUrl||taskTarget(payload,def)),dedupeKey:dedupe,demo:payload.demo===true};
 set(inboxKey(p),[item,...items].slice(0,80));
 // Only a NEW successfully accepted event can trigger a sound. No replay on load.
 try{w.dispatchEvent(new CustomEvent('sho:notification-received',{detail:{profile:p,id:item.id,type:item.type}}))}catch(_){}
 return item;
}
function markRead(p,id){
 const items=inbox(p);const item=items.find(x=>x.id===id);
 if(!item||item.readAt)return false;
 item.readAt=Date.now();set(inboxKey(p),items);return true;
}
function markAllRead(p){
 const items=inbox(p),now=Date.now();
 for(const item of items)if(!item.readAt)item.readAt=now;
 set(inboxKey(p),items);return true;
}
function removeNotification(p,id){
 if(typeof id!=='string'||!id)return false;
 const before=inbox(p),after=before.filter(item=>item.id!==id);
 if(after.length===before.length)return false;
 set(inboxKey(p),after);return true;
}
function clearRead(p){
 const before=inbox(p),after=before.filter(item=>!item.readAt);
 if(after.length===before.length)return 0;
 set(inboxKey(p),after);return before.length-after.length;
}
function clearAll(p){
 const before=inbox(p),count=before.length;
 if(count)set(inboxKey(p),[]);
 return count;
}
function acknowledge(p){rawSet(ackKey(p),String(Date.now()));signal()}
w.SHO_NOTIFICATION_CORE_V1=Object.freeze({version:1,profile,definitions:defs,modules:moduleList,registerModule,preference,updatePreference,
 list:all,state,publish,markRead,markAllRead,removeNotification,clearRead,clearAll,acknowledge,safeHref,moduleTarget,resolveTarget,soundEnabled,setSoundEnabled});
w.addEventListener?.('storage',e=>{if(e.key?.startsWith(PREFIX)||e.key===PROFILE_KEY)signal()});
})(window);
