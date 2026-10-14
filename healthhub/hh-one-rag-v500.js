(function(root){
'use strict';
/* HH One v500. Technical connectivity only. Never claim a data-source
   success from a heartbeat or a queued command. Read authenticated Vault
   metadata; do not copy health or app-use content to this UI. */
var ID='hhOneRag500',PANEL='hhOneService500',STYLE='hhOneStyle500';
var REG='/HealthHub/orchestrator/device-registry-v401.json';
var ttl=20*60*1000, refreshEvery=120000;
var state={color:'amber',message:'Ellenőrzésre vár',devices:[],registry:null,connected:false,error:''};
var reading=false,sending=false,lastRead=0,timer=null,initialized=false;
function $id(n){return document.getElementById(n)}
function safeText(s){return String(s==null?'':s)}
function isoAge(s){var ms=Date.parse(s||'');return Number.isFinite(ms)?Date.now()-ms:Infinity}
function dt(s){var ms=Date.parse(s||'');return Number.isFinite(ms)?new Date(ms).toLocaleString('hu-HU'):'Nincs adat'}
function idValid(s){return typeof s==='string'&&/^[A-Za-z0-9-]{1,90}$/.test(s)}
function vault(){return root.HH_DROPBOX_VAULT||null}
function connected(){try{var v=vault();return !!(v&&v.connected&&v.connected()&&typeof v.downloadJson==='function')}catch(_){return false}}
function isMain(){return typeof root.hhOrchestratorDevices305==='function'&&typeof root.hhOrchestratorDispatchScope355==='function'}
function classify(reg,devices,cloud){
 if(!cloud)return {color:'red',message:'Felhő nem elérhető',primary:[]};
 if(!reg||reg.schema!=='healthhub.device_registry/1'||!reg.activePhones||
    !Array.isArray(reg.archived))return {color:'amber',message:'Regiszter nem ellenőrizhető',primary:[]};
 var ids=['zsolt','monika'].map(function(p){return reg.activePhones[p]});
 if(ids.some(function(id){return !idValid(id)})||ids[0]===ids[1]){
  return {color:'amber',message:'Telefonok kijelölése szükséges',primary:[]};
 }
 var matches=['zsolt','monika'].map(function(p){
  return (devices||[]).find(function(d){return d&&d.deviceType==='android'&&
   d.activeProfile===p&&d.deviceId===reg.activePhones[p]&&
   !reg.archived.includes(d.deviceId)});
 });
 var count=matches.filter(Boolean).length;
 var fresh=matches.filter(function(d){return d&&isoAge(d.lastSeenAt)<=ttl}).length;
 var failures=matches.some(function(d){return d&&d.status&&['failed','partial','rejected'].includes(d.status.state)&&
   isoAge(d.status.updatedAt)<=24*60*60*1000});
 var inProgress=matches.some(function(d){return d&&d.status&&['pending','running','queued'].includes(d.status.state)&&
   isoAge(d.status.updatedAt)<=24*60*60*1000});
 if(count===2&&fresh===2&&!failures&&!inProgress)return {color:'green',message:'Mindkét telefon jelentkezett',primary:matches};
 if(count===0)return {color:'red',message:'Nincs ellenőrzött telefon',primary:matches};
 return {color:'amber',message:count===2?'Részleges vagy régi kapcsolat':'Egy telefon hiányzik',primary:matches};
}
function elt(t,cls,parent){var e=document.createElement(t);if(cls)e.className=cls;if(parent)parent.appendChild(e);return e}
function txt(t,value,parent,cls){var e=elt(t,cls,parent);e.textContent=safeText(value);return e}
function styles(){
 if($id(STYLE))return;
 var s=elt('style');s.id=STYLE;s.textContent=
 '#'+ID+'{position:fixed!important;right:10px!important;bottom:calc(71px + env(safe-area-inset-bottom))!important;z-index:1200!important;min-height:34px;display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #74829a;border-radius:19px;background:#172c46f0;color:#f8ffff;font:800 10px/1.1 system-ui,sans-serif;letter-spacing:.02em;box-shadow:0 4px 16px #06182e5c;touch-action:manipulation;cursor:pointer}'+
 '#'+ID+' .hhDot{width:10px;height:10px;display:inline-block;border-radius:50%;background:#b6b6bf;box-shadow:0 0 9px #b6b6bf77}'+
 '#'+ID+'[data-rag="green"] .hhDot{background:#47df9a;box-shadow:0 0 10px #47df9a}'+
 '#'+ID+'[data-rag="amber"] .hhDot{background:#ffd074;box-shadow:0 0 10px #ffd074}'+
 '#'+ID+'[data-rag="red"] .hhDot{background:#ff8087;box-shadow:0 0 10px #ff8087}'+
 '#'+PANEL+'{position:fixed!important;inset:0!important;z-index:2200!important;display:none;align-items:flex-end;justify-content:center;background:#0a192daa;font-family:system-ui,sans-serif;color:#17364c}'+
 '#'+PANEL+'[data-open="1"]{display:flex}'+
 '#'+PANEL+' .hhSheet{width:min(100%,500px);max-height:80dvh;overflow:auto;background:#f8fcff;border:1px solid #b6cbdc;border-radius:20px 20px 0 0;box-shadow:0 0 35px #0006;padding:17px 14px calc(20px + env(safe-area-inset-bottom))}'+
 '#'+PANEL+' h2{font-size:17px!important;color:#17364c!important;margin:0 0 6px!important}'+
 '#'+PANEL+' p{font:400 12px/1.55 system-ui,sans-serif;color:#57718a;margin:8px 0}'+
 '#'+PANEL+' .hhTop{display:flex;justify-content:space-between;gap:9px;align-items:start}'+
 '#'+PANEL+' button,#'+PANEL+' a.hhAction{padding:10px 12px;border-radius:11px;border:1px solid #a8bdcf;background:white;color:#204d72;cursor:pointer;text-decoration:none;font:800 12px system-ui,sans-serif}'+
 '#'+PANEL+' .hhAction{display:inline-block;background:#1e5b86!important;color:white!important}'+
 '#'+PANEL+' button:disabled{opacity:.5;cursor:default}'+
 '#'+PANEL+' .hhLine{background:white;border:1px solid #d8e5ec;border-radius:12px;padding:11px;margin:9px 0}'+
 '#'+PANEL+' .hhLine strong{display:block;font:850 13px system-ui,sans-serif;color:#193c5b}'+
 '#'+PANEL+' .hhLine small{display:block;font:400 11px/1.5 system-ui,sans-serif;color:#60788f;margin-top:3px}'+
 '#'+PANEL+' .hhWarning{color:#8c5433!important}'+
 '#'+PANEL+' .hhActions{display:flex;flex-wrap:wrap;gap:8px;margin:11px 0}'+
 '#'+PANEL+' .hhFeedback{font-weight:750;color:#295c7d;white-space:pre-wrap;overflow-wrap:anywhere}';
 document.head.appendChild(s);
}
function updateBadge(){
 var b=$id(ID);if(!b)return;
 b.dataset.rag=state.color;
 b.title='HH One · '+state.message+' · Részletek és központi szinkron';
 b.setAttribute('aria-label','HH One kapcsolat: '+state.message+'. Megnyitás');
}
function openPanel(){var p=$id(PANEL);if(!p)return;p.dataset.open='1';$id('hhOneClose500').focus();renderPanel();if(isMain())refresh(true)}
function closePanel(){var p=$id(PANEL);if(!p)return;p.dataset.open='0';$id(ID).focus()}
function renderPanel(){
 var area=$id('hhOneBody500');if(!area)return;
 area.replaceChildren();
 txt('p','HH One · Központi eszközkapcsolat és Léna Service Center. A RAG kizárólag a friss kapcsolati jeleket mutatja, NEM igazolja az egészségügyi adatok szinkronját.',area);
 txt('p','Állapot: '+state.message,area,state.color==='red'?'hhWarning':'');
 if(state.error)txt('p','Ellenőrzési hiba: '+state.error,area,'hhWarning');
 if(!isMain()){
  txt('p','A különálló Digital Health oldal nem tárol felhő-tokeneket. Élő állapotellenőrzés és központi parancs csak a HealthHub hitelesített főoldalán végezhető.',area);
  var dest=elt('a','hhAction',area);dest.href='../index.html?hhone=service';dest.textContent='Megnyitás a HealthHubban';
  return;
 }
 ['zsolt','monika'].forEach(function(p,i){
  var d=state.registry&&state.registry.activePhones&&state.devices.find(function(x){
   return x.deviceType==='android'&&x.deviceId===state.registry.activePhones[p]&&x.activeProfile===p&&
    !state.registry.archived.includes(x.deviceId)});
  var line=elt('div','hhLine',area);
  txt('strong',(p==='zsolt'?'💙 Zsolt':'🩷 Mónika')+' · '+(d?safeText(d.name||'Android'):'Nincs kiválasztott telefon'),line);
  if(d){
   txt('small','Utolsó jelentkezés: '+dt(d.lastSeenAt),line);
   txt('small','Utolsó tényleges Health Connect-feltöltés: '+dt(d.lastHealthSyncAt),line);
   txt('small','Parancs: '+safeText(d.status&&d.status.state||'Nincs visszaigazolás')+
    ' · '+dt(d.status&&d.status.updatedAt),line);
   if(d.lastHealthError)txt('small','Health hiba: '+safeText(d.lastHealthError).slice(0,180),line);
  }else txt('small','A v401 eszközregiszterben kell kijelölni az eredeti fizikai telefont.',line);
 });
 var actions=elt('div','hhActions',area);
 var refreshButton=elt('button','',actions);refreshButton.type='button';refreshButton.textContent=reading?'Ellenőrzés…':'↻ Friss állapot';refreshButton.disabled=reading;
 refreshButton.addEventListener('click',function(){refresh(true)});
 var syncButton=elt('button','hhAction',actions);syncButton.type='button';
 syncButton.textContent='↻ Health + Activity SYNC · kijelölt telefonok';
 var r=state.registry,selected=Array.isArray(r&&r.archived)?classify(r,state.devices,state.connected).primary:[];
 syncButton.disabled=reading||sending||!state.connected||selected.length!==2||selected.some(function(d){return !d});
 syncButton.addEventListener('click',sendSync);
 txt('p','A SYNC kérést a regisztrált telefonok sorába helyezi. Az offline készülék később reagálhat. A jelenlegi Connect NEM tudja még a Digital Wellbeing gyűjtését távolról indítani; a Sleep és egyéb adatfrissességet külön kell ellenőrizni.',area);
 var f=txt('p',state.feedback||'',area,'hhFeedback');f.id='hhOneFeedback500';
}
async function refresh(force){
 if(!isMain()){state={color:'amber',message:'Megnyitás a központban',devices:[],registry:null,connected:false,error:''};updateBadge();if($id(PANEL)?.dataset.open==='1')renderPanel();return}
 if(reading||(!force&&Date.now()-lastRead<refreshEvery))return;
 reading=true;lastRead=Date.now();
 try{
  if(!connected()){
   state={color:'red',message:'Dropbox Vault nincs csatlakoztatva',devices:[],registry:null,connected:false,error:''};
  }else{
   var v=vault(),data=await Promise.all([v.downloadJson(REG),root.hhOrchestratorDevices305()]);
   var reg=data[0],devices=data[1];
   var c=classify(reg,devices,true);
   state={color:c.color,message:c.message,registry:reg,devices:devices,connected:true,error:'',feedback:state.feedback||''};
  }
 }catch(e){
  state={color:'amber',message:'Kapcsolat nem ellenőrizhető',devices:[],registry:null,connected:connected(),error:safeText(e&&e.message||e).slice(0,170)};
 }finally{reading=false;updateBadge();if($id(PANEL)?.dataset.open==='1')renderPanel()}
}
async function sendSync(){
 if(sending||!isMain())return;
 try{
  await refresh(true);
  if(!state.connected)throw Error('Dropbox Vault nem elérhető.');
  var c=classify(state.registry,state.devices,true),phones=c.primary||[];
  if(phones.length!==2||phones.some(function(x){return !x}))
   throw Error('A két fizikai telefon nincs egyértelműen kijelölve. Nyisd meg Admin → Eszközregiszter v401.');
  if(!root.confirm('Health + Activity sync kérést küldünk Zsolt és Mónika kijelölt telefonjára. A parancs várakozhat; ez NEM az összes HH One modul szinkronja. Folytatod?'))return;
  sending=true;renderPanel();
  var x=await root.hhOrchestratorDispatchScope355('all',null,'health');
  state.feedback='✓ Kérés feladva '+x.devices+' telefonhoz. Állapot: VÁRAKOZIK, tényleges végrehajtás még nem igazolt.';
 }catch(e){state.feedback='Nem sikerült elküldeni: '+safeText(e&&e.message||e)}
 finally{sending=false;renderPanel();root.setTimeout(function(){refresh(true)},3000)}
}
function mount(){
 if(initialized)return;initialized=true;styles();
 var b=elt('button');b.id=ID;b.type='button';b.dataset.rag='amber';
 var dot=elt('span','hhDot',b);dot.setAttribute('aria-hidden','true');
 txt('span','HH ONE',b);document.body.appendChild(b);
 var overlay=elt('div');overlay.id=PANEL;overlay.dataset.open='0';
 overlay.setAttribute('aria-label','HH One Service Center');
 var sheet=elt('div','hhSheet',overlay);sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
 var top=elt('div','hhTop',sheet);txt('h2','HH One · Service Center',top);
 var close=elt('button','',top);close.id='hhOneClose500';close.type='button';close.textContent='✕';close.setAttribute('aria-label','Bezárás');
 var body=elt('div');body.id='hhOneBody500';sheet.appendChild(body);document.body.appendChild(overlay);
 b.addEventListener('click',openPanel);close.addEventListener('click',closePanel);
 overlay.addEventListener('click',function(e){if(e.target===overlay)closePanel()});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&overlay.dataset.open==='1')closePanel()});
 updateBadge();refresh(true);
 var params=new URL(root.location.href).searchParams;
 if(params.get('hhone')==='service')root.setTimeout(openPanel,400);
 timer=root.setInterval(function(){if(document.visibilityState==='visible')refresh(false)},refreshEvery);
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')refresh(true)});
 root.addEventListener('healthhub:device-registry-updated',function(){refresh(true)});
}
root.HH_ONE_RAG_V500=Object.freeze({classify:classify,refresh:refresh});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(window);
