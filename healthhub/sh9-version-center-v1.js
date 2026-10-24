/* SH9 · Central Version & Device Management (V1)
 * Authenticated read-only device status from existing Dropbox Orchestrator.
 * Only validated v401 primary phones count as physical devices.
 * No raw medical data, coordinates, account secrets or silent install actions.
 */
(function(w,d){
'use strict';
const ID='sh9VersionCenterV1',STYLE='sh9VersionCenterV1Style';
const REG='/HealthHub/orchestrator/device-registry-v401.json';
const MODEL=w.SH9_VERSION_MODEL_V1;
if(!MODEL)return;
let state=null,loading=false,interacting=false,lastRead=0,lastGridKey='';
function el(tag,cls,parent,content){const n=d.createElement(tag);if(cls)n.className=cls;
 if(content!==undefined)n.textContent=String(content);if(parent)parent.appendChild(n);return n;}
function date(t){return Number.isFinite(t)?new Date(t).toLocaleString('hu-HU'):'Nincs jelentett adat'}
function label(owner){return owner==='zsolt'?'💙 Zsolt':'🩷 Mónika'}
function style(){
 if(d.getElementById(STYLE))return;
 const s=el('style');s.id=STYLE;
 s.textContent=`
 html[data-hh-inline-admin="yes"] #healthSubContent #${ID}{order:23;min-width:0;padding:15px;border-radius:18px;border:1px solid #629dc498!important;
 background:linear-gradient(145deg,#0c2038,#173b58)!important;color:#eaf5ff!important;
 font:500 12px/1.5 system-ui,sans-serif;box-shadow:0 7px 24px #03132933}
 #${ID} h3{font-size:15px!important;line-height:1.4;color:#f6faff!important;margin:0}
 #${ID} .sh9vmSub{font-size:11px;color:#b3cfe5;margin:5px 0 12px}
 #${ID} .sh9vmGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
 #${ID} .sh9vmCard{min-width:0;padding:11px;border-radius:13px;background:linear-gradient(145deg,#142d49,#213d5c);border:1px solid #6a98b45b}
 #${ID} .sh9vmCard h4{margin:0 0 7px;font-size:13px;color:#f8fbff}
 #${ID} .sh9vmLine{margin:5px 0;font-size:11px;overflow-wrap:anywhere;color:#c7dced}
 #${ID} .sh9vmLine strong{color:#f3bbe9;font-weight:800}
 #${ID} .sh9vmWarn{color:#ffd6ac!important}
 #${ID} .sh9vmOk{color:#9ee8c7!important}
 #${ID} .sh9vmStatus{font-size:11px;color:#d5bbfb;padding:8px 0}
 #${ID} .sh9vmButtons{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
 #${ID} button{cursor:pointer;touch-action:manipulation;min-height:38px;padding:8px 11px;border-radius:10px;border:1px solid #97bfe1!important;background:#194a6b!important;color:#f2f8ff!important;font:700 11px system-ui}
 #${ID} button:disabled{opacity:.5;cursor:default}
 #${ID} button:focus-visible{outline:3px solid #f3bbe9;outline-offset:2px}
 @media(max-width:600px){#${ID} .sh9vmGrid{grid-template-columns:minmax(0,1fr)}}
 `;
 d.head.appendChild(s);
}
function mount(){
 const root=d.getElementById('healthSubContent');
 if(!root||w.healthSectionKind!=='more')return null;
 let box=d.getElementById(ID);
 if(box&&box.parentNode!==root)box=null;
 if(!box){
  lastGridKey=''; // A newly mounted Admin screen must render its cards even if the data snapshot is unchanged.
  style();box=el('section','',root);box.id=ID;box.dataset.hhAdminGroup='cloud';box.style.order='23';
  box.setAttribute('aria-label','SH9 központi verziók és csatlakoztatott eszközök');
  const head=el('div','',box);el('h3','',head,'🐿️ SH9 · Central Version & Device Management');
  el('p','sh9vmSub',head,'Élő eszközjelentések a meglévő HH One Dropbox-regiszterből · csak olvasás és kifejezett OTA CHECK kérés');
  const status=el('p','sh9vmStatus',box,'Eszközverziók ellenőrzésre várnak.');status.id=ID+'Status';
  const grid=el('div','sh9vmGrid',box);grid.id=ID+'Grid';
  const buttons=el('div','sh9vmButtons',box);
  const refresh=el('button','',buttons,'↻ Frissítés');refresh.type='button';
  refresh.addEventListener('click',()=>void refreshNow(true));
  el('p','sh9vmSub',box,'A külön telepített régi SH9 Lite Browser APK nem jelent verziót ebbe a regiszterbe. A webkiadás száma nem igazolja a telefonon cache-elt fájlok verzióját.');
  draw();
 }
 return box;
}
function repair(group,id,parent,labelText){
 const btn=el('button','',parent,labelText);btn.type='button';
 btn.addEventListener('click',()=>{
  const admin=w.HH_ADMIN_MOBILE_V748;
  if(admin&&typeof admin.openTarget==='function')admin.openTarget(group,id);
  else { const status=d.getElementById(ID+'Status');if(status)status.textContent='Nyisd meg az Admin '+(group==='cloud'?'Cloud és AI':'Telefonok és APK')+' csoportját.'; }
 });
 return btn;
}
function line(parent,k,v,cls){
 const p=el('p','sh9vmLine'+(cls?' '+cls:''),parent);
 p.append(d.createTextNode(k+': '));el('strong','',p,v==null?'Nincs adat':v);return p;
}
function draw(){
 const box=d.getElementById(ID);if(!box||!box.isConnected)return;
 const status=d.getElementById(ID+'Status'),grid=d.getElementById(ID+'Grid');
 if(!status||!grid)return;
 status.textContent=loading?'Élő jelentések lekérése…':
  state&&state.feedback?state.feedback:
  state&&state.error?'⚠ '+state.error:
  state?'Legutóbbi központi lekérés: '+date(state.readAt):
  'A verzióközpont a Dropbox-kapcsolat ellenőrzésére vár.';
 if(!state)return;
 const result=state.model;
 const gridKey=JSON.stringify({model:result,error:state.error,verified:state.registryVerified});
 if(gridKey===lastGridKey)return; // Keep cards, focus and scroll stable during background polling.
 lastGridKey=gridKey;
 grid.replaceChildren();
 if(!state.registryVerified){
  const cloudActions=el('div','sh9vmButtons',grid);
  repair('cloud','hhUnifiedCloudVaultCard',cloudActions,'☁️ Dropbox kapcsolat javítása');
 }
 const general=el('article','sh9vmCard',grid);el('h4','',general,'🌐 Központi kiadások');
 line(general,'SH9 webes kiadás',result.webRelease?result.webRelease.version:'Nincs hiteles verziójelző');
 line(general,'Jóváhagyott OTA',result.release?'HH One '+result.release.version+' · build '+result.release.versionCode:'Nincs ellenőrzött aláírt kiadási leíró');
 line(general,'SH9 önálló régi APK','Nem követhető · nincs saját eszközjelentés','sh9vmWarn');
 line(general,'Webszinkron','Az aktuális nyilvános kiadás, nem az eszköz betöltött verziója');
 for(const device of result.devices){
  const card=el('article','sh9vmCard',grid);
  el('h4','',card,label(device.owner)+' · '+(device.registered?device.name:
    state.registryVerified?'Nincs ellenőrzött fő telefon':'Telefonkijelölés nem ellenőrizhető'));
  if(!device.registered){
   line(card,'Státusz',state.registryVerified?'Nincs egyező ellenőrzött Android-jelentés':
     'A Dropbox-regiszter nem olvasható. A korábbi kijelölés ettől még megmaradhat.','sh9vmWarn');
   const actions=el('div','sh9vmButtons',card);
   repair(state.registryVerified?'devices':'cloud',
     state.registryVerified?'hhDeviceRegistry401':'hhUnifiedCloudVaultCard',actions,
     state.registryVerified?'📱 Telefon regisztrációjának javítása':'☁️ Dropbox újracsatlakoztatása');
   continue;
  }
  line(card,'Azonosító vége',device.deviceId);
  line(card,'Kapcsolat',device.connectivity==='recent'?'Friss (20 percen belüli)':
    device.connectivity==='stale'?'Korábbi, nem élő jelentés':'Nem áll rendelkezésre',device.connectivity==='recent'?'sh9vmOk':'sh9vmWarn');
  line(card,'Utolsó jelentkezés',date(device.lastSeenAt));
  line(card,'Telepített HH One APK',device.installed?'v'+device.installed.version+' · build '+device.installed.buildCode:'Nem jelentett');
  line(card,'Beépített SH9',device.sh9==='unified'?'A közös APK része (build 27+)':
    device.sh9==='legacy-no-integrated-sh9'?'A jelentett HH One verzióban még nincs SH9':'Ismeretlen');
  line(card,'OTA-állapot',
    device.ota==='approved-update'?'Jóváhagyott frissítés: v'+device.approvedVersion:
    device.ota==='up-to-date'?'Nincs újabb jóváhagyott OTA':
    device.ota==='not-in-rollout'?'Újabb kiadás van, erre a profilra nincs engedélyezve':
    'Nem ellenőrizhető',device.ota==='approved-update'?'sh9vmOk':'');
  line(card,'Telefon által jelentett OTA-jelölt',device.otaCandidate||'Nincs jelentés');
  line(card,'Utolsó OTA ellenőrzés',date(device.otaLastCheckedAt));
  if(device.otaError)line(card,'OTA-hiba',device.otaError,'sh9vmWarn');
  line(card,'Utolsó parancs',device.command);
  const actions=el('div','sh9vmButtons',card);
  if(device.connectivity!=='recent')repair('devices','hhDeviceRegistry401',actions,'🔧 Telefonkapcsolat ellenőrzése');
  const check=el('button','',actions,'📦 OTA CHECK · '+(device.owner==='zsolt'?'Zsolt':'Mónika'));
  check.type='button';check.disabled=!device.canRequestCheck||loading||interacting;
  check.title='Csak új verzió ellenőrzése az adott telefonon, nem telepítés';
  check.addEventListener('click',()=>void dispatch(device.owner));
 }
}
async function json(url){
 const r=await w.fetch(url,{cache:'no-store',credentials:'omit'});
 if(!r.ok)throw Error('Kiadási leíró HTTP '+r.status);
 return await r.json();
}
async function refreshNow(force){
 const box=mount();if(!box||loading||interacting)return;
 if(!force&&Date.now()-lastRead<90000)return;
 loading=true;
 try{
  const v=w.HH_DROPBOX_VAULT;
  if(!v||!v.connected||!v.connected()||typeof v.downloadJson!=='function'||
     typeof w.hhOrchestratorDevices305!=='function'){
   const published=await Promise.allSettled([json('./data/bridge-ota.json'),json('../sh9/version.json')]);
   const pub=i=>published[i].status==='fulfilled'?published[i].value:null;
   state={readAt:Date.now(),registryVerified:false,error:'A Dropbox Vault vagy az Orchestrator nincs csatlakoztatva. A telefonok telepített verziója nem ellenőrizhető.',
     model:MODEL.read(null,[],pub(0),pub(1),Date.now())};return;
  }
  const results=await Promise.allSettled([
   v.downloadJson(REG),w.hhOrchestratorDevices305(),
   json('./data/bridge-ota.json'),json('../sh9/version.json')
  ]);
  const val=i=>results[i].status==='fulfilled'?results[i].value:null;
  const failed=results.map((x,i)=>x.status==='rejected'?['regiszter','eszközök','OTA leíró','webverzió'][i]:null).filter(Boolean);
  const reg=val(0);
  const registryVerified=!!(reg&&reg.schema==='healthhub.device_registry/1'&&reg.activePhones&&Array.isArray(reg.archived));
  state={readAt:Date.now(),registryVerified,feedback:'',error:failed.length?'Nem ellenőrizhető: '+failed.join(', '):'',
    model:MODEL.read(val(0),val(1),val(2),val(3),Date.now())};
  lastRead=Date.now();
 }catch(e){state={readAt:Date.now(),registryVerified:false,error:'Verzióközpont hiba: '+String(e&&e.message||e).slice(0,120),
  model:MODEL.read(null,[],null,null,Date.now())};}
 finally{lastRead=Date.now();loading=false;draw();}
}
async function dispatch(owner){
 if(interacting||loading||!state||!['zsolt','monika'].includes(owner))return;
 const v=state.model.devices.find(d=>d.owner===owner);
 if(!v||!v.registered||!v.canRequestCheck)return;
 const r=state.model; // Never infer an arbitrary device from a model or name.
 if(!w.confirm('OTA-ellenőrzést kérsz '+(owner==='zsolt'?'Zsolt':'Mónika')+' kijelölt telefonján? Ez NEM telepítés.'))return;
 interacting=true;draw();
 try{
  const vault=w.HH_DROPBOX_VAULT,reg=await vault.downloadJson(REG),
    all=await w.hhOrchestratorDevices305();
  const id=reg&&reg.activePhones&&reg.activePhones[owner];
  const valid=Array.isArray(reg&&reg.archived)&&id&&!reg.archived.includes(id)&&
    all.find(x=>x&&x.deviceId===id&&x.deviceType==='android'&&x.activeProfile===owner&&
      Number(x.buildCode)>=20&&Array.isArray(x.capabilities)&&x.capabilities.includes('ota'));
  if(!valid)throw Error('A céltelefon nem egyezik a frissített regiszterrel.');
  const answer=await w.hhOrchestratorDispatchScope355(owner,id,'ota');
  const status=d.getElementById(ID+'Status');
  state.feedback='✓ OTA CHECK kérés sorba állítva: '+String(answer.commandId||'')+'. Nem jelenti a frissítés végrehajtását.';
 }catch(e){state.feedback='⚠ Nem sikerült: '+String(e&&e.message||e).slice(0,160)}
 finally{interacting=false;draw();w.setTimeout(()=>void refreshNow(true),3000)}
}
function tick(){
 const panel=mount();
 if(!panel||d.visibilityState!=='visible')return;
 if(!state||Date.now()-lastRead>120000)void refreshNow(false);
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
w.setInterval(tick,2200);
w.addEventListener('focus',tick);
w.addEventListener('healthhub:device-registry-updated',()=>void refreshNow(true));
w.SH9_VERSION_CENTER_V1={refresh:()=>refreshNow(true),getSnapshot:()=>state&&state.model};
})(window,document);
