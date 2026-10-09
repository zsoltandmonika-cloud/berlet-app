(function(){
'use strict';
// v355: one Admin connection dashboard. A green icon requires observed success;
// saved credentials or an enabled scheduler alone do not prove online status.
var ID='hhConnectionCenter355',CSS='hhConnectionCenter355CSS',KEY='hh-connection-center355',busy={},probeState='unknown',probeAt=0,devices=[],deviceError='',lastRefresh=0,loading=false,ob=null,lastMessage='',probeError='';
function el(id){return document.getElementById(id)}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function name(p){return p==='monika'?'Mónika':'Zsolt'}
function vault(){return window.HH_DROPBOX_VAULT||null}
function connected(){var v=vault();try{return!!(v&&v.connected&&v.connected())}catch(e){return false}}
function cached(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return{}}}
function update(id,ok,info){var obj=cached();obj[id]={at:new Date().toISOString(),ok:!!ok,info:String(info||'').slice(0,180)};try{localStorage.setItem(KEY,JSON.stringify(obj))}catch(e){}}
function time(t){if(!t)return 'Nincs megerősített időpont';var n=Date.parse(t);return Number.isFinite(n)?new Date(n).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Ismeretlen időpont'}
function age(t){return t?Date.now()-Date.parse(t):Infinity}
function status(st,msg,at){return {status:st,text:msg||'',at:at||null}}
function recent(t,h){return !!t&&age(t)>=0&&age(t)<h*3600000}
function knownRow(id,label,detail,current,reconnect){return {id:id,label:label,detail:detail,state:current,reconnect:reconnect}}
function cachedState(id,title,connectedFlag){
 var x=cached()[id];
 if(!connectedFlag)return status('red','Nincs aktív Dropbox kapcsolat');
 if(x&&x.ok&&recent(x.at,24))return status('green','Utolsó feladat sikeresen lefutott',x.at);
 if(x&&!x.ok)return status('red',x.info||'Legutóbbi szinkronhiba',x.at);
 return status('yellow','Van kapcsolat, de a legutóbbi feladat sikere nem igazolt');
}
function bridge(p){
 var rows=devices.filter(function(d){return d&&d.deviceType==='android'&&d.activeProfile===p});
 rows.sort(function(a,b){return Date.parse(b.lastSeenAt||0)-Date.parse(a.lastSeenAt||0)});
 return rows[0]||null;
}
function bridgeState(p){
 if(!connected())return status('red','Dropbox nem elérhető');
 var d=bridge(p);
 if(!d)return status('yellow','Nincs regisztrált telefon vagy még nem jelentkezett');
 var st=d.status||{},last=d.lastHealthSyncAt,online=recent(d.lastSeenAt,0.75);
 var build=String(d.build||'ismeretlen'),legacy=/^0\.(?:[0-9]|10)\./.test(build);
 var app=legacy?' · Connect v'+build+' ⚠ régi APK, 0.11.0 szükséges':' · Connect v'+build;
 var lastError=d.lastHealthError;
 if(st.state==='pending'||st.state==='running'){
  var pendingAge=age(st.updatedAt),seenSince=Number.isFinite(Date.parse(d.lastSeenAt||''))&&
   Number.isFinite(Date.parse(st.updatedAt||''))&&Date.parse(d.lastSeenAt)>=Date.parse(st.updatedAt);
  var elapsed=pendingAge>0?Math.round(pendingAge/60000):0;
  return status('yellow','Remote '+st.state+' · '+elapsed+' perce vár · '+
   (seenSince?'telefon jelentkezett azóta':'nincs új telefon-visszajelzés')+
   (last?' · Utolsó sikeres feltöltés: '+time(last):' · Nincs igazolt feltöltés')+app,st.updatedAt);
 }
 if(st.state==='partial'||st.state==='failed'||st.state==='expired')
  return status('red','Távoli parancs: '+st.state+' · '+(st.message||'ellenőrzés szükséges')+app,st.updatedAt);
 if(st.state==='done' && Array.isArray(st.scopes)&&st.scopes.includes('health')){
  var step=Array.isArray(st.steps)?st.steps.find(function(x){return x.id==='health'}):null;
  if(step&&step.status==='done')return status('green','Távoli Health Connect feltöltés igazolva'+app,st.completedAt||st.updatedAt);
  return status('yellow','Parancs lezárult, de sikeres Health Connect feltöltés nincs igazolva'+app,st.completedAt||st.updatedAt);
 }
 if(lastError&&!recent(last,8))return status('red',lastError+app,last);
 if(recent(last,8))return status('green',(online?'Telefon elérhető':'Utolsó feltöltés rendben')+' · '+(d.lastHealthSummary||'Mért adatok feltöltve')+app,last);
 if(last)return status('yellow','Régebbi feltöltés'+app,last);
 return status('yellow',(online?'Telefon jelentkezett, mérésfeltöltés nem igazolt':'Telefon-visszajelzésre vár')+app,d.lastSeenAt);
}
function masterState(){
 if(!connected())return status('red','Dropbox nincs csatlakoztatva');
 var state=typeof window.hhMasterStructuredSyncState304==='function'?window.hhMasterStructuredSyncState304():null;
 var last=state&&state.lastSync;
 if(recent(last,24))return status('green','Dropbox master mentés igazolt',last);
 return status('yellow','Központi master szinkron nem igazolt a közelmúltból',last);
}
function lenaState(p){
 if(!connected())return status('red','Dropbox nincs csatlakoztatva');
 var s=typeof window.hhGetLenaHealthContextCloudState291==='function'?window.hhGetLenaHealthContextCloudState291(p):null;
 if(s&&s.ok&&recent(s.updatedAt,24))return status('green','Léna adatkörnyezet feltöltve',s.updatedAt);
 if(s&&s.error)return status('red',s.error,s.updatedAt);
 return status('yellow','Feltöltés még nem igazolt',s&&s.updatedAt);
}
function supaState(){
 var c=window.HH_DAILY_HEALTH_SYNC_V319;
 var s=c&&c.getStatus?c.getStatus():null;
 if(!s||!s.configured)return status('red','Supabase nincs konfigurálva');
 if(!s.authenticated)return status('yellow','Bejelentkezés szükséges');
 var p=cached().supa;
 if(p&&p.ok&&recent(p.at,1))return status('green','Bejelentkezve · AI végpont válaszolt',p.at);
 if(p&&!p.ok)return status('red','AI végpont nem válaszolt',p.at);
 return status('yellow','Bejelentkezve · AI végpont ellenőrzésre vár');
}
function connectionRows(){
 var p=profile(),is=connected(),dropStatus=probeState==='green'&&recent(probeAt,1)?status('green','Dropbox API válaszolt',new Date(probeAt).toISOString()):
  probeState==='red'?status('red','Dropbox fájl-API elutasította a kérést: '+probeError,new Date(probeAt).toISOString()):
  probeState==='yellow'?status('yellow','Dropbox fájl-API ellenőrzés bizonytalan: '+probeError,new Date(probeAt).toISOString()):
  is?status('yellow','Munkamenet megvan; még nem ellenőrzött'):status('red','Nincs aktív Dropbox munkamenet');
 var healthImport=cachedState('health-'+p,'Health + Activity',is);
 var x=window.hhMasterStructuredSyncState304&&window.hhMasterStructuredSyncState304();
 return [
  knownRow('dropbox','☁️ Dropbox Vault','Közös fájltár, strukturált leletek és sync-parancsok',dropStatus,'dropbox'),
  knownRow('phone-monika','📱 Mónika · Health Connect','Samsung Health → Health Connect → Dropbox',bridgeState('monika'),'phone-monika'),
  knownRow('phone-zsolt','📱 Zsolt · Health Connect','Samsung Health → Health Connect → Dropbox',bridgeState('zsolt'),'phone-zsolt'),
  knownRow('health-'+p,'❤️ Health + Activity','Dropbox mérések → aktív HealthHub-profil: '+name(p),healthImport,'health-'+p),
  knownRow('master','🗂️ Structured Vault','Központi leletek, magyarázatok, profilok',masterState(),'master'),
  knownRow('profile','👥 Profile Vault','Profiladatok központi mentése',cachedState('profile','Profile Vault',is),'profile'),
  knownRow('devices','⌚ Eszközök','Eszköznyilvántartás Dropbox-szinkronja',cachedState('devices','Eszközök',is),'devices'),
  knownRow('daily','🌅 Daily Cloud','Daily Health, Spark és Morning Briefing',cachedState('daily','Daily Cloud',is),'daily'),
  knownRow('lena-'+p,'🧠 Léna Context','A '+name(p)+'-profilra vonatkozó egészségügyi összefoglaló',lenaState(p),'lena-'+p),
  knownRow('supa','🔐 Supabase / Ask Léna AI','Hitelesített AI-végpont és felhőmunkamenet',supaState(),'supa')
 ];
}
function styles(){
 if(el(CSS))return;var s=document.createElement('style');s.id=CSS;s.textContent=[
 '#hhHealthConnect306{display:none!important}#'+ID+'{margin:10px 0 16px;padding:17px 14px;background:#fff;border:1px solid #d8e6ed;border-radius:20px;box-shadow:0 5px 19px #1740610b;font:13px/1.5 system-ui;color:#2a4b61}',
 '#'+ID+' .hhCxHead355{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}',
 '#'+ID+' h2{color:#173f62;font-size:20px;margin:0 0 3px}',
 '#'+ID+' .hhCxIntro355{color:#657f90;font-size:12px;margin:0 0 11px;line-height:1.55}',
 '#'+ID+' .hhCxSummary355{padding:10px 12px;background:#f1f8fc;border-radius:12px;margin:7px 0 11px;font-size:12px}',
 '#'+ID+' .hhCxHead355 button,#'+ID+' .hhCxAction355{font-size:12px;line-height:1.4;font-weight:750;padding:9px 11px;border:1px solid #b8d4e2;border-radius:11px;background:#eef6fa;color:#175070;cursor:pointer;min-height:40px}',
 '#'+ID+' button:disabled{opacity:.55;cursor:wait}',
 '#'+ID+' .hhCxRows355{display:grid;gap:8px}',
 '#'+ID+' .hhCxRow355{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:7px 9px;border:1px solid #e0eaf0;border-radius:13px;padding:12px 10px}',
 '#'+ID+' .hhCxMain355{min-width:0}',
 '#'+ID+' .hhCxTitle355{display:flex;align-items:center;gap:8px;font-weight:810;font-size:13px;color:#193e5d}',
 '#'+ID+' .hhCxDot355{display:block;flex:0 0 11px;width:11px;height:11px;border-radius:50%;background:#e5a833;box-shadow:0 0 0 4px #e5a8331d}',
 '#'+ID+' .hhCxDot355.green{background:#18aa68;box-shadow:0 0 0 4px #18aa681d}',
 '#'+ID+' .hhCxDot355.red{background:#d95358;box-shadow:0 0 0 4px #d953581d}',
 '#'+ID+' .hhCxDot355.running{background:#3a89d1;animation:hhCxPulse355 .9s ease-in-out infinite alternate}',
 '#'+ID+' .hhCxDetail355{font-size:11px;color:#617c8b;margin:4px 0 0;overflow-wrap:anywhere}',
 '#'+ID+' .hhCxState355{font-size:11px;margin:5px 0 0;color:#37657a;overflow-wrap:anywhere}',
 '#'+ID+' .hhCxStamp355{font-size:10px;color:#83939b}',
 '#'+ID+' .hhCxLog355{margin-top:11px;background:#f7fafc;border-radius:12px;padding:9px 12px;color:#61788a;font-size:11px;line-height:1.5}',
 '#'+ID+' .hhCxResult355{white-space:pre-line;color:#8b4d49;font-size:12px;margin:7px 0}',
 '@keyframes hhCxPulse355{to{opacity:.40}}',
 '@media(max-width:420px){#'+ID+'{padding:13px 10px}#'+ID+' .hhCxRow355{padding:10px 8px}#'+ID+' .hhCxAction355{padding:8px 7px;font-size:11px}}',
 '@media(prefers-reduced-motion:reduce){#'+ID+' .hhCxDot355.running{animation:none}}'
 ].join('');document.head.appendChild(s);
}
function elem(tag,cls,txt){var d=document.createElement(tag);if(cls)d.className=cls;if(txt!=null)d.textContent=txt;return d}
function render(){
 var body=el('haBody'),ov=el('haOv');if(!body||!ov||!ov.classList.contains('on'))return;
 styles();var panel=el(ID);if(!panel){panel=elem('section');panel.id=ID;body.insertBefore(panel,body.firstChild)}
 var rows=connectionRows(),greens=rows.filter(function(x){return x.state.status==='green'}).length,reds=rows.filter(function(x){return x.state.status==='red'}).length;
 panel.replaceChildren();
 var head=elem('div','hhCxHead355'),title=elem('div');title.append(elem('h2',null,'🛡️ Kapcsolatok & Sync Center'),elem('div','hhCxIntro355','Egy helyen minden adatút. Csak ellenőrzött siker kap zöld jelzést.'));
 var refresh=elem('button',null,loading?'🔄 Ellenőrzés…':'🔎 Összes kapcsolat ellenőrzése');
 refresh.type='button';refresh.disabled=loading;refresh.addEventListener('click',function(){checkAll(true)});
 var diagnostics=elem('button',null,'📋 Diagnosztika');
 diagnostics.type='button';diagnostics.addEventListener('click',copyDiagnostics);
 head.append(title,refresh,diagnostics);panel.append(head);
 var summary=elem('div','hhCxSummary355','🟢 '+greens+' ellenőrzött · 🔴 '+reds+' hibás/leválasztott · 🟠 '+(rows.length-greens-reds)+' ellenőrzésre vár · profil: '+name(profile()));
 panel.append(summary);
 var list=elem('div','hhCxRows355');
 rows.forEach(function(row){
  var card=elem('article','hhCxRow355'),left=elem('div','hhCxMain355'),line=elem('div','hhCxTitle355');
  var dot=elem('span','hhCxDot355 '+(busy[row.id]?'running':row.state.status));dot.setAttribute('aria-hidden','true');
  line.append(dot,elem('span',null,row.label));left.append(line,elem('div','hhCxDetail355',row.detail));
  left.append(elem('div','hhCxState355',(busy[row.id]?'🔄 Csatlakozás folyamatban':row.state.status==='green'?'✅ ':row.state.status==='red'?'⛔ ':'⏳ ')+(row.state.text||'')));
  left.append(elem('div','hhCxStamp355','Utolsó igazolt esemény: '+time(row.state.at)));
  var button=elem('button','hhCxAction355',busy[row.id]?'Folyamatban…':'🔄 Reconnect');
  button.type='button';button.disabled=!!busy[row.id];
  button.setAttribute('aria-label',row.label+' újracsatlakoztatása');
  button.addEventListener('click',function(){reconnect(row.id)});
  card.append(left,button);list.append(card);
 });
 panel.append(list,elem('div','hhCxLog355','🟢 Sikeres, friss ellenőrzés vagy feltöltés · 🟠 nem igazolt / várakozik · 🔴 valódi hiba vagy leválasztott kapcsolat. A reconnect gomb a kapcsolatnak megfelelő műveletet indítja; a telefonos jóváhagyást nem lehet távolról megkerülni.'));
 var result=elem('div','hhCxResult355',lastMessage);result.id='hhCxResult355';result.setAttribute('role','status');panel.append(result);
}
function message(s){lastMessage=String(s||'');var x=el('hhCxResult355');if(x)x.textContent=lastMessage}
async function checkDropbox(){
 if(!connected()){probeState='red';probeAt=Date.now();probeError='Nincs aktív Dropbox-bejelentkezés';return false}
 var v=vault(),fileError=null;
 // Exercise the exact READ endpoint used for HealthHub data.
 // A metadata/list scope failure does not mean the cloud file is inaccessible.
 try{
  if(!v||typeof v.downloadJson!=='function')throw Error('Dropbox fájlletöltés modul hiányzik');
  var manifest=await v.downloadJson('/HealthHub/master/manifest.json');
  if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw Error('A manifest tartalma nem használható JSON');
  probeState='green';probeAt=Date.now();probeError='';return true;
 }catch(e){fileError=e}
 try{
  var token=await v.accessToken();if(!token)throw Error('Nincs hozzáférési token');
  var r=await fetch('https://api.dropboxapi.com/2/files/list_folder',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({path:'',recursive:false,limit:1}),cache:'no-store'
  });
  var j={};try{j=await r.json()}catch(e){}
  if(r.ok&&Array.isArray(j.entries)){probeState='green';probeAt=Date.now();probeError='';return true}
  var err=Error('HTTP '+r.status+(j.error_summary?' · '+String(j.error_summary).slice(0,90):''));
  err.status=r.status;throw err;
 }catch(e){
  probeError=('Fájl: '+String(fileError&&fileError.message||fileError).slice(0,90)+' | Lista: '+String(e.message||e)).slice(0,195);
  probeState=e.status===401?'red':'yellow';probeAt=Date.now();
  message('Dropbox ellenőrzés: '+probeError);return false;
 }
}
async function checkSupa(){
 var svc=window.HH_DAILY_HEALTH_SYNC_V319;
 if(!svc||!svc.getStatus||!svc.getStatus().authenticated)return;
 try{var res=await svc.probe();update('supa',!!res.ok,res.ok?'AI végpont elérhető':'HTTP '+res.status)}
 catch(e){update('supa',false,e.message||'AI-végpont hiba')}
}
async function checkDevices(){
 if(!connected()||typeof window.hhOrchestratorDevices305!=='function'){devices=[];return}
 try{devices=await window.hhOrchestratorDevices305();deviceError='';lastRefresh=Date.now()}
 catch(e){deviceError=String(e.message||e);devices=[]}
}
async function checkAll(force){
 if(loading)return;loading=true;render();
 try{await checkDropbox();await Promise.all([checkSupa(),checkDevices()])}
 finally{loading=false;render();if(deviceError)message('Eszközlista: '+deviceError)}
}
async function runFn(id,fun){
 if(typeof fun!=='function')throw Error('A kapcsolódó modul nincs betöltve ebben a böngészőben.');
 var ok=await fun();
 if(ok===false)throw Error('A modul nem erősített meg sikeres szinkront.');
 update(id,true,'Sikeres szinkron');
}
async function reconnect(id){
 if(busy[id])return;
 busy[id]=true;render();message('');
 try{
  var v=vault(),p=profile();
  if(id==='dropbox'){
   if(!connected()){
    var connectFn=v&&(v.connect||v.authorize||v.signIn||v.startLogin);
    if(typeof connectFn==='function'){await connectFn.call(v);message('Dropbox hitelesítés elindítva. A siker után ellenőrizd újra.')}
    else message('A Dropbox jogosultság lejárhatott. Az Admin Dropbox-kapcsolat gombjával újra engedélyezheted.');
   }else{if(await checkDropbox())message('✅ Dropbox fájlhozzáférés ellenőrizve. Nem kell újracsatlakoztatni.');}
  }else if(id.indexOf('phone-')===0){
   var target=id.slice(6),device=bridge(target);
   if(!connected())throw Error('A távoli parancshoz aktív Dropbox Vault kell.');
   if(!device)throw Error('Nincs ehhez a profilhoz regisztrált telefon. Nyisd meg rajta a HealthHub Connect alkalmazást.');
   if(typeof window.hhOrchestratorDispatchScope355!=='function')throw Error('A Remote Sync vezérlő nem elérhető.');
   var result=await window.hhOrchestratorDispatchScope355(target,device.deviceId,'health');
   message('📡 '+name(target)+' telefonjára küldtem a parancsot. Ez még NEM a sikeres szinkron! A telefon az Android ütemezése szerint dolgozza fel; itt ellenőrizd az új állapotot.');
  }else if(id.indexOf('health-')===0){
   var t=id.slice(7);await runFn(id,function(){
    if(typeof window.hhHealthCloudSyncProfile==='function')return window.hhHealthCloudSyncProfile(t,true);
    if(t===p&&typeof window.hhHealthCloudSync==='function')return window.hhHealthCloudSync(true);
    throw Error('Health + Activity modul nem elérhető');
   });
  }else if(id==='master')await runFn(id,function(){return window.hhMasterStructuredSync304(true)});
  else if(id==='profile')await runFn(id,function(){return window.hhDropboxPushCurrentProfile()});
  else if(id==='devices')await runFn(id,function(){return window.hhDeviceCloudSync(true)});
  else if(id==='daily')await runFn(id,function(){return window.hhCloudSyncDaily()});
  else if(id.indexOf('lena-')===0)await runFn(id,function(){return window.hhUploadLenaHealthContext291(id.slice(5),'admin-reconnect')});
  else if(id==='supa'){
   var auth=window.HH_DAILY_HEALTH_SYNC_V319;
   if(!auth||!auth.getStatus||!auth.getStatus().authenticated){
    if(auth&&auth.openLogin)auth.openLogin();
    message('🔐 Supabase: jelentkezz be egyszer a központi Health Vaultba.');
   }else{await checkSupa();message('Supabase AI-végpont ellenőrzése befejeződött.')}
  }
 }catch(e){message('⚠️ '+String(e.message||e));if(id.indexOf('phone-')!==0)update(id,false,String(e.message||e))}
 finally{busy[id]=false;await checkDevices();render()}
}
function diagnosticText(){
 var rows=connectionRows(),lines=[
  'HealthHub Connections · v357 · '+new Date().toISOString(),
  'Aktív profil: '+name(profile()),
  'Dropbox fájlpróba: '+probeState+(probeError?' · '+probeError:''),
  'Személyes mérést, hozzáférési tokent a jelentés nem tartalmaz.'
 ];
 rows.forEach(function(r){lines.push(r.label+' | '+r.state.status+' | '+r.state.text+' | '+(r.state.at||'nincs időpont'))});
 if(deviceError)lines.push('Eszközlista hiba: '+deviceError.slice(0,150));
 return lines.join('\n');
}
async function copyDiagnostics(){
 var info=diagnosticText();
 try{
  if(navigator.clipboard&&navigator.clipboard.writeText){
   await navigator.clipboard.writeText(info);
   message('📋 A kapcsolatdiagnosztikát a vágólapra másoltam.');
  }else message('📋 Kapcsolatdiagnosztika:\n'+info);
 }catch(e){message('📋 Kapcsolatdiagnosztika:\n'+info)}
}
function install(){
 var ov=el('haOv');if(!ov){setTimeout(install,500);return}
 if(ob)ob.disconnect();ob=new MutationObserver(function(){if(ov.classList.contains('on')){render();if(Date.now()-lastRefresh>60000)checkAll(false)}});
 ob.observe(ov,{attributes:true,attributeFilter:['class']});
 if(ov.classList.contains('on'))checkAll(false);
 setInterval(function(){if(ov.classList.contains('on')&&document.visibilityState==='visible'&&!loading&&Date.now()-lastRefresh>60000)checkAll(false)},60000);
}
window.addEventListener('healthhub:profile-changed',function(){setTimeout(render,120)});
window.addEventListener('healthhub:central-auth-changed',function(){checkAll(true)});
window.addEventListener('online',function(){if(el('haOv')&&el('haOv').classList.contains('on'))checkAll(true)});
window.HH_CONNECTION_CENTER_V355={refresh:checkAll,reconnect:reconnect};
install();
})();
