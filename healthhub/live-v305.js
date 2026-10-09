(function(){
'use strict';
/* HealthHub v305 — Central Sync Orchestrator.
   Dropbox command/status plane only; no clinical values are written to orchestrator telemetry.
   Open web clients check commands lightly while visible. Offline clients execute pending commands on next startup.
   Native Android HealthHub Connect uses the same protocol with WorkManager. */

var BUILD='1.305', ROOT='/HealthHub/orchestrator';
var DEVICES=ROOT+'/devices', COMMANDS=ROOT+'/commands', STATUS=ROOT+'/status';
var DEVICE_KEY='hh-orchestrator-device-id-v1', LAST_CMD='hh-orchestrator-last-command-v1';
var CHECK_MS=60000, CHECK_THROTTLE=12000, ADMIN_ID='hhSyncOrchestrator305', STYLE_ID='hhSyncOrchestrator305Style';
var busy=false,lastCheck=0,adminObserver=null,adminTimer=null,visibleTimer=null,deviceCache=[],foldersReady=false;

function now(){return new Date().toISOString()}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function vault(){try{return window.HH_DROPBOX_VAULT||null}catch(e){return null}}
function connected(){var v=vault();try{return !!(v&&v.connected&&v.connected()&&v.accessToken&&v.uploadJson&&v.downloadJson)}catch(e){return false}}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function uuid(){try{return crypto.randomUUID()}catch(e){return 'web-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}}
function deviceId(){var x=localStorage.getItem(DEVICE_KEY);if(!x){x='web-'+uuid();localStorage.setItem(DEVICE_KEY,x)}return x}
function lastCommandId(){return localStorage.getItem(LAST_CMD)||''}
function saveLastCommand(id){if(id)localStorage.setItem(LAST_CMD,id)}

function browserName(){
 var u=navigator.userAgent||'';
 if(/Edg\//.test(u))return 'Edge';
 if(/OPR\//.test(u))return 'Opera';
 if(/Chrome\//.test(u))return 'Chrome';
 if(/Firefox\//.test(u))return 'Firefox';
 if(/Safari\//.test(u))return 'Safari';
 return 'Browser';
}
function osName(){
 var u=navigator.userAgent||'',p=navigator.platform||'';
 if(/Android/i.test(u))return 'Android';
 if(/iPhone|iPad|iPod/i.test(u))return 'iOS';
 if(/Win/i.test(p)||/Windows/i.test(u))return 'Windows';
 if(/Mac/i.test(p))return 'macOS';
 if(/Linux/i.test(p))return 'Linux';
 return p||'Web';
}
function deviceName(){return browserName()+' · '+osName()}
function capabilities(){
 var a=['structured','profile','health','devices','lena'];
 if(typeof window.hhCloudSyncDaily==='function')a.push('daily');
 return a;
}
function deviceRecord(){
 return {
  schema:'healthhub.orchestrator.device/1',
  deviceId:deviceId(),
  deviceType:'web',
  name:deviceName(),
  platform:osName(),
  browser:browserName(),
  build:(document.querySelector('meta[name="healthhub-live-build"]')||{}).content||window.HH_LIVE_BUILD||'unknown',
  profileCapability:['zsolt','monika'],
  activeProfile:pkey(),
  capabilities:capabilities(),
  lastSeenAt:now(),
  lastCommandId:lastCommandId()||null,
  visible:document.visibilityState==='visible'
 };
}
function devicePath(id){return DEVICES+'/'+id+'.json'}
function commandPath(id){return COMMANDS+'/'+id+'.json'}
function statusPath(id){return STATUS+'/'+id+'.json'}

async function token(){var v=vault();if(!v||!v.accessToken)throw new Error('Dropbox Vault API nem elérhető.');return v.accessToken()}
async function folderExists(path,t){
 var r=await fetch('https://api.dropboxapi.com/2/files/get_metadata',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({path:path,include_media_info:false,include_deleted:false})});
 if(r.ok){var j={};try{j=await r.json()}catch(e){};return !!(j&&j['.tag']==='folder')}
 if(r.status===409)return false;
 throw new Error('Dropbox mappa ellenőrzési hiba · '+path+' · '+r.status);
}
async function ensureFolder(path){
 var t=await token();if(await folderExists(path,t))return true;
 var r=await fetch('https://api.dropboxapi.com/2/files/create_folder_v2',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({path:path,autorename:false})});
 if(r.ok)return true;
 if(r.status===409&&await folderExists(path,t))return true;
 throw new Error('Dropbox mappa létrehozási hiba · '+path+' · '+r.status);
}
async function ensureFolders(){if(foldersReady)return true;await ensureFolder('/HealthHub');await ensureFolder(ROOT);await ensureFolder(DEVICES);await ensureFolder(COMMANDS);await ensureFolder(STATUS);foldersReady=true;return true}
async function upload(path,data){var v=vault();if(!v||!v.uploadJson)throw new Error('Dropbox Vault API nem elérhető.');return v.uploadJson(path,data)}
async function download(path){var v=vault();if(!v||!v.downloadJson)throw new Error('Dropbox Vault API nem elérhető.');try{return await v.downloadJson(path)}catch(e){if(e&&e.status===409)return null;throw e}}
async function listFolder(path){
 var t=await token(),entries=[],cursor=null,more=true;
 while(more){
  var endpoint=cursor?'https://api.dropboxapi.com/2/files/list_folder/continue':'https://api.dropboxapi.com/2/files/list_folder';
  var body=cursor?{cursor:cursor}:{path:path,recursive:false,include_deleted:false,include_non_downloadable_files:false};
  var r=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(body)});
  var j={};try{j=await r.json()}catch(e){}
  if(!r.ok){if(r.status===409)return[];throw new Error(j.error_summary||('Dropbox list hiba '+r.status))}
  entries=entries.concat(j.entries||[]);more=!!j.has_more;cursor=j.cursor||null;
 }
 return entries;
}

async function heartbeat(){
 if(!connected())return false;
 await ensureFolders();
 await upload(devicePath(deviceId()),deviceRecord());
 return true;
}
function profileTargets(scope){
 if(scope==='zsolt'||scope==='monika')return [scope];
 return ['zsolt','monika'];
}
function scopeList(cmd){
 var s=Array.isArray(cmd.scopes)?cmd.scopes:[cmd.scope||'full'];
 if(s.indexOf('full')>=0)return ['structured','profile','health','devices','daily','lena'];
 return s.filter(function(x){return ['structured','profile','health','devices','daily','lena'].indexOf(x)>=0});
}
async function statusWrite(cmd,state,steps,message){
 var st={
  schema:'healthhub.orchestrator.status/1',
  deviceId:deviceId(),
  deviceType:'web',
  commandId:cmd&&cmd.commandId||null,
  state:state,
  updatedAt:now(),
  startedAt:cmd&&cmd.__startedAt||null,
  completedAt:(state==='done'||state==='partial'||state==='failed')?now():null,
  profileScope:cmd&&cmd.profileScope||'all',
  scopes:cmd?scopeList(cmd):[],
  steps:steps||[],
  message:message||''
 };
 await upload(statusPath(deviceId()),st);
 return st;
}
async function runStep(steps,id,label,fn){
 var s={id:id,label:label,status:'running',startedAt:now()};steps.push(s);
 try{
  var r=await fn();
  s.status=(r===false)?'noop':'done';s.completedAt=now();return r;
 }catch(e){
  s.status='failed';s.completedAt=now();s.error=String(e&&e.message||e).slice(0,220);throw e;
 }
}
async function executeCommand(cmd){
 if(!cmd||cmd.schema!=='healthhub.orchestrator.command/1'||cmd.targetDeviceId!==deviceId())return false;
 if(cmd.commandId===lastCommandId())return false;
 var exp=Date.parse(cmd.expiresAt||'');if(exp&&exp<Date.now()){saveLastCommand(cmd.commandId);await statusWrite(cmd,'expired',[],'Parancs lejárt.');return false}
 if(busy)return false;
 busy=true;cmd.__startedAt=now();
 var steps=[],failed=[],targets=profileTargets(cmd.profileScope),scopes=scopeList(cmd);
 try{
  await statusWrite(cmd,'running',steps,'Parancs végrehajtása');
  for(var i=0;i<scopes.length;i++){
   var sc=scopes[i];
   try{
    if(sc==='structured'){
     await runStep(steps,'structured','Structured Vault',async function(){
      if(typeof window.hhMasterStructuredSync304!=='function')return false;
      return window.hhMasterStructuredSync304(true);
     });
    }else if(sc==='profile'){
     await runStep(steps,'profile','Profile Vault',async function(){
      if(typeof window.hhDropboxPushProfile==='function'){
       for(var p=0;p<targets.length;p++)await window.hhDropboxPushProfile(targets[p],true);
       return true;
      }
      if(typeof window.hhDropboxPushCurrentProfile==='function'&&targets.indexOf(pkey())>=0)return window.hhDropboxPushCurrentProfile();
      return false;
     });
    }else if(sc==='health'){
     await runStep(steps,'health','Health + Activity',async function(){
      if(typeof window.hhHealthCloudSyncProfile==='function'){
       var any=false;for(var p=0;p<targets.length;p++){var ok=await window.hhHealthCloudSyncProfile(targets[p],true);any=ok||any}
       return any;
      }
      if(typeof window.hhHealthCloudSync==='function'&&targets.indexOf(pkey())>=0)return window.hhHealthCloudSync(true);
      return false;
     });
    }else if(sc==='devices'){
     await runStep(steps,'devices','Devices Cloud',async function(){
      if(typeof window.hhDeviceCloudSyncProfile==='function'){
       var any=false;for(var p=0;p<targets.length;p++){var ok=await window.hhDeviceCloudSyncProfile(targets[p],true);any=ok||any}
       return any;
      }
      if(typeof window.hhDeviceCloudSync==='function'&&targets.indexOf(pkey())>=0)return window.hhDeviceCloudSync(true);
      return false;
     });
    }else if(sc==='daily'){
     await runStep(steps,'daily','Daily Cloud',async function(){
      if(typeof window.hhCloudSyncDaily!=='function')return false;
      return window.hhCloudSyncDaily();
     });
    }else if(sc==='lena'){
     await runStep(steps,'lena','Léna Context',async function(){
      if(typeof window.hhUploadLenaHealthContext291!=='function')return false;
      var any=false;for(var p=0;p<targets.length;p++){var ok=await window.hhUploadLenaHealthContext291(targets[p],'orchestrator');any=ok||any}
      return any;
     });
    }
   }catch(e){failed.push(sc)}
   await statusWrite(cmd,failed.length?'partial':'running',steps,failed.length?'Van hibás lépés.':'Folyamatban');
  }
  saveLastCommand(cmd.commandId);
  var finalState=failed.length?(failed.length===scopes.length?'failed':'partial'):'done';
  await statusWrite(cmd,finalState,steps,failed.length?('Hibás scope: '+failed.join(', ')):'Sync parancs kész.');
  await heartbeat();
  return finalState==='done';
 }finally{busy=false;renderAdmin()}
}
async function checkCommand(force){
 if(!connected()||busy)return false;
 var n=Date.now();if(!force&&n-lastCheck<CHECK_THROTTLE)return false;lastCheck=n;
 try{
  await heartbeat();
  var cmd=await download(commandPath(deviceId()));
  if(!cmd)return false;
  return executeCommand(cmd);
 }catch(e){
  console.warn('HealthHub orchestrator check',e);
  return false;
 }
}

async function loadDevices(){
 if(!connected())return[];
 await ensureFolders();
 var entries=await listFolder(DEVICES),jsons=await Promise.all(entries.filter(function(x){return x&&x['.tag']==='file'&&/\.json$/i.test(x.name||'')}).map(async function(x){
  try{return await download(x.path_lower||x.path_display)}catch(e){return null}
 }));
 var ds=jsons.filter(Boolean);
 var statuses=await Promise.all(ds.map(async function(d){try{return await download(statusPath(d.deviceId))}catch(e){return null}}));
 ds.forEach(function(d,i){d.status=statuses[i]||null});
 ds.sort(function(a,b){return Date.parse(b.lastSeenAt||0)-Date.parse(a.lastSeenAt||0)});
 deviceCache=ds;return ds;
}
function online(d){
 var age=Date.now()-Date.parse(d.lastSeenAt||0),limit=d.deviceType==='android'?20*60*1000:2.5*60*1000;
 return Number.isFinite(age)&&age<=limit;
}
function fmtAge(s){
 var n=Date.parse(s||'');if(!n)return 'még nem';var sec=Math.max(0,Math.round((Date.now()-n)/1000));
 if(sec<60)return sec+' mp';if(sec<3600)return Math.round(sec/60)+' p';if(sec<86400)return Math.round(sec/3600)+' ó';return Math.round(sec/86400)+' n';
}
function scopeFromUi(){var e=document.getElementById('hhOrchScope305');return e?e.value:'full'}
async function dispatch(profileScope,deviceFilter,overrideScope){
 if(!connected())throw new Error('Dropbox nincs csatlakoztatva.');
 var devices=await loadDevices(),selected=devices.filter(function(d){
  if(deviceFilter&&d.deviceId!==deviceFilter)return false;
  if(profileScope==='all')return true;
  return (d.profileCapability||[]).indexOf(profileScope)>=0;
 });
 if(!selected.length)throw new Error('Nincs megfelelő regisztrált eszköz.');
 var scope=overrideScope||scopeFromUi(),id='cmd-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),issued=now();
 await Promise.all(selected.map(async function(d){
  if(d.deviceType==='android'&&scope!=='full'&&scope!=='health'&&scope!=='daily')return;
  var cmd={
   schema:'healthhub.orchestrator.command/1',commandId:id,targetDeviceId:d.deviceId,
   issuedAt:issued,expiresAt:new Date(Date.now()+24*3600*1000).toISOString(),
   requestedBy:deviceId(),profileScope:profileScope,scopes:[scope],state:'pending'
  };
  await upload(commandPath(d.deviceId),cmd);
  await upload(statusPath(d.deviceId),{
   schema:'healthhub.orchestrator.status/1',deviceId:d.deviceId,deviceType:d.deviceType||'device',
   commandId:id,state:'pending',updatedAt:issued,startedAt:null,completedAt:null,
   profileScope:profileScope,scopes:[scope],steps:[],message:'Központi sync parancs várakozik.'
  });
 }));
 try{window.toast&&window.toast('✓ Sync parancs elküldve · '+selected.length+' eszköz')}catch(e){}
 await checkCommand(true);
 setTimeout(function(){refreshAdmin()},800);
 return {commandId:id,devices:selected.length};
}
window.hhOrchestratorDispatch305=function(profile,device){return dispatch(profile||'all',device||null)};
window.hhOrchestratorDispatchScope355=function(profile,device,scope){return dispatch(profile||'all',device||null,scope||'health')};
window.hhOrchestratorCheck305=function(){return checkCommand(true)};
window.hhOrchestratorHeartbeat305=heartbeat;
window.hhOrchestratorDevices305=loadDevices;

function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 var s=document.createElement('style');s.id=STYLE_ID;s.textContent=
 '#'+ADMIN_ID+'{margin-top:10px;content-visibility:auto;contain-intrinsic-size:360px}.hhOrch305{background:#fff;border:1px solid #dce8ee;border-radius:18px;padding:12px;box-shadow:0 8px 22px rgba(31,65,91,.055)}'+
 '.hhOrchHead305{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.hhOrchHead305 h3{margin:0;color:#173f62}.hhOrchHead305 small{display:block;color:#758a98;margin-top:2px;line-height:1.4}.hhOrchBadge305{font-size:7px;font-weight:900;padding:5px 7px;border-radius:999px;background:#e7f7ef;color:#18714c;white-space:nowrap}.hhOrchBadge305.off{background:#f0f3f6;color:#758392}'+
 '.hhOrchControls305{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.hhOrchControls305 button,.hhOrchControls305 select{border:1px solid #d8e4eb;border-radius:10px;padding:8px 9px;font-size:7.4px;font-weight:850;background:#f7fafc;color:#31536f}.hhOrchControls305 button.primary{background:#173f62;color:white;border-color:#173f62}.hhOrchControls305 button:disabled{opacity:.5}'+
 '.hhOrchDevices305{display:grid;gap:6px;margin-top:10px}.hhOrchDevice305{border:1px solid #e1e9ee;border-radius:12px;padding:9px;display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center}.hhOrchDevice305 b{font-size:8.5px;color:#173f62}.hhOrchDevice305 small{font-size:6.8px;color:#7b8f9d;display:block;margin-top:2px;line-height:1.45}.hhOrchDot305{display:inline-block;width:7px;height:7px;border-radius:50%;background:#abb8c0;margin-right:5px}.hhOrchDot305.on{background:#28a96b}.hhOrchDevice305 button{border:0;border-radius:9px;padding:7px 8px;background:#eef5fa;color:#31536f;font-size:7px;font-weight:900}.hhOrchNote305{font-size:6.8px;color:#718895;background:#f4f8fa;border-radius:10px;padding:8px;margin-top:9px;line-height:1.5}';
 document.head.appendChild(s);
}
function renderAdmin(){
 var body=document.getElementById('haBody'),ov=document.getElementById('haOv');if(!body||!ov||!ov.classList.contains('on'))return;
 ensureStyle();var old=document.getElementById(ADMIN_ID);if(old)old.remove();
 var rows=deviceCache.map(function(d){
  var st=d.status||{},stText=st.state?String(st.state).toUpperCase():'IDLE',prof=(d.profileCapability||[]).join(' + ')||'—';
  return '<div class="hhOrchDevice305"><div><b><span class="hhOrchDot305 '+(online(d)?'on':'')+'"></span>'+esc(d.name||d.deviceId)+'</b><small>'+esc(d.deviceType||'device')+' · '+esc(prof)+' · utoljára '+esc(fmtAge(d.lastSeenAt))+' · '+esc(stText)+(st.commandId?' · '+esc(st.commandId.slice(-10)):'')+'</small></div><button type="button" data-hh-orch-device="'+esc(d.deviceId)+'">SYNC</button></div>';
 }).join('');
 var html='<section id="'+ADMIN_ID+'" class="hhOrch305"><div class="hhOrchHead305"><div><h3>🌐 Central Sync Orchestrator · v305</h3><small>Dropbox command plane · minden regisztrált eszköz központilag indítható</small></div><span class="hhOrchBadge305 '+(connected()?'':'off')+'">'+(connected()?'CONNECTED':'OFFLINE')+'</span></div>'+
 '<div class="hhOrchControls305"><select id="hhOrchScope305"><option value="full">FULL SYNC</option><option value="structured">Structured Vault</option><option value="profile">Profile Vault</option><option value="health">Health + Activity</option><option value="devices">Devices Cloud</option><option value="lena">Léna Context</option><option value="daily">Daily Cloud</option></select><button class="primary" id="hhOrchAll305">↻ ALL DEVICES</button><button id="hhOrchZ305">Zsolt</button><button id="hhOrchM305">Mónika</button><button id="hhOrchRefresh305">↻ STATUS</button></div>'+
 '<div class="hhOrchDevices305">'+(rows||'<div class="hhOrchNote305">Még nincs regisztrált orchestrátor-eszköz. Az első v305 betöltés automatikusan regisztrálja ezt a böngészőt.</div>')+'</div>'+
 '<div class="hhOrchNote305"><b>Működés:</b> a nyitott webes kliensek legfeljebb kb. 60 mp-en belül veszik fel a parancsot. Offline kliens Pending marad és a következő induláskor végrehajtja. A HealthHub Connect Android háttérben WorkManagerrel ellenőriz; az Android nem kap valótlan „instant push” ígéretet.</div></section>';
 var anchor=document.getElementById('hhCentralManualSync302')||document.getElementById('hhLevel3V301')||document.getElementById('hhAiImprovement300');
 if(anchor)anchor.insertAdjacentHTML('afterend',html);else body.insertAdjacentHTML('afterbegin',html);
 var a=document.getElementById('hhOrchAll305'),z=document.getElementById('hhOrchZ305'),m=document.getElementById('hhOrchM305'),r=document.getElementById('hhOrchRefresh305');
 if(a)a.onclick=function(){dispatch('all').catch(function(e){toastErr(e)})};
 if(z)z.onclick=function(){dispatch('zsolt').catch(function(e){toastErr(e)})};
 if(m)m.onclick=function(){dispatch('monika').catch(function(e){toastErr(e)})};
 if(r)r.onclick=function(){refreshAdmin()};
 document.querySelectorAll('[data-hh-orch-device]').forEach(function(b){b.onclick=function(){dispatch('all',b.getAttribute('data-hh-orch-device')).catch(function(e){toastErr(e)})}});
}
function toastErr(e){try{window.toast&&window.toast('Orchestrator hiba: '+(e&&e.message||e))}catch(_){}}
async function refreshAdmin(){
 if(!connected()){deviceCache=[];renderAdmin();return}
 try{await loadDevices()}catch(e){console.warn(e)}
 renderAdmin();
}
function attachAdmin(){
 var ov=document.getElementById('haOv');if(!ov){setTimeout(attachAdmin,500);return}
 if(adminObserver)adminObserver.disconnect();
 adminObserver=new MutationObserver(function(){if(ov.classList.contains('on')){refreshAdmin();checkCommand(true)}});
 adminObserver.observe(ov,{attributes:true,attributeFilter:['class']});
 if(ov.classList.contains('on'))refreshAdmin();
 clearInterval(adminTimer);adminTimer=setInterval(function(){if(ov.classList.contains('on'))refreshAdmin()},30000);
}
function scheduleChecks(){
 clearInterval(visibleTimer);
 visibleTimer=setInterval(function(){if(document.visibilityState==='visible')checkCommand(false)},CHECK_MS);
 window.addEventListener('focus',function(){checkCommand(false)});
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')checkCommand(false)});
 window.addEventListener('online',function(){checkCommand(true)});
 setTimeout(function(){checkCommand(true)},2200);
}
function markWish008Done(){
 try{
  var key='hh-ai-wishlist-v1',a=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(a))return;
  var changed=false,t=now();
  a.forEach(function(x){if(x&&x.id==='WISH-008'){x.status='Done';x.executionStatus='Done';x.executionMessage='v305 Central Sync Orchestrator aktív · összes profil / regisztrált eszköz központi command queue-val.';x.executionAt=t;x.updatedAt=t;changed=true}});
  if(changed)localStorage.setItem(key,JSON.stringify(a));
 }catch(e){}
}
attachAdmin();scheduleChecks();markWish008Done();
setTimeout(function(){heartbeat().catch(function(){})},1400);

document.documentElement.dataset.healthhubSyncOrchestrator='1.305';
})();
